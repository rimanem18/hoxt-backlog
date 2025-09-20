この下に記載

## Supabaseプロジェクト名露出対応タスク

### 📋 概要
Google OAuth認証フロー中に表示される「project-id.supabase.co」形式のドメイン名を、独自ドメインで隠蔽する機能を実装する。

### 🎯 実装方針
**現在のServerコンテナ（Hono）でのプロキシ実装を採用**
- 理由: 既存アーキテクチャとの統合性、WebSocket対応、開発効率の観点から最適

### 🔧 具体的な実装手順

#### 1. プロキシルートの実装（1-2時間）

**新規ファイル作成**: `app/server/src/presentation/http/routes/proxyRoutes.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const proxy = new Hono();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://project.supabase.co';

/**
 * Supabaseへのプロキシルート
 * /proxy/* パスをSupabaseドメインに転送し、プロジェクト名を隠蔽
 */
proxy.use('/proxy/*', cors({
  origin: process.env.ACCESS_ALLOW_ORIGIN || '*',
  allowHeaders: ['Authorization', 'Content-Type', 'apikey', 'x-client-info'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
}));

proxy.all('/proxy/*', async (c) => {
  try {
    // URLパスの再構築
    const url = new URL(c.req.url);
    const proxyPath = url.pathname.replace('/proxy', '');
    const targetUrl = `${SUPABASE_URL}${proxyPath}${url.search}`;
    
    // ヘッダーのコピー（Hostヘッダーは除外）
    const headers = new Headers(c.req.header());
    headers.delete('host');
    headers.delete('x-forwarded-for');
    
    // Supabaseへリクエスト転送
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: headers,
      body: c.req.raw.body,
      redirect: 'manual',
    });
    
    // レスポンスをそのまま返却
    return response;
  } catch (error) {
    console.error('Proxy error:', error);
    return c.json({ error: 'Proxy request failed' }, 500);
  }
});

export default proxy;
```

#### 2. ルート統合（30分）

**ファイル更新**: `app/server/src/presentation/http/routes/index.ts`

```typescript
export { default as auth } from './authRoutes';
export { default as greet } from './greetRoutes';
export { default as health } from './healthRoutes';
export { default as user } from './userRoutes';
export { default as proxy } from './proxyRoutes';  // 追加
```

**メインアプリ更新**: `app/server/src/entrypoints/index.ts`

```typescript
// 既存のimport文に追加
import { proxy } from '@/presentation/http/routes';

// アプリケーション設定部分に追加
app.route('/', proxy);
```

#### 3. 環境変数設定（30分）

**開発環境用**: `.env`
```bash
# 既存のSupabase設定に追加
SUPABASE_PROXY_ENABLED=true
SUPABASE_PROXY_PATH=/proxy
```

**本番環境用**: Docker Compose設定更新
```yaml
# compose.yaml のserver環境変数に追加
- SUPABASE_PROXY_ENABLED=${SUPABASE_PROXY_ENABLED:-false}
```

#### 4. フロントエンド連携（30分）

**クライアント側設定**: `app/client/src/lib/supabase.ts`

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PROXY_ENABLED === 'true'
  ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/proxy`  // プロキシ経由
  : process.env.NEXT_PUBLIC_SUPABASE_URL;            // 直接アクセス

const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 5. テスト実装（1時間）

**テストファイル**: `app/server/src/presentation/http/routes/__tests__/proxyRoutes.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import proxy from '../proxyRoutes';

describe('ProxyRoutes', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/', proxy);
  });

  it('should proxy GET requests to Supabase', async () => {
    const res = await app.request('/proxy/rest/v1/health');
    expect(res.status).toBe(200);
  });

  it('should handle CORS preflight requests', async () => {
    const res = await app.request('/proxy/rest/v1/test', {
      method: 'OPTIONS',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
  });

  it('should forward Authorization headers', async () => {
    const res = await app.request('/proxy/rest/v1/protected', {
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });
    // Supabaseからの適切なレスポンスを確認
  });
});
```

#### 6. 段階的移行戦略（1時間）

**Step 1**: 開発環境でプロキシ機能を有効化
```bash
# 開発環境での動作確認
docker compose exec server bun test proxy
docker compose exec client bun run dev
```

**Step 2**: ステージング環境での検証
- DNS設定: `api-staging.your-domain.com` → サーバーコンテナ
- プロキシパス: `/proxy/*` → Supabase

**Step 3**: 本番環境への適用
- Google OAuth設定更新
- 環境変数切り替え
- モニタリング設定

### 🔍 動作確認手順

```bash
# サーバー起動
docker compose exec server bun run dev

# プロキシ経由でのAPI呼び出しテスト
curl -X GET "http://localhost:3001/proxy/rest/v1/health" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY"

# 認証テスト
curl -X POST "http://localhost:3001/proxy/auth/v1/token" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 📊 メリット・デメリット

**メリット**:
- ✅ 既存アーキテクチャとの統合が容易
- ✅ WebSocket（Realtime）対応
- ✅ 追加インフラ不要
- ✅ 開発・運用コストが低い
- ✅ DDD/クリーンアーキテクチャ原則を維持

**デメリット**:
- ⚠️ サーバーコンテナの負荷増加（軽微）
- ⚠️ レイテンシの微増（1-5ms程度）

### 🎯 今後の拡張可能性

1. **キャッシュ機能追加**: Redis統合でパフォーマンス向上
2. **ログ・監視**: プロキシ経由のリクエスト分析
3. **セキュリティ強化**: レート制限、IP制限機能
4. **Multi-tenant**: 複数Supabaseプロジェクトの統合管理

### 📝 実装完了チェックリスト

- [ ] プロキシルート実装完了
- [ ] ルート統合完了
- [ ] 環境変数設定完了
- [ ] フロントエンド連携完了
- [ ] テスト実装・実行完了
- [ ] 開発環境での動作確認完了
- [ ] ステージング環境での検証完了
- [ ] 本番環境への適用完了
- [ ] Google OAuth設定更新完了
- [ ] モニタリング設定完了

**見積総工数**: 4-6時間
**優先度**: Medium（ブランディング向上のため推奨）
