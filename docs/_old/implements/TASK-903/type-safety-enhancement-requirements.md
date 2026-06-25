# TDD要件定義書: ユーザー管理エンドポイントのOpenAPI対応化

**作成日**: 2025-10-19
**タスクID**: TASK-903
**機能名**: ユーザー管理エンドポイントのOpenAPI対応化
**依存タスク**: TASK-902（認証エンドポイントのOpenAPI対応化）

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 🔵 信頼性レベル: 青信号（EARS要件定義書・設計文書に基づき、ほぼ推測なし）

### 何をする機能か

既存のユーザー管理エンドポイント（`GET /users/{id}`, `GET /users`, `PUT /users/{id}`）を`@hono/zod-openapi`を使用したOpenAPI対応ルートに移行する。これにより、ユーザー管理APIの契約が明示化され、OpenAPI仕様書に含まれるようになる。

### どのような問題を解決するか

**現状の課題**:
- ユーザー管理エンドポイントがOpenAPI仕様に含まれていない
- API契約が暗黙的で、フロントエンドとの型整合性が保証されていない
- パスパラメータ・クエリパラメータ・ボディのバリデーションが不完全
- APIドキュメントとコードが乖離する可能性

**この機能による解決**:
- OpenAPI仕様書にユーザー管理エンドポイントが明示される
- Zodスキーマによる実行時バリデーションが統合される（リクエストパラメータ・ボディ）
- フロントエンドで自動生成される型定義にユーザー管理APIが含まれる
- ページネーション・フィルタリングのパラメータが明確化される

### 想定されるユーザー

- **バックエンド開発者**: OpenAPI準拠のAPIエンドポイントを実装
- **フロントエンド開発者**: 自動生成された型定義を使用してユーザー管理APIを呼び出す
- **API利用者**: Swagger UIでユーザー管理エンドポイントの仕様を確認

### システム内での位置づけ

**アーキテクチャ層**:
```
Presentation層: HonoルートをOpenAPIルートに移行
  ↓
Application層: GetUserUseCase, ListUsersUseCase, UpdateUserUseCase（既存）を利用
  ↓
Infrastructure層: UserRepository（既存）を利用
```

**スキーマ駆動開発フローにおける位置づけ**:
```
Zodスキーマ（shared-schemas/users.ts - 既存）
  ↓
OpenAPIルート定義（userRoutes.ts - このタスクで移行）
  ↓
OpenAPI仕様書生成（openapi.yaml）
  ↓
TypeScript型定義生成（client/src/types/api/）
```

### 参照したEARS要件

- **REQ-004**: システムはZodスキーマからOpenAPI 3.1仕様を生成しなければならない
- **REQ-104**: APIリクエストがZodバリデーションに失敗した場合、システムは詳細なエラーメッセージと共に400 Bad Requestを返却しなければならない
- **REQ-403**: システムはOpenAPI仕様を`docs/api/openapi.yaml`として出力しなければならない
- **REQ-405**: システムは既存のDDD + クリーンアーキテクチャ構造を維持しながら型安全性を強化しなければならない

### 参照した設計文書

- **アーキテクチャ設計**: `docs/design/type-safety-enhancement/architecture.md`（スキーマ駆動開発フロー、バックエンドスキーマ生成フロー）
- **API仕様書**: `docs/design/type-safety-enhancement/api-endpoints.md`（GET /users/{id}, GET /users, PUT /users/{id}の仕様）
- **タスク定義**: `docs/tasks/type-safety-enhancement-tasks.md`（TASK-903の詳細）

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 🔵 信頼性レベル: 青信号（shared-schemas/users.tsのZodスキーマに基づく）

### エンドポイント1: GET /users/{id}

ユーザーIDでユーザー情報を取得する。

#### リクエスト仕様

**HTTPメソッド**: GET

**パス**: `/users/{id}`

**ヘッダー**:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**パスパラメータ**:
- `id`: `string (UUID)` - ユーザーID（必須）

**Zodスキーマ**: `getUserParamsSchema`（shared-schemas/users.ts）

```typescript
{
  id: string; // UUID v4形式
}
```

