# TDD要件定義書: 認証エンドポイントのOpenAPI対応化

**作成日**: 2025-10-18
**タスクID**: TASK-902
**機能名**: 認証エンドポイントのOpenAPI対応化
**依存タスク**: TASK-901（@hono/zod-openapi導入・設定）

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 🟢 信頼性レベル: 青信号（EARS要件定義書・設計文書に基づき、ほぼ推測なし）

### 何をする機能か

既存の`POST /auth/verify`エンドポイントを`@hono/zod-openapi`を使用したOpenAPI対応ルートに移行する。これにより、認証APIの契約が明示化され、OpenAPI仕様書に含まれるようになる。

### どのような問題を解決するか

**現状の課題**:
- 認証エンドポイントがOpenAPI仕様に含まれていない
- API契約が暗黙的で、フロントエンドとの型整合性が保証されていない
- APIドキュメントとコードが乖離する可能性

**この機能による解決**:
- OpenAPI仕様書に認証エンドポイントが明示される
- Zodスキーマによる実行時バリデーションが統合される
- フロントエンドで自動生成される型定義にauth APIが含まれる

### 想定されるユーザー

- **バックエンド開発者**: OpenAPI準拠のAPIエンドポイントを実装
- **フロントエンド開発者**: 自動生成された型定義を使用して認証APIを呼び出す
- **API利用者**: Swagger UIで認証エンドポイントの仕様を確認

### システム内での位置づけ

**アーキテクチャ層**:
```
Presentation層: HonoルートをOpenAPIルートに移行
  ↓
Application層: AuthenticateUserUseCase（既存）を利用
  ↓
Infrastructure層: SupabaseJwtVerifier（既存）を利用
```

**スキーマ駆動開発フローにおける位置づけ**:
```
Zodスキーマ（shared-schemas/auth.ts - 既存）
  ↓
OpenAPIルート定義（authRoutes.ts - このタスクで移行）
  ↓
OpenAPI仕様書生成（openapi.yaml）
  ↓
TypeScript型定義生成（client/src/types/api/）
```

### 参照したEARS要件

- **REQ-004**: システムはZodスキーマからOpenAPI 3.1仕様を生成しなければならない
- **REQ-104**: APIリクエストがZodバリデーションに失敗した場合、システムは詳細なエラーメッセージと共に400 Bad Requestを返却しなければならない
- **REQ-403**: システムはOpenAPI仕様を`docs/api/openapi.yaml`として出力しなければならない

### 参照した設計文書

- **アーキテクチャ設計**: `docs/design/type-safety-enhancement/architecture.md`（スキーマ駆動開発フロー、バックエンドスキーマ生成フロー）
- **API仕様書**: `docs/design/type-safety-enhancement/api-endpoints.md`（POST /auth/callbackの仕様）

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 🟢 信頼性レベル: 青信号（shared-schemas/auth.tsのZodスキーマに基づく）

### エンドポイント

**変更前**: `POST /auth/verify`（既存）
**変更後**: `POST /auth/callback`（OpenAPI対応化）

### リクエスト仕様

#### HTTPメソッド
POST

#### パス
`/auth/callback`

#### ヘッダー
```http
Content-Type: application/json
```

**注意**: このエンドポイントは認証前のため、`Authorization`ヘッダーは不要

#### ボディ

**Zodスキーマ**: `authCallbackRequestSchema`（shared-schemas/auth.ts）

```typescript
{
  externalId: string;    // 外部プロバイダーでのユーザーID（最小1文字）
  provider: "google" | "apple" | "microsoft" | "github" | "facebook" | "line";
  email: string;         // RFC 5321準拠のメールアドレス
  name: string;          // ユーザー名（最小1文字）
  avatarUrl?: string;    // オプション: アバターURL（URL形式）
}
```

**バリデーション制約**:
- `externalId`: 1文字以上の文字列
- `provider`: 6つの値のいずれか
- `email`: メールアドレス形式（`z.email()`）
- `name`: 1文字以上の文字列
- `avatarUrl`: URL形式（オプション）

### レスポンス仕様

#### 成功レスポンス（200 OK）

**Zodスキーマ**: `authCallbackResponseSchema`（shared-schemas/auth.ts）

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

