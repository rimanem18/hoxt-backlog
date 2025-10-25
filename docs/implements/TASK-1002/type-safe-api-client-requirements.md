# TASK-1002: 型安全なAPIクライアント実装 - TDD要件定義書

**作成日**: 2025-01-25
**タスクID**: TASK-1002
**タスクタイプ**: TDD
**依存タスク**: TASK-1001（openapi-typescript導入・設定）
**要件リンク**: REQ-007, NFR-102
**設計文書**: `docs/design/type-safety-enhancement/`

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 🟢 何をする機能か

フロントエンド（Next.js）で、OpenAPI仕様から自動生成されたTypeScript型定義を使用して、完全に型安全なAPIクライアントを実装する。`openapi-fetch`パッケージを活用し、バックエンドAPIとの通信において、コンパイル時に型エラーを検出できる仕組みを構築する。

### 🟢 どのような問題を解決するか

**現状の課題**:
- 既存のAPI呼び出しは`fetch`や`axios`を直接使用しており、型安全性が不十分
- APIレスポンスの型が手動定義されているため、バックエンドとの型不整合が発生しやすい
- API仕様変更時に、フロントエンド側の型定義の更新漏れが発生する可能性がある

**解決策**:
- OpenAPI仕様から自動生成された型定義を使用することで、バックエンドとフロントエンド間の型整合性を保証
- `openapi-fetch`による型安全なAPIクライアントで、コンパイル時にエンドポイント・パラメータ・レスポンスの型エラーを検出
- React Queryと統合することで、キャッシュ・再検証・エラーハンドリングを効率的に実装

### 🟢 想定されるユーザー

- **フロントエンド開発者**: 型安全なAPIクライアントを使用してバックエンドと連携する開発者
- **バックエンド開発者**: OpenAPI仕様変更時に、フロントエンドへの影響をコンパイルエラーで早期検出したい開発者

### 🟢 システム内での位置づけ

**アーキテクチャ上の位置**:
```
Drizzle ORM Schema (Single Source of Truth)
  ↓ drizzle-zod
Zod Schemas (shared-schemas/)
  ↓ @hono/zod-openapi
OpenAPI 3.1 Spec (docs/api/openapi.yaml)
  ↓ openapi-typescript (TASK-1001)
TypeScript Types (types/api/generated.ts)
  ↓ openapi-fetch (TASK-1002) ← **ここを実装**
Type-safe API Client (lib/api.ts)
  ↓ React Query Hooks
Frontend Components
```

**参照したEARS要件**: REQ-007, REQ-103, NFR-102
**参照した設計文書**: `architecture.md` - フロントエンド（Next.js）セクション、`dataflow.md` - ユーザーインタラクションフロー

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 🟢 入力パラメータ

#### APIクライアント初期化
- **型**: `CreateClientOptions`
- **必須フィールド**:
  - `baseUrl`: string（例: `process.env.NEXT_PUBLIC_API_BASE_URL`）
- **オプションフィールド**:
  - `headers`: Record<string, string>（認証トークン等）
  - `fetch`: カスタムfetch関数

#### APIリクエスト（例: GET /users/{id}）
- **型**: `paths['/users/{id}']['get']`
- **パラメータ**:
  - `path.id`: string（UUID v4）
- **制約**:
  - `id`は有効なUUID形式でなければならない

### 🟢 出力値

#### 成功時レスポンス
- **型**: `paths['/users/{id}']['get']['responses']['200']['content']['application/json']`
- **形式**:
  ```typescript
  {
    success: true,
    data: {
      id: string,           // UUID v4
      email: string,        // RFC 5321準拠
      name: string,
      avatarUrl: string | null,
      createdAt: string,    // ISO 8601形式
      updatedAt: string,
      lastLoginAt: string | null
    }
  }
  ```