**バリデーション制約**:
- `id`: UUID v4形式（z.uuid()）

#### レスポンス仕様

**成功レスポンス（200 OK）**:

**Zodスキーマ**: `getUserResponseSchema`（shared-schemas/users.ts）

```typescript
{
  success: true,
  data: {
    id: string;              // UUID v4
    externalId: string;
    provider: AuthProvider;
    email: string;
    name: string;
    avatarUrl: string | null | undefined;
    createdAt: string;       // ISO 8601 datetime
    updatedAt: string;       // ISO 8601 datetime
    lastLoginAt: string | null | undefined;
  }
}
```

**エラーレスポンス**:

**400 Bad Request**（パスパラメータバリデーション失敗）:
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "バリデーションエラー",
    details: {
      id: "有効なUUID v4形式である必要があります"
    }
  }
}
```

**401 Unauthorized**（JWKS検証失敗）:
```typescript
{
  success: false,
  error: {
    code: "UNAUTHORIZED",
    message: "JWKS検証に失敗しました"
  }
}
```

**404 Not Found**（ユーザーが見つからない）:
```typescript
{
  success: false,
  error: {
    code: "NOT_FOUND",
    message: "ユーザーが見つかりません"
  }
}
```

**500 Internal Server Error**（サーバーエラー）:
```typescript
{
  success: false,
  error: {
    code: "INTERNAL_SERVER_ERROR",
    message: "一時的にサービスが利用できません"
  }
}
```

### エンドポイント2: GET /users

ユーザー一覧を取得する（ページネーション・フィルタリング対応）。

#### リクエスト仕様

**HTTPメソッド**: GET

**パス**: `/users`

**ヘッダー**:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**クエリパラメータ**:

**Zodスキーマ**: `listUsersQuerySchema`（shared-schemas/users.ts）

```typescript
{
  provider?: "google" | "apple" | "microsoft" | "github" | "facebook" | "line";  // オプション
  limit?: number;    // デフォルト: 20, 範囲: 1-100
  offset?: number;   // デフォルト: 0, 最小: 0
}
```

**バリデーション制約**:
- `provider`: authProviderスキーマの値のいずれか（オプション）
- `limit`: 1以上100以下の整数（デフォルト: 20）
- `offset`: 0以上の整数（デフォルト: 0）

#### レスポンス仕様

**成功レスポンス（200 OK）**:

**Zodスキーマ**: `listUsersResponseSchema`（shared-schemas/users.ts）

```typescript
{
  success: true,
  data: {
    users: Array<{
      id: string;
      externalId: string;
      provider: AuthProvider;
      email: string;
      name: string;
      avatarUrl: string | null | undefined;
      createdAt: string;
      updatedAt: string;
      lastLoginAt: string | null | undefined;
    }>,
    total: number;   // 総件数
    limit: number;   // 取得件数
    offset: number;  // オフセット
  }
}
```

**エラーレスポンス**:

**400 Bad Request**（クエリパラメータバリデーション失敗）:
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "バリデーションエラー",
    details: {
      limit: "取得件数は1以上100以下である必要があります"
    }
  }
}
```

**401 Unauthorized**（JWKS検証失敗）:
```typescript
{
  success: false,
  error: {
    code: "UNAUTHORIZED",
    message: "JWKS検証に失敗しました"
  }
}
```

### エンドポイント3: PUT /users/{id}

ユーザー情報を更新する（名前・アバターURL）。

#### リクエスト仕様

**HTTPメソッド**: PUT

**パス**: `/users/{id}`

**ヘッダー**:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**パスパラメータ**:
- `id`: `string (UUID)` - ユーザーID（必須）

**ボディ**:

**Zodスキーマ**: `updateUserBodySchema`（shared-schemas/users.ts）

```typescript
{
  name?: string;        // オプション: ユーザー名（最小1文字）
  avatarUrl?: string;   // オプション: アバターURL（URL形式）
}
```

**バリデーション制約**:
- `name`: 1文字以上の文字列（オプション）
- `avatarUrl`: URL形式（オプション、z.string().url()）

#### レスポンス仕様

**成功レスポンス（200 OK）**:

