# API エンドポイント仕様

作成日: 2025-08-12
更新日: 2025-08-12

## API設計原則

### RESTful設計
- **リソースベース**: `/users`, `/auth` などのリソース中心設計
- **HTTPメソッド**: GET（取得）、POST（作成）、PUT（更新）、DELETE（削除）
- **ステータスコード**: 適切なHTTPステータスコード使用
- **統一レスポンス**: 成功・エラーレスポンスの形式統一

### セキュリティ
- **JWT認証**: `Authorization: Bearer {token}` ヘッダー必須
- **HTTPS通信**: すべての通信でHTTPS使用
- **入力検証**: リクエストデータの厳格な検証
- **レート制限**: API呼び出し頻度制限（将来対応）

### DDD + クリーンアーキテクチャ対応
- **Presentation層**: HTTPコントローラー
- **Application層**: UseCaseとの連携
- **エラーハンドリング**: ドメインエラーのHTTPエラー変換

---

## 共通仕様

### ベースURL
```
Development: http://localhost:3001/api
Production:  https://api.<production-domain>/api
```

### 共通ヘッダー
```http
Content-Type: application/json
Authorization: Bearer {jwt_token}  # 認証が必要なエンドポイントのみ
```

### 共通レスポンス形式

#### 成功レスポンス
```json
{
  "success": true,
  "data": {
    // レスポンスデータ
  }
}
```

#### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "ユーザー向けエラーメッセージ",
    "details": "開発者向け詳細情報（オプション）"
  }
}
```

### エラーコード一覧
| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `AUTHENTICATION_REQUIRED` | 401 | 認証が必要 |
| `INVALID_TOKEN` | 401 | JWTトークンが無効 |
| `TOKEN_EXPIRED` | 401 | JWTトークンの有効期限切れ |
| `USER_NOT_FOUND` | 404 | ユーザーが存在しない |
| `INVALID_REQUEST` | 400 | リクエストデータが不正 |
| `INTERNAL_SERVER_ERROR` | 500 | サーバー内部エラー |
| `PROVIDER_ERROR` | 502 | 外部プロバイダーエラー |

---

## 認証関連エンドポイント

### JWT検証・ユーザー認証

#### `POST /api/auth/verify`

**概要**: JWTトークンを検証し、ユーザー情報を取得・作成（JITプロビジョニング）

**リクエスト**:
```http
POST /api/auth/verify
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**リクエストボディスキーマ**:
```json
{
  "token": "string (required) - Supabase Auth発行のJWTトークン"
}
```

**成功レスポンス (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "externalId": "google_123456789",
      "provider": "google",
      "email": "user@example.com",
      "name": "山田太郎",
      "avatarUrl": "https://lh3.googleusercontent.com/a/avatar.jpg",
      "createdAt": "2025-08-12T10:30:00.000Z",
      "updatedAt": "2025-08-12T10:30:00.000Z",
      "lastLoginAt": "2025-08-12T13:45:00.000Z"
    },
    "isNewUser": false
  }
}
```

**エラーレスポンス**:
```json
// 401 Unauthorized - 無効なJWT
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "認証トークンが無効です",
    "details": "JWT signature verification failed"
  }
}

// 502 Bad Gateway - Supabase接続エラー
{
  "success": false,
  "error": {
    "code": "PROVIDER_ERROR", 
    "message": "認証サービスとの接続に失敗しました"
  }
}
```

**Use Case**: `AuthenticateUserUseCase`
**処理フロー**:
1. JWT署名検証（Supabase）
2. JWTペイロードからユーザー情報抽出
3. `external_id` + `provider` でユーザー検索
4. 未存在の場合、JITプロビジョニング実行
5. `lastLoginAt` 更新
6. ユーザー情報返却

---

## ユーザー関連エンドポイント

### ユーザープロフィール取得

#### `GET /api/user/profile`

**概要**: 認証済みユーザーのプロフィール情報を取得

**リクエスト**:
```http
GET /api/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**成功レスポンス (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "externalId": "google_123456789",
    "provider": "google", 
    "email": "user@example.com",
    "name": "山田太郎",
    "avatarUrl": "https://lh3.googleusercontent.com/a/avatar.jpg",
    "createdAt": "2025-08-12T10:30:00.000Z",
    "updatedAt": "2025-08-12T10:30:00.000Z",
    "lastLoginAt": "2025-08-12T13:45:00.000Z"
  }
}
```

**エラーレスポンス**:
```json
// 401 Unauthorized - 認証必要
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "ログインが必要です"
  }
}