#### エラー時レスポンス
- **型**: `paths['/users/{id}']['get']['responses']['404']['content']['application/json']`
- **形式**:
  ```typescript
  {
    success: false,
    error: {
      code: string,        // 例: "USER_NOT_FOUND"
      message: string,     // エラーメッセージ
      details?: Record<string, string> | string
    }
  }
  ```

### 🟡 入出力の関係性

- APIクライアントの`GET`メソッドは、パス型からパラメータとレスポンスの型を自動推論
- TypeScriptコンパイラが型不整合を検出し、実行時エラーを防止
- React Queryフックでラップすることで、キャッシュ・再検証・ローディング状態を自動管理

### 🟢 データフロー

**参照した設計文書**: `dataflow.md` - ユーザーインタラクションフロー（認証済みユーザー取得の例）

```
1. コンポーネント → useUser(userId) 呼び出し
2. React Query → queryFn 実行
3. APIクライアント → client.GET('/users/{id}', { params: { path: { id } } })
4. TypeScript型チェック（コンパイル時）
5. fetch実行 → バックエンドAPI
6. レスポンス受信 → 型安全なデータ返却
7. React Query → キャッシュ保存
8. コンポーネント → data.data.email（完全に型安全）
```

**参照したEARS要件**: REQ-007（型安全なAPIクライアント実装）
**参照した設計文書**:
- `interfaces.ts` - paths型定義、ApiClient型定義
- `dataflow.md` - 図「ユーザーインタラクションフロー」

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 🟢 パフォーマンス要件

- **NFR-001対応**: APIクライアントのオーバーヘッドは最小限に抑える
- **NFR-102対応**: 型の不整合はTypeScriptコンパイル時に検出される
- **React Queryキャッシュ**: 同一リクエストの重複実行を防止

### 🟢 セキュリティ要件

- **認証トークン付与**: すべてのAPIリクエストにJWTトークンを自動付与
- **NFR-303対応**: エラーレスポンスから内部実装詳細を露出しない
- **CORS対応**: バックエンドAPIのCORS設定と整合

### 🟢 互換性要件

- **REQ-407**: Bunパッケージマネージャーとの互換性を維持
- **TypeScript 5.x**: TypeScript 5.9.2の型システムを活用
- **Next.js 15**: Next.js 15.4.6のSSG・App Routerと互換

### 🟡 アーキテクチャ制約

- **REQ-405**: 既存のDDD + クリーンアーキテクチャ構造を維持
- **Feature-based構成**: `app/client/src/features/`配下に機能ごとに配置
- **React Query統合**: TanStack React Query 5.84.2を使用

### 🟢 データベース制約

（該当なし - フロントエンド実装のため）

### 🟢 API制約

- **REQ-404**: フロントエンドの型定義は`app/client/src/types/api/`配下に配置
- **OpenAPI仕様準拠**: `docs/api/openapi.yaml`から生成された型定義を使用
- **エンドポイント形式**: `/auth/callback`, `/users/{id}`, `/users`等

**参照したEARS要件**: REQ-405, REQ-407, NFR-102, NFR-303
**参照した設計文書**:
- `architecture.md` - フロントエンド（Next.js）セクション、セキュリティ設計
- `interfaces.ts` - ApiClient型定義

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 🟢 基本的な使用パターン

#### パターン1: ユーザー情報取得（GET）
```typescript
// app/client/src/features/user/hooks/useUser.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/users/{id}', {
        params: { path: { id: userId } },
      });
      if (error) throw new Error(error.error.message);
      return data.data; // 型安全: User型
    },
  });
}
```

#### パターン2: ユーザー情報更新（PUT）
```typescript
// app/client/src/features/user/hooks/useUpdateUser.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserBody }) => {
      const { data: response, error } = await apiClient.PUT('/users/{id}', {
        params: { path: { id: userId } },
        body: data,
      });
      if (error) throw new Error(error.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users', data.id] });
    },
  });
}
```

### 🟡 データフロー