**Zodスキーマ**: `updateUserResponseSchema`（shared-schemas/users.ts）

```typescript
{
  success: true,
  data: {
    id: string;
    externalId: string;
    provider: AuthProvider;
    email: string;
    name: string;
    avatarUrl: string | null | undefined;
    createdAt: string;
    updatedAt: string;       // 更新後のタイムスタンプ
    lastLoginAt: string | null | undefined;
  }
}
```

**エラーレスポンス**:

**400 Bad Request**（バリデーション失敗）:
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "バリデーションエラー",
    details: {
      name: "ユーザー名は1文字以上である必要があります"
    }
  }
}
```

**401 Unauthorized**（JWKS検証失敗）:
```typescript
{
  success: false,
  error: {
    code: "UNAUTHORIZED",
    message: "JWKS検証に失敗しました"
  }
}
```

**404 Not Found**（ユーザーが見つからない）:
```typescript
{
  success: false,
  error: {
    code: "NOT_FOUND",
    message: "ユーザーが見つかりません"
  }
}
```

### 参照したEARS要件

- **REQ-003**: システムは生成されたZodスキーマをAPI型定義の基礎として使用しなければならない
- **REQ-104**: APIリクエストがZodバリデーションに失敗した場合、詳細なエラーメッセージと共に400 Bad Requestを返却しなければならない

### 参照した設計文書

- **API仕様書**: `docs/design/type-safety-enhancement/api-endpoints.md`（各エンドポイントの詳細仕様）
- **型定義**: `app/packages/shared-schemas/src/users.ts`（getUserParamsSchema, listUsersQuerySchema, updateUserBodySchema）
- **型定義**: `app/packages/shared-schemas/src/common.ts`（apiResponseSchema, apiErrorResponseSchema）

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 🔵 信頼性レベル: 青信号（アーキテクチャ設計とプロジェクトCLAUDE.mdに基づく）

### アーキテクチャ制約

**DDD + クリーンアーキテクチャの維持**:
- **Domain層**: エンティティ・値オブジェクトの変更なし
- **Application層**: GetUserUseCase, ListUsersUseCase, UpdateUserUseCaseは既存のまま利用
- **Infrastructure層**: UserRepositoryは変更なし
- **Presentation層**: userRoutes.tsのみをOpenAPIルートに移行

**レイヤー間の依存関係**:
```
Presentation (OpenAPI Route)
  ↓ 依存
Application (GetUserUseCase, ListUsersUseCase, UpdateUserUseCase)
  ↓ 依存
