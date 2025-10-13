# 型安全性強化・API契約強化 アーキテクチャ設計

**作成日**: 2025-10-12
**更新日**: 2025-10-12
**バージョン**: 1.0.0

## システム概要

本設計は、Drizzle ORM、Drizzle Zod、OpenAPI 3.1、TypeScriptを活用したスキーマ駆動開発により、フロントエンド（Next.js）とバックエンド（Hono API）間の型安全性を強化し、API契約の信頼性を向上させることを目的とする。

**Single Source of Truth**: データベーススキーマ（Drizzle ORM）
**型安全性の保証範囲**: コンパイル時（TypeScript） + 実行時（Zod）
**ドキュメント自動生成**: OpenAPI 3.1仕様 → Swagger UI

## アーキテクチャパターン

### 選択パターン: スキーマ駆動開発（Schema-Driven Development）

**理由**:
- データベーススキーマを単一の信頼できる情報源として、API型定義・バリデーション・ドキュメントを自動生成
- 手動での型定義重複を排除し、開発効率を向上
- 型の不整合をコンパイル時・実行時の両方で検出
- ドキュメントとコードの乖離を防止

### アーキテクチャの層構成

```
┌─────────────────────────────────────────────────────────────┐
│                    Single Source of Truth                    │
│           Drizzle ORM Database Schema (schema.ts)            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓ drizzle-zod
┌─────────────────────────────────────────────────────────────┐
│              Zod Schemas (shared-schemas/)                   │
│  - createSelectSchema (DB読み取り型)                         │
│  - createInsertSchema (DB書き込み型)                         │
│  - API Request/Response Schemas                              │
└───────────┬──────────────────────────────┬──────────────────┘
            │                              │
            ↓ @hono/zod-openapi           ↓ TypeScript inference
┌───────────────────────────┐  ┌─────────────────────────────┐
│  OpenAPI 3.1 Spec         │  │  Backend Zod Validation     │
│  (openapi.yaml)           │  │  - Request validation       │
│                           │  │  - Response validation      │
└────────┬──────────────────┘  └─────────────────────────────┘
         │
         ↓ openapi-typescript
┌─────────────────────────────────────────────────────────────┐
│         Frontend TypeScript Types (types/api/)              │
│  - API Request types                                        │
│  - API Response types                                       │
│  - Type-safe API client                                     │
└─────────────────────────────────────────────────────────────┘
```

## コンポーネント構成

### バックエンド（Hono API）

#### フレームワーク・ライブラリ
- **Webフレームワーク**: Hono 4.9.0
- **ORMレイヤー**: Drizzle ORM 0.44.4
- **バリデーション**: Zod 4.0.17 + drizzle-zod 0.8.3
- **OpenAPI生成**: @hono/zod-openapi（新規導入）
- **認証**: Supabase Auth + JWKS検証（jose 6.1.0、RS256/ES256非対称鍵）
- **ランタイム**: Bun（開発）/ Node.js 22.x（本番）

#### アーキテクチャパターン
- **DDD + クリーンアーキテクチャ**: 既存構造を維持
  - **Domain層**: エンティティ・値オブジェクト（Zod型定義）
  - **Application層**: Use Case（Zod入出力検証）
  - **Infrastructure層**: Drizzle ORMリポジトリ
  - **Presentation層**: Hono OpenAPIルート

#### スキーマ生成フロー
```typescript
// 1. Drizzle ORMスキーマ定義
export const users = schema.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 320 }).notNull(),
  // ...
});

// 2. Drizzle Zodでスキーマ自動生成
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';

export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users);

// 3. API契約スキーマ定義（カスタマイズ可能）
export const getUserResponseSchema = z.object({
  success: z.boolean(),
  data: selectUserSchema,
});

// 4. OpenAPIルート定義（Hono）
app.openapi(
  createRoute({
    method: 'get',
    path: '/users/{id}',
    request: {
      params: z.object({ id: z.string().uuid() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: getUserResponseSchema,
          },
        },
        description: 'Retrieve user',
      },
    },
  }),
  async (c) => { /* ... */ }
);
```