**参照した設計文書**: `dataflow.md` - ユーザーインタラクションフロー

```
コンポーネント → useUser(userId)
  ↓
React Query → queryFn実行
  ↓
apiClient.GET('/users/{id}', { params: { path: { id } } })
  ↓ TypeScript型チェック（コンパイル時）
  ↓ fetch実行
バックエンドAPI（Hono OpenAPI Route）
  ↓ Zodバリデーション（実行時）
  ↓ Use Case実行
  ↓ Repository → DB
  ↓ レスポンス返却
apiClient ← 型安全なレスポンス
  ↓
React Query → キャッシュ保存
  ↓
コンポーネント → data.data.email（完全に型安全）
```

### 🟢 エッジケース

#### EDGE-001: ネットワークエラー
```typescript
const { data, error, isLoading } = useUser(userId);

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message="ユーザー情報を取得できませんでした" />;

// data.dataは型安全に使用可能
return <UserProfile user={data.data} />;
```

#### EDGE-002: 404エラー（ユーザーが存在しない）
```typescript
const { data, error } = await apiClient.GET('/users/{id}', {
  params: { path: { id: 'invalid-uuid' } },
});

if (error) {
  // error.error.code === "USER_NOT_FOUND"
  // error.error.message === "ユーザーが見つかりません"
}
```

#### EDGE-003: 認証トークン未設定
```typescript
// app/client/src/lib/api.ts
const token = getAuthToken(); // Redux/Cookieから取得

if (!token) {
  throw new Error('認証トークンが設定されていません');
}

export const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### 🟡 エラーケース

**参照したEARS要件**: EDGE-001（バリデーションエラー）、EDGE-003（OpenAPI仕様不正）

#### エラーケース1: TypeScriptコンパイルエラー（型不整合）
```typescript
// ❌ 誤った型のパラメータ
const { data } = await apiClient.GET('/users/{id}', {
  params: { path: { id: 123 } }, // number型は不可（string型が必要）
});
// → TypeScriptコンパイルエラー