Infrastructure (UserRepository)
```

### 認証・認可制約

- **JWKS認証**: すべてのユーザー管理エンドポイントにJWKS検証ミドルウェアを適用
- **認証フロー**:
  1. JWT ヘッダーから `kid` を取得
  2. Supabase JWKS エンドポイントから公開鍵セットを取得（キャッシュ10分）
  3. `kid` に対応する公開鍵で署名検証（RS256/ES256）
  4. 検証成功後、JWTペイロードを `c.set('jwtPayload', payload)` で保存
- **検証失敗時**: `401 Unauthorized` を返却

### パフォーマンス要件

- **NFR-001**: Zodバリデーションによるレスポンスタイムへの影響が著しくないこと
- リクエストバリデーションのオーバーヘッドを測定（目標: 50ms以内の追加遅延）
- ページネーション対応による大量データ取得の防止（最大100件/リクエスト）

### セキュリティ要件

- **NFR-301**: Zodバリデーションは型安全性だけでなく、XSS・SQLインジェクション対策の一環として機能すること
- **NFR-303**: 実行時バリデーション失敗時、内部エラー詳細をクライアントに露出しないこと
- OpenAPI仕様書に機密情報（DB接続文字列、API Secret等）を含めないこと
- **Row-Level Security (RLS)**: Supabase認証と連携したデータアクセス制御

### API制約

- **REQ-405**: システムは既存のDDD + クリーンアーキテクチャ構造を維持しながら型安全性を強化しなければならない
- 既存のユーザー管理フローを破壊しないこと（後方互換性の維持）
- エンドポイントパスは変更しない（`/users/{id}`, `/users`, `/users/{id}`）

### データベース制約

- usersテーブルのスキーマ変更なし
- Drizzle ORMのスキーマ定義（schema.ts）を変更しない

### 開発制約

- **コマンド操作**: server コンテナ内で実行（`docker compose exec server bun ...`）
- **パッケージ管理**: Bun
- **TypeScript**: 5.9.2
- **Hono**: 4.9.0
- **@hono/zod-openapi**: 最新安定版（TASK-901で導入済み）

### 参照したEARS要件

- **REQ-405**: 既存のDDD + クリーンアーキテクチャ構造を維持
- **NFR-001**: パフォーマンス要件
- **NFR-301、NFR-303**: セキュリティ要件

### 参照した設計文書

- **アーキテクチャ設計**: `docs/design/type-safety-enhancement/architecture.md`（DDD + クリーンアーキテクチャとの整合性、JWKS認証フロー）
- **プロジェクトCLAUDE.md**: `/home/rimane/projects/hoxt-backlog/CLAUDE.md`（開発制約、コマンド操作）

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 🔵 信頼性レベル: 青信号（API仕様書のエッジケース定義に基づく）

### 基本的な使用パターン（通常フロー）

#### シナリオ1: ユーザー情報取得成功（GET /users/{id}）

**リクエスト**:
```json
GET /users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <JWT_TOKEN>
```

**期待されるレスポンス**:
```json
200 OK
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "externalId": "1234567890",
    "provider": "google",
    "email": "user@example.com",
    "name": "User Name",
    "avatarUrl": "https://example.com/avatar.jpg",
    "createdAt": "2025-10-19T10:00:00Z",
    "updatedAt": "2025-10-19T10:00:00Z",
    "lastLoginAt": "2025-10-19T10:00:00Z"
  }
}
```

**データフロー**:
1. OpenAPIルートでJWKS認証ミドルウェアを実行
2. パスパラメータ `id` をZodバリデーション
3. GetUserUseCaseを実行（既存）
4. UserRepositoryでユーザー取得
5. レスポンスボディをZodバリデーション（開発環境のみ）
6. 200 OKレスポンス返却

#### シナリオ2: ユーザー一覧取得成功（GET /users）

**リクエスト**:
```json
GET /users?provider=google&limit=20&offset=0
Authorization: Bearer <JWT_TOKEN>
```

**期待されるレスポンス**:
```json
200 OK
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "externalId": "1234567890",
        "provider": "google",
        "email": "user1@example.com",
        "name": "User 1",
        "avatarUrl": "https://example.com/avatar1.jpg",
        "createdAt": "2025-10-19T10:00:00Z",
        "updatedAt": "2025-10-19T10:00:00Z",
        "lastLoginAt": "2025-10-19T10:00:00Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "externalId": "0987654321",
        "provider": "google",
        "email": "user2@example.com",
        "name": "User 2",
        "avatarUrl": "https://example.com/avatar2.jpg",
        "createdAt": "2025-10-18T10:00:00Z",
        "updatedAt": "2025-10-18T10:00:00Z",
        "lastLoginAt": "2025-10-18T10:00:00Z"
      }
    ],
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

**データフロー**:
1. OpenAPIルートでJWKS認証ミドルウェアを実行
2. クエリパラメータをZodバリデーション
3. ListUsersUseCaseを実行（既存）
4. UserRepositoryでユーザー一覧取得（フィルタリング・ページネーション適用）
5. レスポンスボディをZodバリデーション（開発環境のみ）
6. 200 OKレスポンス返却

#### シナリオ3: ユーザー情報更新成功（PUT /users/{id}）