#### エラーレスポンス

**400 Bad Request**（Zodバリデーション失敗）:
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "バリデーションエラー",
    details: {
      email: "有効なメールアドレス形式である必要があります"
    }
  }
}
```

**401 Unauthorized**（JWKS検証失敗 - 現在の実装）:
```typescript
{
  success: false,
  error: {
    code: "UNAUTHORIZED",
    message: "認証に失敗しました"
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

### 参照したEARS要件

- **REQ-003**: システムは生成されたZodスキーマをAPI型定義の基礎として使用しなければならない
- **REQ-104**: APIリクエストがZodバリデーションに失敗した場合、システムは詳細なエラーメッセージと共に400 Bad Requestを返却しなければならない

### 参照した設計文書

- **API仕様書**: `docs/design/type-safety-enhancement/api-endpoints.md`（POST /auth/callbackの詳細仕様）
- **型定義**: `app/packages/shared-schemas/src/auth.ts`（authCallbackRequestSchema、authCallbackResponseSchema）

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 🟢 信頼性レベル: 青信号（アーキテクチャ設計とプロジェクトCLAUDE.mdに基づく）

### アーキテクチャ制約

**DDD + クリーンアーキテクチャの維持**:
- **Domain層**: エンティティ・値オブジェクトの変更なし
- **Application層**: AuthenticateUserUseCaseは既存のまま利用
- **Infrastructure層**: SupabaseJwtVerifier、UserRepositoryは変更なし
- **Presentation層**: authRoutes.tsのみをOpenAPIルートに移行

**レイヤー間の依存関係**:
```
Presentation (OpenAPI Route)
  ↓ 依存
Application (AuthenticateUserUseCase)
  ↓ 依存
Infrastructure (SupabaseJwtVerifier, UserRepository)
```

### パフォーマンス要件

- **NFR-001**: Zodバリデーションによるレスポンスタイムへの影響が著しくないこと
- リクエストバリデーションのオーバーヘッドを測定（目標: 50ms以内の追加遅延）

### セキュリティ要件

- **NFR-301**: Zodバリデーションは型安全性だけでなく、XSS・SQLインジェクション対策の一環として機能すること
- **NFR-303**: 実行時バリデーション失敗時、内部エラー詳細をクライアントに露出しないこと
- OpenAPI仕様書に機密情報（DB接続文字列、API Secret等）を含めないこと

### API制約

- **REQ-405**: システムは既存のDDD + クリーンアーキテクチャ構造を維持しながら型安全性を強化しなければならない
- エンドポイントパスは`/auth/callback`に変更（既存の`/auth/verify`から移行）
- 既存の認証フローを破壊しないこと（後方互換性の維持）

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

- **アーキテクチャ設計**: `docs/design/type-safety-enhancement/architecture.md`（DDD + クリーンアーキテクチャとの整合性）
- **プロジェクトCLAUDE.md**: `/home/rimane/projects/hoxt-backlog/CLAUDE.md`（開発制約、コマンド操作）

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 🟢 信頼性レベル: 青信号（API仕様書のエッジケース定義に基づく）

### 基本的な使用パターン（通常フロー）

#### シナリオ1: Google認証成功（新規ユーザー）

**リクエスト**:
```json
POST /auth/callback
{
  "externalId": "1234567890",
  "provider": "google",
  "email": "newuser@example.com",
  "name": "New User",
  "avatarUrl": "https://example.com/avatar.jpg"
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
    "email": "newuser@example.com",
    "name": "New User",
    "avatarUrl": "https://example.com/avatar.jpg",
    "createdAt": "2025-10-18T10:00:00Z",
    "updatedAt": "2025-10-18T10:00:00Z",
    "lastLoginAt": "2025-10-18T10:00:00Z"
  }
}
```

**データフロー**:
1. OpenAPIルートでリクエストボディをZodバリデーション
2. AuthenticateUserUseCaseを実行（既存）
3. UserRepositoryでユーザー作成
4. レスポンスボディをZodバリデーション（開発環境のみ）
5. 200 OKレスポンス返却

#### シナリオ2: 既存ユーザーのログイン

**リクエスト**:
```json
POST /auth/callback
{
  "externalId": "existing-user-id",
  "provider": "github",
  "email": "existinguser@example.com",
  "name": "Existing User"
}
```

**期待されるレスポンス**:
```json
200 OK
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "externalId": "existing-user-id",
    "provider": "github",
    "email": "existinguser@example.com",
    "name": "Existing User",
    "avatarUrl": null,
    "createdAt": "2025-10-10T10:00:00Z",
    "updatedAt": "2025-10-18T10:00:00Z",
    "lastLoginAt": "2025-10-18T10:00:00Z"
  }
}
```

**データフロー**:
1. OpenAPIルートでリクエストボディをZodバリデーション
2. AuthenticateUserUseCaseを実行（既存）
3. UserRepositoryで既存ユーザーの`lastLoginAt`を更新
4. レスポンスボディをZodバリデーション（開発環境のみ）
5. 200 OKレスポンス返却

### エッジケース（バリデーションエラー）

#### EDGE-001: メールアドレス形式が不正

**リクエスト**:
```json
POST /auth/callback
{
  "externalId": "1234567890",
  "provider": "google",
  "email": "invalid-email",
  "name": "User"
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
      "email": "有効なメールアドレス形式である必要があります"
    }
  }
}
```

**データフロー**:
1. OpenAPIルートでZodバリデーション失敗
2. 詳細エラーメッセージを生成
3. 400 Bad Requestレスポンス返却（UseCaseは実行されない）

#### EDGE-002: externalIdが空文字列

**リクエスト**:
```json
POST /auth/callback
{
  "externalId": "",
  "provider": "google",
  "email": "user@example.com",
  "name": "User"
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
      "externalId": "externalIdは1文字以上である必要があります"
    }
  }
}
```

#### EDGE-003: providerが不正な値

**リクエスト**:
```json
POST /auth/callback
{
  "externalId": "1234567890",
  "provider": "twitter",
  "email": "user@example.com",
  "name": "User"
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
      "provider": "無効なプロバイダー種別です"
    }
  }
}
```

#### EDGE-004: avatarUrlが不正なURL形式

**リクエスト**:
```json
POST /auth/callback
{
  "externalId": "1234567890",
  "provider": "google",
  "email": "user@example.com",
  "name": "User",
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

### エラーケース（サーバーエラー）

#### EDGE-005: データベース接続エラー

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
1. OpenAPIルートでZodバリデーション成功
2. AuthenticateUserUseCase実行中にDBエラー発生
3. エラーログ記録（セキュリティイベント）
4. 内部実装を隠蔽した500エラーレスポンス返却

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

#### データフロー
- **ファイル**: `docs/design/type-safety-enhancement/architecture.md`
- **該当セクション**: 「実行時型安全性（Zod）」のフロー図

#### 型定義
- **ファイル**: `app/packages/shared-schemas/src/auth.ts`
- **該当インターフェース**:
  - `authCallbackRequestSchema`
  - `authCallbackResponseSchema`
  - `userSchema`
  - `authProviderSchema`

#### API仕様
- **ファイル**: `docs/design/type-safety-enhancement/api-endpoints.md`
- **該当エンドポイント**: POST /auth/callback

---

## 品質判定

### ✅ 高品質

- **要件の曖昧さ**: なし（Zodスキーマとアーキテクチャ設計に基づき明確）
- **入出力定義**: 完全（shared-schemas/auth.tsで型定義済み）
- **制約条件**: 明確（DDD + クリーンアーキテクチャ、パフォーマンス、セキュリティ）
- **実装可能性**: 確実（TASK-901で@hono/zod-openapiが導入済み）

### 実装上の注意点

1. **既存コードの移行**: authRoutes.tsのHonoルートをOpenAPIルートに置き換え
2. **エンドポイントパス変更**: `/auth/verify` → `/auth/callback`
3. **Zodスキーマの活用**: shared-schemas/auth.tsのスキーマをそのまま使用
4. **エラーハンドリング**: 既存のtry-catchブロックを維持しつつ、Zodバリデーションエラーを追加

---

## 次のステップ

**次のお勧めステップ**: `/tdd-testcases` でテストケースの洗い出しを行います。