### フロントエンド（Next.js）

#### フレームワーク・ライブラリ
- **UIフレームワーク**: Next.js 15.4.6（SSG）
- **状態管理**: Redux Toolkit 2.8.2
- **データフェッチング**: TanStack React Query 5.84.2
- **認証クライアント**: Supabase JS 2.56.0
- **スタイリング**: Tailwind CSS 4
- **パッケージ管理**: Bun
- **型定義生成**: openapi-typescript（新規導入）

#### APIクライアント型安全化
```typescript
// 1. OpenAPI仕様から自動生成された型定義
// app/client/src/types/api/generated.ts（自動生成）
export interface paths {
  '/users/{id}': {
    get: {
      parameters: {
        path: {
          id: string; // UUID
        };
      };
      responses: {
        200: {
          content: {
            'application/json': {
              success: boolean;
              data: {
                id: string;
                email: string;
                name: string;
                // ...
              };
            };
          };
        };
      };
    };
  };
}

// 2. 型安全なAPIクライアント実装
import type { paths } from '@/types/api/generated';
import { createClient } from 'openapi-fetch';

const client = createClient<paths>({ baseUrl: API_BASE_URL });

// 3. React Queryフックでの使用
export function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: async () => {
      const { data, error } = await client.GET('/users/{id}', {
        params: { path: { id: userId } },
      });
      if (error) throw error;
      return data.data; // 完全に型安全
    },
  });
}
```

### バックエンドスキーマ（server/src/schemas）

#### 役割
- Drizzle Zodで生成されたDBスキーマの配置（server専用）
- データベース読み取り・書き込み型定義
- Repository層での型安全性保証

#### ディレクトリ構成
```
app/server/src/schemas/
├── users.ts          # DBスキーマ（selectUserSchema, insertUserSchema）
└── index.ts          # エクスポート集約
```

### 共通パッケージ（shared-schemas）

#### 役割
- API契約用のリクエスト・レスポンススキーマ定義
- フロントエンド・バックエンド間で共有される型定義
- OpenAPI仕様生成の基礎スキーマ

#### ディレクトリ構成
```
app/packages/shared-schemas/
├── users.ts          # ユーザーAPI型定義（GetUserProfileResponse等）
├── auth.ts           # 認証API型定義
├── common.ts         # 共通レスポンス型（ErrorResponse等）
└── index.ts          # エクスポート集約
```

### データベース

#### DBMS
- **PostgreSQL**: Supabase提供
- **スキーマ管理**: Drizzle ORM + Drizzle Kit
- **環境分離**: BASE_SCHEMA環境変数で制御
  - Production: `app_projectname`
  - Preview: `app_projectname_preview`
  - Test: `test_schema`

#### RLS（Row-Level Security）
- Supabase認証と連携
- テーブルレベルのセキュリティポリシー適用
- `auth.uid()`による自己レコードアクセス制御

### キャッシュ戦略

#### フロントエンド
- **React Query**: API応答のキャッシュ・再検証
- **キャッシュキー**: `['resource', id]`形式
- **Stale Time**: リソース種別ごとに設定

#### バックエンド
- 現時点ではキャッシュレイヤーなし
- 将来的にRedis/CloudFlareキャッシュ導入を検討

## 型安全性の保証メカニズム

### コンパイル時型安全性（TypeScript）

```
Drizzle ORM Schema
  ↓ $inferSelect / $inferInsert
TypeScript Types
  ↓ OpenAPI Spec
Frontend TypeScript Types
  ↓ tsc --noEmit
コンパイルエラー検出
```

### 実行時型安全性（Zod）

```
API Request
  ↓ Hono Middleware
Zod Validation (Request)
  ↓ Use Case Execution
Zod Validation (Response - Dev only)
  ↓ HTTP Response
API Response
```

### バリデーション戦略