**リクエスト**:
```json
PUT /users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <JWT_TOKEN>
{
  "name": "Updated User Name",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**期待されるレスポンス**:
```json
200 OK
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "externalId": "1234567890",
    "provider": "google",
    "email": "user@example.com",
    "name": "Updated User Name",
    "avatarUrl": "https://example.com/new-avatar.jpg",
    "createdAt": "2025-10-19T10:00:00Z",
    "updatedAt": "2025-10-19T11:00:00Z",
    "lastLoginAt": "2025-10-19T10:00:00Z"
  }
}
```

**データフロー**:
1. OpenAPIルートでJWKS認証ミドルウェアを実行
2. パスパラメータ `id` とボディをZodバリデーション
3. UpdateUserUseCaseを実行（既存）
4. UserRepositoryでユーザー更新
5. レスポンスボディをZodバリデーション（開発環境のみ）
6. 200 OKレスポンス返却

### エッジケース（バリデーションエラー）

#### EDGE-001: パスパラメータが不正なUUID形式（GET /users/{id}）

**リクエスト**:
```json
GET /users/invalid-uuid
Authorization: Bearer <JWT_TOKEN>
```

**期待されるレスポンス**:
```json
400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": {
      "id": "有効なUUID v4形式である必要があります"
    }
  }
}
```

**データフロー**:
1. OpenAPIルートでJWKS認証ミドルウェアを実行
2. パスパラメータ `id` のZodバリデーション失敗
3. 詳細エラーメッセージを生成
4. 400 Bad Requestレスポンス返却（UseCaseは実行されない）

#### EDGE-002: クエリパラメータのlimitが範囲外（GET /users）

**リクエスト**:
```json
GET /users?limit=200
Authorization: Bearer <JWT_TOKEN>
```

**期待されるレスポンス**:
```json
400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": {
      "limit": "取得件数は1以上100以下である必要があります"
    }
  }
}
```

#### EDGE-003: 更新ボディのnameが空文字列（PUT /users/{id}）

**リクエスト**:
```json
PUT /users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <JWT_TOKEN>
{
  "name": ""
}
```

**期待されるレスポンス**:
```json
400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": {
      "name": "ユーザー名は1文字以上である必要があります"
    }
  }
}
```

#### EDGE-004: 更新ボディのavatarUrlが不正なURL形式（PUT /users/{id}）

**リクエスト**:
```json
PUT /users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <JWT_TOKEN>
{
  "avatarUrl": "not-a-url"
}
```

**期待されるレスポンス**:
```json
400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": {
      "avatarUrl": "有効なURL形式である必要があります"
    }
  }
}
```

### エラーケース（認証エラー）

#### EDGE-005: JWKS検証失敗（全エンドポイント）

**期待されるレスポンス**:
```json
401 Unauthorized
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "JWKS検証に失敗しました"
  }
}
```

**データフロー**:
1. OpenAPIルートでJWKS認証ミドルウェアを実行
2. JWT署名検証失敗
3. 401 Unauthorizedレスポンス返却（UseCaseは実行されない）

### エラーケース（リソースが見つからない）

#### EDGE-006: ユーザーが存在しない（GET /users/{id}, PUT /users/{id}）

**期待されるレスポンス**:
```json
404 Not Found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "ユーザーが見つかりません"
  }
}
```

**データフロー**:
1. OpenAPIルートでJWKS認証ミドルウェアを実行
2. パスパラメータ・ボディをZodバリデーション成功
3. GetUserUseCase/UpdateUserUseCaseを実行
4. UserRepositoryでユーザーが見つからない
5. 404 Not Foundレスポンス返却

### エラーケース（サーバーエラー）

#### EDGE-007: データベース接続エラー（全エンドポイント）

**期待されるレスポンス**:
```json
500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "一時的にサービスが利用できません"
  }
}
```

**データフロー**:
1. OpenAPIルートでJWKS認証ミドルウェアを実行
2. パスパラメータ・クエリパラメータ・ボディをZodバリデーション成功
3. UseCase実行中にDBエラー発生
4. エラーログ記録（セキュリティイベント）
5. 内部実装を隠蔽した500エラーレスポンス返却

### 参照したEARS要件

- **EDGE-001**: Zodバリデーション失敗時は、フィールド名・期待値・実際の値を含むエラーレスポンスを返却する
- **REQ-104**: APIリクエストがZodバリデーションに失敗した場合、詳細なエラーメッセージと共に400 Bad Requestを返却
- **REQ-105**: APIレスポンスがZodバリデーションに失敗した場合、500 Internal Server Errorをログに記録

### 参照した設計文書

- **API仕様書**: `docs/design/type-safety-enhancement/api-endpoints.md`（エラーレスポンスの詳細仕様）
- **共通型定義**: `app/packages/shared-schemas/src/common.ts`（apiErrorResponseSchema）

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- **ストーリー2**: API契約の明示化による連携品質向上
  - 「フロントエンド開発者として、OpenAPI仕様書から自動生成されたTypeScript型定義を使用して、バックエンドAPIと安全に連携したい」

### 参照した機能要件

- **REQ-003**: システムは生成されたZodスキーマをAPI型定義の基礎として使用しなければならない
- **REQ-004**: システムはZodスキーマからOpenAPI 3.1仕様を生成しなければならない
- **REQ-104**: APIリクエストがZodバリデーションに失敗した場合、詳細なエラーメッセージと共に400 Bad Requestを返却
- **REQ-403**: システムはOpenAPI仕様を`docs/api/openapi.yaml`として出力しなければならない
- **REQ-405**: 既存のDDD + クリーンアーキテクチャ構造を維持

### 参照した非機能要件

- **NFR-001**: Zodバリデーションによるレスポンスタイムへの影響が著しくないこと
- **NFR-301**: Zodバリデーションは型安全性だけでなく、XSS・SQLインジェクション対策の一環として機能すること
- **NFR-303**: 実行時バリデーション失敗時、内部エラー詳細をクライアントに露出しないこと

### 参照したEdgeケース

- **EDGE-001**: Zodバリデーション失敗時は、フィールド名・期待値・実際の値を含むエラーレスポンスを返却する

### 参照した受け入れ基準

- ZodスキーマからOpenAPI 3.1仕様を生成できる
- バックエンドAPIリクエストがZodで実行時検証される
- Zodバリデーションエラーが適切なHTTPステータスコードと共に返却される

### 参照した設計文書

#### アーキテクチャ
- **ファイル**: `docs/design/type-safety-enhancement/architecture.md`
- **該当セクション**:
  - 「スキーマ生成フロー」（4. OpenAPIルート定義）
  - 「DDD + クリーンアーキテクチャとの整合性」（Presentation層）
  - 「バリデーション戦略」（リクエストバリデーション）
  - 「セキュリティ設計」（認証・認可 - JWKS検証）

#### データフロー
- **ファイル**: `docs/design/type-safety-enhancement/architecture.md`
- **該当セクション**: 「実行時型安全性（Zod）」のフロー図

#### 型定義
- **ファイル**: `app/packages/shared-schemas/src/users.ts`
- **該当インターフェース**:
  - `getUserParamsSchema`
  - `listUsersQuerySchema`
  - `updateUserBodySchema`
  - `getUserResponseSchema`
  - `listUsersResponseSchema`
  - `updateUserResponseSchema`

#### API仕様
- **ファイル**: `docs/design/type-safety-enhancement/api-endpoints.md`
- **該当エンドポイント**:
  - GET /users/{id}
  - GET /users
  - PUT /users/{id}

---

## 品質判定

### ✅ 高品質

- **要件の曖昧さ**: なし（Zodスキーマとアーキテクチャ設計に基づき明確）
- **入出力定義**: 完全（shared-schemas/users.tsで型定義済み）
- **制約条件**: 明確（DDD + クリーンアーキテクチャ、JWKS認証、パフォーマンス、セキュリティ）
- **実装可能性**: 確実（TASK-902で認証エンドポイントのOpenAPI対応が完了済み、同じパターンを適用）

### 実装上の注意点

1. **既存コードの移行**: userRoutes.tsのHonoルートをOpenAPIルートに置き換え
2. **エンドポイントパス維持**: `/users/{id}`, `/users`, `/users/{id}` - パス変更なし
3. **Zodスキーマの活用**: shared-schemas/users.tsのスキーマをそのまま使用
4. **エラーハンドリング**: 既存のtry-catchブロックを維持しつつ、Zodバリデーションエラーを追加
5. **JWKS認証**: すべてのエンドポイントに認証ミドルウェアを適用（TASK-902と同じパターン）

---

## 次のステップ

**次のお勧めステップ**: `/tdd-testcases` でテストケースの洗い出しを行います。
