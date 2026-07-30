# API エンドポイント仕様

**作成日**: 2025-10-12
**更新日**: 2025-10-12
**バージョン**: 1.0.0

## 概要

このドキュメントは、型安全性強化・API契約強化プロジェクトにおける全APIエンドポイントの仕様を定義する。すべてのエンドポイントは以下の特徴を持つ：

- **OpenAPI 3.1準拠**: 自動生成されたOpenAPI仕様（`docs/api/openapi.yaml`）と一致
- **Zodバリデーション**: リクエスト・レスポンスを実行時検証
- **TypeScript型安全**: フロントエンドで自動生成された型定義を使用
- **JWKS認証**: Supabase Authによる認証（RS256/ES256非対称鍵、一部のエンドポイントを除く）

## 共通仕様

### ベースURL

- **開発環境**: `http://localhost:3001/api`
- **本番環境**: `https://api.example.com/api`（環境変数で設定）

### 認証方式

```http
Authorization: Bearer <JWT_TOKEN>
```

- **JWTトークン**: Supabase Authで発行されたJWTトークンをヘッダーに付与
- **JWKS検証フロー**:
  1. バックエンドがJWTヘッダーから `kid`（Key ID）を取得
  2. Supabase JWKS エンドポイント（`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`）から公開鍵セットを取得（キャッシュ10分）
  3. `kid` に対応する公開鍵で署名検証（RS256/ES256）
  4. 検証成功後、JWTペイロード（`sub`, `role`, `email` 等）を取得
- **検証失敗時**: `401 Unauthorized` を返却

### 共通レスポンス形式

#### 成功レスポンス

```json
{
  "success": true,
  "data": {
    // エンドポイント固有のデータ
  }
}
```

#### エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {
      // オプション: エラー詳細
    }
  }
}
```

### HTTPステータスコード

- `200 OK`: 成功
- `201 Created`: リソース作成成功
- `400 Bad Request`: バリデーションエラー
- `401 Unauthorized`: 認証エラー
- `403 Forbidden`: 権限エラー
- `404 Not Found`: リソースが見つからない
- `422 Unprocessable Entity`: ビジネスロジックエラー
- `500 Internal Server Error`: サーバー内部エラー

### エラーコード一覧

| コード | 説明 | HTTPステータス |
|--------|------|----------------|
| `VALIDATION_ERROR` | Zodバリデーション失敗 | 400 |
| `UNAUTHORIZED` | JWKS検証失敗（JWT署名不正・有効期限切れ等） | 401 |
| `FORBIDDEN` | 権限不足 | 403 |
| `NOT_FOUND` | リソースが見つからない | 404 |
| `USER_ALREADY_EXISTS` | ユーザー既存（メール重複等） | 422 |
| `INTERNAL_ERROR` | サーバー内部エラー | 500 |

## 認証エンドポイント

### POST /auth/callback

Supabase認証後のコールバック処理。外部プロバイダー（Google, GitHub等）の認証情報を受け取り、ユーザーを登録または更新する。

#### リクエスト

**ヘッダー**:
```http
Content-Type: application/json
```

**ボディ**:
```json
{
  "externalId": "1234567890",
  "provider": "google",
  "email": "user@example.com",
  "name": "User Name",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Zodスキーマ**: `authCallbackRequestSchema`

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `externalId` | `string` | ✓ | 外部プロバイダーでのユーザーID |
| `provider` | `"google" \| "apple" \| "microsoft" \| "github" \| "facebook" \| "line"` | ✓ | 認証プロバイダー種別 |
| `email` | `string (email)` | ✓ | メールアドレス |
| `name` | `string (min: 1)` | ✓ | ユーザー名 |
| `avatarUrl` | `string (url)` | - | アバターURL |

#### レスポンス

**成功（200 OK）**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "externalId": "1234567890",
    "provider": "google",
    "email": "user@example.com",
    "name": "User Name",
    "avatarUrl": "https://example.com/avatar.jpg",
    "createdAt": "2025-10-12T10:00:00Z",
    "updatedAt": "2025-10-12T10:00:00Z",
    "lastLoginAt": "2025-10-12T10:00:00Z"
  }
}
```

**Zodスキーマ**: `authResponseSchema`

**エラー（400 Bad Request）**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": {
      "email": "有効なメールアドレスではありません"
    }
  }
}
```

#### OpenAPI定義