// ✅ 正しい型のパラメータ
const { data } = await apiClient.GET('/users/{id}', {
  params: { path: { id: 'uuid-string' } },
});
```

#### エラーケース2: 存在しないエンドポイント
```typescript
// ❌ 存在しないエンドポイント
const { data } = await apiClient.GET('/invalid/endpoint', {});
// → TypeScriptコンパイルエラー（pathsに存在しない）
```

**参照したEARS要件**: EDGE-001, EDGE-002, EDGE-003
**参照した設計文書**: `dataflow.md` - エラーハンドリングフロー

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

**ストーリー2: API契約の明示化による連携品質向上**
- フロントエンド開発者が、OpenAPI仕様書から自動生成されたTypeScript型定義を使用してバックエンドAPIと安全に連携
- APIレスポンスの型不一致によるランタイムエラーを防ぎ、開発時に型エラーとして検出

### 参照した機能要件

- **REQ-007**: システムはフロントエンドで自動生成されたTypeScript型を使用してAPIクライアントを型安全に実装しなければならない
- **REQ-103**: OpenAPI仕様が変更された場合、システムは自動的にTypeScript型定義を再生成しなければならない

### 参照した非機能要件

- **NFR-102**: 型の不整合はTypeScriptコンパイル時に検出されなければならない
- **NFR-303**: 実行時バリデーション失敗時、内部エラー詳細をクライアントに露出してはならない

### 参照したEdgeケース

- **EDGE-001**: Zodバリデーション失敗時は、フィールド名・期待値・実際の値を含むエラーレスポンスを返却する
- **EDGE-002**: 型定義自動生成失敗時は、ビルドプロセスを停止し、詳細なエラーメッセージを表示する
- **EDGE-003**: OpenAPI仕様が不正な場合は、バリデーションエラーを出力し、修正を促す

### 参照した受け入れ基準

- フロントエンドで自動生成された型を使用してAPIクライアントを実装できる
- TypeScriptコンパイル時に型の不整合が検出される
- Zodバリデーションによるレスポンスタイムへの影響が著しくない

### 参照した設計文書

#### アーキテクチャ設計（architecture.md）
- **フロントエンド（Next.js）セクション**: APIクライアント型安全化の実装例
- **セキュリティ設計**: 認証トークン付与、エラーレスポンス制御

#### データフロー（dataflow.md）
- **ユーザーインタラクションフロー**: 認証済みユーザー取得の例
- **エラーハンドリングフロー**: 401/400/404/500エラーの処理

#### 型定義（interfaces.ts）
- **paths型定義**: OpenAPI仕様から自動生成される型
- **ApiClient型定義**: 型安全なAPIクライアントのメソッド型

#### データベース設計（database-schema.sql）
（該当なし - フロントエンド実装のため）

#### API仕様（api-endpoints.md）
（該当なし - OpenAPI仕様書を使用）

---

## 6. テスト要件

### 単体テスト

- [ ] APIクライアント初期化が正しく動作する
- [ ] `GET`メソッドで型安全にデータ取得できる
- [ ] `POST`メソッドで型安全にデータ送信できる
- [ ] `PUT`メソッドで型安全にデータ更新できる
- [ ] エラーレスポンスが適切に処理される

### 統合テスト

- [ ] React Queryフック（useUser）が正しい型を返す
- [ ] React Queryフック（useUpdateUser）がキャッシュを適切に無効化する
- [ ] 認証トークンが自動的にリクエストヘッダーに付与される

### TypeScriptコンパイルテスト

- [ ] 存在しないエンドポイントへのアクセスでコンパイルエラーが発生する
- [ ] 誤った型のパラメータでコンパイルエラーが発生する
- [ ] レスポンスの型推論が正しく機能する

---

## 7. 実装方針

### ディレクトリ構成

```
app/client/src/
├── lib/
│   └── api.ts                    # APIクライアント初期化
├── features/
│   ├── user/
│   │   └── hooks/
│   │       ├── useUser.ts        # ユーザー取得フック
│   │       └── useUpdateUser.ts  # ユーザー更新フック
│   └── auth/
│       └── hooks/
│           └── useAuthCallback.ts # 認証コールバックフック
└── types/
    └── api/
        └── generated.ts          # OpenAPIから自動生成（TASK-1001）
```

### 主要ファイル

#### `lib/api.ts`
- `openapi-fetch`の`createClient`でAPIクライアント初期化
- 認証トークンの自動付与
- エラーハンドリングの共通処理

#### `features/user/hooks/useUser.ts`
- React Queryの`useQuery`でユーザー情報取得
- キャッシュキー: `['users', userId]`
- エラー時の型安全な処理

#### `features/user/hooks/useUpdateUser.ts`
- React Queryの`useMutation`でユーザー情報更新
- 成功時にキャッシュを無効化

---

## 8. 完了条件

- [ ] APIクライアントが完全に型安全に実装されている
- [ ] React Queryフックが型安全に動作する
- [ ] 全単体テストが成功する
- [ ] TypeScriptコンパイルで型エラーが検出される（意図的なテストケース）
- [ ] 既存の認証フローと統合されている

---

## 9. 品質判定基準

### ✅ 高品質の条件

- 要件の曖昧さ: なし
- 入出力定義: 完全（OpenAPI型定義から推論）
- 制約条件: 明確（パフォーマンス・セキュリティ・互換性）
- 実装可能性: 確実（TASK-1001で型定義生成済み）

### 評価

**🟢 高品質**: すべての要件が明確で、OpenAPI仕様から自動生成された型定義を基に実装可能。TASK-1001の完了により、TypeScript型定義が利用可能な状態。

---

**次のお勧めステップ**: `/tdd-testcases` でテストケースの洗い出しを行います。