// 404 Not Found - ユーザー不存在（通常発生しない）
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "ユーザーが見つかりません"
  }
}
```

**Use Case**: `GetUserProfileUseCase`
**処理フロー**:
1. Authorization ヘッダーからJWT抽出
2. JWT検証・ユーザーID取得
3. ユーザー情報取得
4. プロフィール情報返却

---

## システム関連エンドポイント

### ヘルスチェック

#### `GET /api/health`

**概要**: APIサーバーの稼働状態確認

**リクエスト**:
```http
GET /api/health
```

**成功レスポンス (200 OK)**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-08-12T13:45:00.000Z",
    "version": "1.0.0",
    "dependencies": {
      "database": "healthy",
      "supabase": "healthy"
    }
  }
}
```

**エラーレスポンス (503 Service Unavailable)**:
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "サービスが一時的に利用できません",
    "details": "Database connection failed"
  }
}
```

---

## Middleware仕様

### 認証ミドルウェア

#### `AuthMiddleware`

**適用エンドポイント**: 
- `GET /api/user/profile`
- その他認証が必要なエンドポイント（将来追加）

**処理フロー**:
1. `Authorization` ヘッダー存在確認
2. `Bearer {token}` 形式検証
3. JWT署名・有効期限検証
4. ユーザー情報をリクエストコンテキストに設定
5. 次のミドルウェア・コントローラーに処理移行

**エラーハンドリング**:
```json
// ヘッダー不存在
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "認証ヘッダーが必要です"
  }
}

// 不正な形式
{
  "success": false, 
  "error": {
    "code": "INVALID_TOKEN",
    "message": "認証トークンの形式が不正です"
  }
}
```

### エラーハンドリングミドルウェア

#### `ErrorHandlerMiddleware`

**機能**: 
- ドメインエラーのHTTPエラー変換
- 未処理例外のキャッチ・ログ出力
- ユーザーフレンドリーなエラーメッセージ生成

**変換ルール**:
| ドメインエラー | HTTPステータス | エラーコード |
|---------------|---------------|-------------|
| `AuthenticationError` | 401 | `AUTHENTICATION_REQUIRED` |
| `JwtValidationError` | 401 | `INVALID_TOKEN` |
| `UserNotFoundError` | 404 | `USER_NOT_FOUND` |
| `InvalidProviderError` | 400 | `INVALID_REQUEST` |
| その他の例外 | 500 | `INTERNAL_SERVER_ERROR` |

---

## パフォーマンス仕様

### レスポンス時間目標
- **GET /api/user/profile**: 500ms以内
- **POST /api/auth/verify**: 1000ms以内（JIT処理含む）
- **GET /api/health**: 100ms以内

### レート制限（将来実装）
- **認証エンドポイント**: 10回/分/IPアドレス
- **ユーザーエンドポイント**: 100回/分/ユーザー
- **ヘルスチェック**: 制限なし

### キャッシュ戦略（将来実装）
- **JWT検証結果**: メモリキャッシュ（有効期限まで）
- **ユーザー情報**: Redis キャッシュ（5分間）

---

## セキュリティ考慮事項

### CORS設定
```javascript
{
  origin: [
    "http://localhost:3000",  // Development
    "https://<production_domain>" // Production
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}
```

### セキュリティヘッダー
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### 入力検証
- **JSONスキーマ**: Zod による実行時型検証
- **SQLインジェクション対策**: パラメータ化クエリ使用
- **XSS対策**: 出力時エスケープ処理

---

## テストケース

### 正常系テスト
- [x] JWT検証成功・既存ユーザー取得
- [x] JWT検証成功・JITプロビジョニング
- [x] ユーザープロフィール取得成功
- [x] ヘルスチェック成功

### 異常系テスト  
- [x] 無効なJWTトークン
- [x] 期限切れJWTトークン
- [x] 認証ヘッダー不存在
- [x] データベース接続エラー
- [x] Supabase接続エラー

### パフォーマンステスト
- [x] 同時100リクエスト処理
- [x] レスポンス時間計測
- [x] メモリ使用量監視

---

## API仕様変更履歴

### v1.0.0 (2025-08-12)
- 初期API仕様策定
- 認証・ユーザー関連エンドポイント定義
- セキュリティ・パフォーマンス仕様確定

### 将来予定される変更
- `/api/auth/logout` エンドポイント追加（セッション管理強化時）
- `/api/user/profile` PUT メソッド追加（プロフィール編集機能）
- `/api/admin/*` 管理者向けエンドポイント追加
- API バージョニング対応（`/api/v2/*`）