```yaml
/auth/callback:
  post:
    summary: 認証コールバック処理
    description: Supabase認証後のコールバック。ユーザー登録または最終ログイン日時更新を実行
    tags:
      - Authentication
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/AuthCallbackRequest'
    responses:
      '200':
        description: 認証成功
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthResponse'
      '400':
        description: バリデーションエラー
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

## ユーザー管理エンドポイント

### GET /users/{id}

ユーザーIDでユーザー情報を取得する。

#### リクエスト

**ヘッダー**:
```http
Authorization: Bearer <JWT_TOKEN>
```

**パスパラメータ**:

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | `string (UUID)` | ユーザーID |

**Zodスキーマ**: `getUserParamsSchema`

#### レスポンス

**成功（200 OK）**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "externalId": "1234567890",
    "provider": "google",
    "email": "user@example.com",
    "name": "User Name",
    "avatarUrl": "https://example.com/avatar.jpg",
    "createdAt": "2025-10-12T10:00:00Z",
    "updatedAt": "2025-10-12T10:00:00Z",
    "lastLoginAt": "2025-10-12T10:00:00Z"
  }
}
```

**Zodスキーマ**: `getUserResponseSchema`

**エラー（404 Not Found）**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "ユーザーが見つかりません"
  }
}
```

#### OpenAPI定義

```yaml
/users/{id}:
  get:
    summary: ユーザー情報取得
    description: ユーザーIDでユーザー情報を取得
    tags:
      - Users
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        description: ユーザーID（UUID v4）
        schema:
          type: string
          format: uuid
    responses:
      '200':
        description: ユーザー情報取得成功
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GetUserResponse'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '404':
        $ref: '#/components/responses/NotFound'
```

### GET /users

ユーザー一覧を取得する（ページネーション対応）。

#### リクエスト

**ヘッダー**:
```http
Authorization: Bearer <JWT_TOKEN>
```

**クエリパラメータ**:

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|------------|-----|------|-----------|------|
| `provider` | `"google" \| "apple" \| ...` | - | - | プロバイダーフィルター |
| `limit` | `number (1-100)` | - | `20` | 取得件数 |
| `offset` | `number (≥0)` | - | `0` | オフセット |

**Zodスキーマ**: `listUsersQuerySchema`

#### レスポンス

**成功（200 OK）**:
```json
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
        "createdAt": "2025-10-12T10:00:00Z",
        "updatedAt": "2025-10-12T10:00:00Z",
        "lastLoginAt": "2025-10-12T10:00:00Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "externalId": "testuser2",
        "provider": "github",
        "email": "user2@example.com",
        "name": "User 2",
        "avatarUrl": "https://example.com/avatar2.jpg",
        "createdAt": "2025-10-11T10:00:00Z",
        "updatedAt": "2025-10-11T10:00:00Z",
        "lastLoginAt": "2025-10-11T10:00:00Z"
      }
    ],
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

**Zodスキーマ**: `listUsersResponseSchema`

#### OpenAPI定義

```yaml
/users:
  get:
    summary: ユーザー一覧取得
    description: ユーザー一覧を取得（ページネーション対応）
    tags:
      - Users
    security:
      - BearerAuth: []
    parameters:
      - name: provider
        in: query
        description: プロバイダーフィルター
        schema:
          $ref: '#/components/schemas/AuthProvider'
      - name: limit
        in: query
        description: 取得件数（1-100）
        schema:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
      - name: offset
        in: query
        description: オフセット
        schema:
          type: integer
          minimum: 0
          default: 0
    responses:
      '200':
        description: ユーザー一覧取得成功
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ListUsersResponse'
      '401':
        $ref: '#/components/responses/Unauthorized'
```

### PUT /users/{id}

ユーザー情報を更新する（名前・アバターURL）。

#### リクエスト

**ヘッダー**:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**パスパラメータ**:

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `id` | `string (UUID)` | ユーザーID |

**ボディ**:
```json
{
  "name": "New User Name",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**Zodスキーマ**: `updateUserBodySchema`

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `name` | `string (min: 1)` | - | ユーザー名 |
| `avatarUrl` | `string (url)` | - | アバターURL |

#### レスポンス

**成功（200 OK）**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "externalId": "1234567890",
    "provider": "google",
    "email": "user@example.com",
    "name": "New User Name",
    "avatarUrl": "https://example.com/new-avatar.jpg",
    "createdAt": "2025-10-12T10:00:00Z",
    "updatedAt": "2025-10-12T11:00:00Z",
    "lastLoginAt": "2025-10-12T10:00:00Z"
  }
}
```

**Zodスキーマ**: `updateUserResponseSchema`

**エラー（400 Bad Request）**:
```json
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

**エラー（404 Not Found）**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "ユーザーが見つかりません"
  }
}
```

#### OpenAPI定義

```yaml
/users/{id}:
  put:
    summary: ユーザー情報更新
    description: ユーザー名・アバターURLを更新
    tags:
      - Users
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        description: ユーザーID（UUID v4）
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UpdateUserBody'
    responses:
      '200':
        description: ユーザー情報更新成功
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserResponse'
      '400':
        $ref: '#/components/responses/BadRequest'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '404':
        $ref: '#/components/responses/NotFound'
```

## ドキュメントエンドポイント

### GET /api/docs

Swagger UIでOpenAPI仕様書を表示する（開発環境のみ）。

#### リクエスト

**ヘッダー**: なし（認証不要）