#### リクエストバリデーション
- **環境**: Production / Preview / Test（常時有効）
- **失敗時**: 400 Bad Request + 詳細エラーメッセージ
- **パフォーマンス**: 開発環境で測定し、著しい劣化がないことを確認

#### レスポンスバリデーション
- **環境**: Development / Test（有効）
- **環境**: Production（無効 - パフォーマンス優先）
- **失敗時**: 500 Internal Server Error + ログ記録

## セキュリティ設計

### API契約レベル
- OpenAPI仕様書に機密情報（DB URL、API Secret等）を含めない
- Swagger UIへのアクセス制限（本番環境では無効化）

### バリデーションレベル
- Zodバリデーションによる入力サニタイゼーション
- XSS・SQLインジェクション対策の一環として機能
- エラーレスポンスに内部実装詳細を露出しない

### 認証・認可
- **Supabase Auth + JWKS検証**: RS256/ES256非対称鍵による署名検証
  - JWKS エンドポイント: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
  - JWT ヘッダーの `kid`（Key ID）を使った公開鍵選択
  - 公開鍵キャッシュ（10分）によるパフォーマンス最適化
  - jose 6.1.0 を使用した署名検証（`jwtVerify` + JWKS）
- **RLS（Row-Level Security）**: Supabase認証と連携したデータアクセス制御
- **APIエンドポイントレベル認証**: Honoミドルウェアでの JWKS 検証

## パフォーマンス設計

### 目標値
- **Zodバリデーション**: 開発環境で測定し、著しい劣化がないことを確認
- **型定義自動生成**: 合理的な時間内（開発体験を損なわない範囲）で完了

### 最適化戦略
- 本番環境ではレスポンスバリデーションを無効化
- 必要に応じて`.passthrough()`でスキーマを柔軟に対応

## 開発ワークフロー

### 型定義自動生成フロー

```bash
# 1. データベーススキーマ変更
# app/server/src/infrastructure/database/schema.ts を編集

# 2. Zodスキーマ自動生成
docker compose exec server bun run generate:schemas

# 3. OpenAPI仕様生成
docker compose exec server bun run generate:openapi

# 4. フロントエンド型定義生成
docker compose exec client bun run generate:types

# 5. 型チェック
docker compose exec server bun run typecheck
docker compose exec client bun run typecheck
```

### CI/CDパイプライン統合

```yaml
# GitHub Actions例
- name: Check generated types are up to date
  run: |
    bun run generate:schemas
    bun run generate:openapi
    bun run generate:types
    git diff --exit-code docs/api/openapi.yaml
    git diff --exit-code app/client/src/types/api/
```

## 拡張性設計

### 新規エンドポイント追加フロー
1. Drizzleスキーマに新テーブル/カラム追加
2. `bun run generate:schemas`実行（Zodスキーマ自動生成）
3. Honoルートに`createRoute`定義追加
4. `bun run generate:openapi`実行
5. `bun run generate:types`実行（フロントエンド型定義生成）
6. フロントエンドでAPIクライアント実装

### 認証プロバイダー追加フロー
1. `auth_provider_type` enumに新プロバイダー追加
2. Zodスキーマ自動再生成
3. 認証ロジック実装（Application層）
4. OpenAPI仕様自動更新

### 将来的な拡張可能性
- **gRPC対応**: 同一のZodスキーマからProtobuf定義生成
- **GraphQL対応**: Zodスキーマから@graphql-codegenで型生成
- **モックサーバー**: Prism等でOpenAPI仕様からモック生成

## ドキュメント管理

### OpenAPI仕様書
- **配置先**: `docs/api/openapi.yaml`
- **バージョン**: OpenAPI 3.1.0
- **アクセス**: 開発環境で`/api/docs`からSwagger UI提供

### スキーマドキュメント
- **Drizzleスキーマ**: JSDocコメントで日本語説明
- **Zodスキーマ**: `.describe()`メソッドで説明追加
- **OpenAPI**: descriptionフィールドに日本語説明反映