#### レスポンス

**成功（200 OK）**:
- Swagger UI HTML（インタラクティブなAPI仕様書）

**制約**:
- 開発環境（`NODE_ENV=development`）でのみ有効
- 本番環境では `404 Not Found` を返却

#### OpenAPI定義

```yaml
/api/docs:
  get:
    summary: OpenAPI仕様書（Swagger UI）
    description: インタラクティブなAPI仕様書を表示（開発環境のみ）
    tags:
      - Documentation
    responses:
      '200':
        description: Swagger UI HTML
        content:
          text/html:
            schema:
              type: string
```

## OpenAPIスキーマコンポーネント

### 共通スキーマ

```yaml
components:
  schemas:
    AuthProvider:
      type: string
      enum:
        - google
        - apple
        - microsoft
        - github
        - facebook
        - line
      description: 認証プロバイダー種別

    User:
      type: object
      required:
        - id
        - externalId
        - provider
        - email
        - name
        - createdAt
        - updatedAt
      properties:
        id:
          type: string
          format: uuid
          description: ユーザーID（UUID v4）
        externalId:
          type: string
          description: 外部認証プロバイダーでのユーザーID
        provider:
          $ref: '#/components/schemas/AuthProvider'
        email:
          type: string
          format: email
          description: メールアドレス（RFC 5321準拠）
        name:
          type: string
          minLength: 1
          description: ユーザー名
        avatarUrl:
          type: string
          format: uri
          nullable: true
          description: アバターURL
        createdAt:
          type: string
          format: date-time
          description: 作成日時（タイムゾーン付き）
        updatedAt:
          type: string
          format: date-time
          description: 更新日時（タイムゾーン付き）
        lastLoginAt:
          type: string
          format: date-time
          nullable: true
          description: 最終ログイン日時

    AuthCallbackRequest:
      type: object
      required:
        - externalId
        - provider
        - email
        - name
      properties:
        externalId:
          type: string
          minLength: 1
          description: 外部認証プロバイダーでのユーザーID
        provider:
          $ref: '#/components/schemas/AuthProvider'
        email:
          type: string
          format: email
          description: メールアドレス
        name:
          type: string
          minLength: 1
          description: ユーザー名
        avatarUrl:
          type: string
          format: uri
          description: アバターURL

    UpdateUserBody:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          description: ユーザー名
        avatarUrl:
          type: string
          format: uri
          description: アバターURL

    ErrorResponse:
      type: object
      required:
        - success
        - error
      properties:
        success:
          type: boolean
          enum: [false]
          description: 処理失敗フラグ
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              description: エラーコード
            message:
              type: string
              description: エラーメッセージ
            details:
              type: object
              additionalProperties: true
              description: エラー詳細（省略可）

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        Supabase Authで発行されたJWTトークン（RS256/ES256非対称鍵で署名）
        バックエンドはJWKS検証により署名を検証:
        - JWTヘッダーから kid を取得
        - Supabase JWKS エンドポイントから公開鍵セットを取得
        - kid に対応する公開鍵で署名検証

  responses:
    Unauthorized:
      description: JWKS検証エラー（JWT署名不正・有効期限切れ・kidが見つからない等）
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            success: false
            error:
              code: UNAUTHORIZED
              message: JWKS検証に失敗しました

    NotFound:
      description: リソースが見つからない
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            success: false
            error:
              code: NOT_FOUND
              message: リソースが見つかりません

    BadRequest:
      description: バリデーションエラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            success: false
            error:
              code: VALIDATION_ERROR
              message: バリデーションエラー
              details:
                name: ユーザー名は1文字以上である必要があります
```

## フロントエンド実装例

### 型安全なAPIクライアント

```typescript
// app/client/src/lib/api.ts
import type { paths } from '@/types/api/generated';
import { createClient } from 'openapi-fetch';

const client = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});

export { client };
```

### React Queryフック

```typescript
// app/client/src/hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api';

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

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { name?: string; avatarUrl?: string }) => {
      const { data, error } = await client.PUT('/users/{id}', {
        params: { path: { id: userId } },
        body,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
  });
}
```

## まとめ

この API 仕様書は以下の特徴を持つ：

1. **OpenAPI 3.1 準拠**: 自動生成されたスキーマと完全一致
2. **Zod バリデーション**: 実行時の型安全性を保証
3. **TypeScript 型安全**: フロントエンドで自動生成された型を使用
4. **JWKS 認証**: Supabase Auth との統合（RS256/ES256非対称鍵による署名検証）
5. **エラーハンドリング**: 詳細なエラーコードとメッセージ

**Single Source of Truth**: Drizzle ORM → Drizzle Zod → Zod → OpenAPI → TypeScript
**型安全性の保証**: コンパイル時（TypeScript） + 実行時（Zod）
**認証セキュリティ**: JWKS検証（公開鍵による署名検証、鍵ローテーション対応）