### 自動生成ファイルのGit管理
- **管理対象**: OpenAPI仕様、フロントエンド型定義
- **理由**: レビュー可能性・トレーサビリティ確保
- **差分レビュー**: PRで型定義変更を明示的に確認

## 既存システムとの統合

### DDD + クリーンアーキテクチャとの整合性

#### Domain層（ドメインモデル）
```typescript
// app/server/src/domain/user/user.entity.ts
import { z } from 'zod';
import { selectUserSchema } from '@/packages/shared-schemas/users';

export type User = z.infer<typeof selectUserSchema>;

export class UserEntity {
  constructor(private readonly props: User) {}
  // ドメインロジック実装
}
```

#### Application層（Use Case）
```typescript
// app/server/src/application/usecases/get-user.usecase.ts
import { z } from 'zod';
import { selectUserSchema } from '@/packages/shared-schemas/users';

const getUserInputSchema = z.object({
  userId: z.string().uuid(),
});

const getUserOutputSchema = z.object({
  success: z.boolean(),
  data: selectUserSchema,
});

export type GetUserInput = z.infer<typeof getUserInputSchema>;
export type GetUserOutput = z.infer<typeof getUserOutputSchema>;
```

#### Infrastructure層（Repository）
```typescript
// app/server/src/infrastructure/repositories/user.repository.ts
import { selectUserSchema, insertUserSchema } from '@/packages/shared-schemas/users';

export class UserRepository {
  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return selectUserSchema.parse(result[0]); // 実行時検証
  }
}
```

#### Presentation層（Hono Route）
```typescript
// app/server/src/presentation/routes/user.routes.ts
import { getUserResponseSchema } from '@/packages/shared-schemas/users';

app.openapi(
  createRoute({
    method: 'get',
    path: '/users/{id}',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: {
        content: { 'application/json': { schema: getUserResponseSchema } },
        description: 'Retrieve user',
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const output = await getUserUseCase.execute({ userId: id });
    return c.json(output);
  }
);
```

### 既存の認証フローとの統合
- **JWKS検証ミドルウェア**:
  - JWT ヘッダーから `kid` を取得
  - Supabase JWKS エンドポイントから公開鍵セットを取得（キャッシュ）
  - `kid` に対応する公開鍵で署名検証（RS256/ES256）
  - 検証成功後、JWTペイロードを `c.set('jwtPayload', payload)` で保存
- **JWTペイロードの型定義**: Zodスキーマで管理（`sub`, `role`, `email` 等）
- **認証後のバリデーション**: ペイロードをZodスキーマで実行時検証
- **ユーザー情報取得API**: 型定義自動生成により型安全な実装

## リスクと対策

### リスク1: Drizzle ORMとDrizzle Zodのバージョン不整合
- **対策**: package.jsonでバージョン固定・定期的な互換性確認

### リスク2: OpenAPI仕様生成の複雑化
- **対策**: シンプルなスキーマ定義を維持・複雑なケースは手動調整

### リスク3: Zodバリデーションのパフォーマンス影響
- **対策**: 本番環境でレスポンスバリデーション無効化・開発環境で影響を測定

### リスク4: 自動生成コードの可読性低下
- **対策**: 生成ファイルに警告コメント追加・手動編集禁止の徹底

## まとめ

本アーキテクチャは、Drizzle ORMを単一の信頼できる情報源として、Drizzle Zod、OpenAPI、TypeScriptを連携させたスキーマ駆動開発を実現する。

**主要な設計判断**:
1. **Single Source of Truth**: データベーススキーマから全型定義を生成
2. **二重の型安全性**: コンパイル時（TypeScript） + 実行時（Zod）
3. **ドキュメント自動生成**: OpenAPI仕様 → Swagger UI
4. **既存アーキテクチャ維持**: DDD + クリーンアーキテクチャと整合
5. **段階的移行**: 5フェーズで既存コードベースを段階的に移行

これにより、手動での型定義重複を排除し、型の不整合を防ぎ、開発効率とコード品質を向上させる。
