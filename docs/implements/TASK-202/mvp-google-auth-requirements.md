# TDD要件定義・機能仕様：TASK-202 ユーザーコントローラー実装

**作成日**: 2025-08-25  
**機能名**: mvp-google-auth  
**タスクID**: TASK-202  
**タスクタイプ**: TDD  

## 事前準備完了

✅ **TDD関連ファイルの読み込み**・コンテキスト準備完了

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

🟢 **青信号**: EARS要件定義書・設計文書から詳細仕様を参照して推測なしで抽出

- **何をする機能か**: 認証済みユーザーのプロフィール情報を取得するHTTP APIエンドポイントを提供するPresentation層コントローラー
- **どのような問題を解決するか**: フロントエンド（Next.js）が認証されたユーザーの詳細情報（名前、メールアドレス、アバター画像等）をセキュアに取得し、画面に表示するためのHTTP API基盤を提供
- **想定されるユーザー**: Google OAuth認証済みのアプリケーション利用者（フロントエンドアプリケーション経由）
- **システム内での位置づけ**: DDD + クリーンアーキテクチャのPresentation層（Interface Adapters）に位置し、HTTP要求・応答の変換、認証ミドルウェア適用、Application層（GetUserProfileUseCase）との連携を担う
- **参照したEARS要件**: REQ-005（バックエンドAPIは認証済みユーザーのプロフィール情報を返却しなければならない）、REQ-407（Presentation層の実装要件）
- **参照した設計文書**: architecture.md Presentation層の責務定義、api-endpoints.md GET /api/user/profile仕様

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

🟢 **青信号**: interfaces.ts、api-endpoints.mdから型定義とAPI仕様を完全抽出

### HTTP エンドポイント
- **HTTPエンドポイント**: `GET /api/user/profile`
- **認証方式**: `Authorization: Bearer {JWT}` ヘッダー必須（AuthMiddleware適用）
- **Content-Type**: レスポンスは `application/json`

### リクエスト仕様
```http
GET /api/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### レスポンス形式（成功時）
```typescript
// 200 OK
{
  success: true,
  data: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    externalId: "google_123456789",
    provider: "google",
    email: "user@example.com",
    name: "山田太郎",
    avatarUrl: "https://lh3.googleusercontent.com/a/avatar.jpg",
    createdAt: "2025-08-12T10:30:00.000Z",
    updatedAt: "2025-08-12T10:30:00.000Z",
    lastLoginAt: "2025-08-12T13:45:00.000Z"
  }
}
```

### エラーレスポンス形式
```typescript
// 401 Unauthorized - 認証必要
{
  success: false,
  error: {
    code: "AUTHENTICATION_REQUIRED",
    message: "ログインが必要です"
  }
}

// 404 Not Found - ユーザー不存在（通常発生しない）
{
  success: false,
  error: {
    code: "USER_NOT_FOUND", 
    message: "ユーザーが見つかりません"
  }
}
```

### 入出力の関係性
- JWTトークン（Authorization ヘッダー） → AuthMiddleware → ユーザーID抽出 → GetUserProfileUseCase → User情報返却
- データフロー: JWT検証・ユーザーID取得 → UseCase実行 → HTTPレスポンス変換

**参照したEARS要件**: REQ-005、REQ-104（認証済みの場合の処理要件）
**参照した設計文書**: interfaces.ts GetUserProfileResponse、api-endpoints.md GET /api/user/profile仕様、dataflow.md ユーザープロフィール取得フロー

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

🟢 **青信号**: EARS非機能要件、アーキテクチャ設計から明確な制約を抽出

### パフォーマンス要件
- **レスポンス時間**: 500ms以内（api-endpoints.md性能仕様 - GET /api/user/profileの目標値）
- **同時リクエスト処理**: 100リクエスト/分/ユーザー（将来のレート制限準備 - api-endpoints.md）

### セキュリティ要件
- **HTTPS通信必須**: 本番環境でのHTTPS通信のみ許可（NFR-101）
- **JWT認証必須**: Authorization ヘッダーによるBearer Token検証必須（REQ-002）
- **認可チェック**: AuthMiddlewareによるJWT検証・ユーザー情報のコンテキスト設定必須

### 互換性要件
- **フロントエンド連携**: Next.jsからのfetchAPI、axios等のHTTPクライアント対応（REQ-101、REQ-104）
- **CORS対応**: localhost:3000（開発環境）、本番ドメインからのアクセス許可（api-endpoints.md）

### アーキテクチャ制約
- **Honoフレームワーク**: UserController は Hono Context 対応実装必須（REQ-402）
- **依存性逆転原則**: Application層（GetUserProfileUseCase）にのみ依存、Infrastructure層に直接依存禁止（REQ-407）
- **RESTful API**: GET /api/user/profileの単一責任（認証済みユーザー情報取得のみ）
- **統一レスポンス形式**: api-endpoints.md共通レスポンス形式準拠

### データベース制約
- **読み取り専用**: プロフィール取得は読み取り専用操作、トランザクション分離レベル考慮（database-schema.sql）
- **インデックス活用**: users(id)プライマリキーインデックスによる高速検索

### API制約  
- **HTTPメソッド制限**: GET メソッドのみ対応
- **認証ミドルウェア**: AuthMiddleware適用によるJWT検証・エラーハンドリング
- **エラーハンドリング**: UserNotFoundError、AuthenticationError のHTTPエラー変換

**参照したEARS要件**: NFR-002（APIレスポンス時間）、NFR-101（HTTPS必須）、REQ-402（Hono使用）、REQ-407（層構造実装）
**参照した設計文書**: architecture.md セキュリティ・パフォーマンス設計、api-endpoints.md レスポンス時間目標・セキュリティ仕様、database-schema.sql インデックス戦略

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

🟢 **青信号**: dataflow.md、EARS Edgeケースから具体的なフローとエラーケースを抽出

### 基本的な使用パターン
```typescript
// フロントエンドからのAPIコール
const response = await fetch('/api/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  }
});
const result = await response.json();
// result.data にユーザー情報が格納される
```

### データフロー
1. **HTTPリクエスト受信**: GET /api/user/profile + Authorization ヘッダー
2. **認証ミドルウェア実行**: JWT検証・ユーザー情報コンテキスト設定
3. **UserController.getProfile実行**: UseCaseの呼び出し
4. **GetUserProfileUseCase実行**: ユーザー情報取得
5. **HTTPレスポンス変換**: User Entity → JSON形式のAPIレスポンス
6. **フロントエンド表示**: ユーザー情報の画面表示

### エッジケース
- **EDGE-001**: Authorizationヘッダー不存在 → AuthMiddleware が401エラー「ログインが必要です」
- **EDGE-002**: 無効・期限切れJWT → AuthMiddleware が401エラー「認証トークンが無効です」
- **EDGE-003**: ユーザー不存在（通常発生しない）→ GetUserProfileUseCase が UserNotFoundError → 404エラー「ユーザーが見つかりません」
- **EDGE-101**: ネットワーク通信エラー → フロントエンドで「APIサーバーとの通信に失敗しました」表示（EDGE-003対応）

### エラーケース
```typescript
// 認証エラー例
try {
  const response = await fetch('/api/user/profile', {
    headers: { /* Authorization ヘッダーなし */ }
  });
} catch (error) {
  // 401 Unauthorized レスポンス
  // フロントエンドでログイン画面にリダイレクト
}

// サーバー内部エラー例  
try {
  // データベース接続エラー等
} catch (error) {
  // 500 Internal Server Error
  // 「一時的にサービスが利用できません」メッセージ表示
}
```

**参照したEARS要件**: EDGE-002（JWT検証失敗エラー）、EDGE-003（API通信エラー）
**参照した設計文書**: dataflow.md ユーザープロフィール表示フロー、api-endpoints.md エラーレスポンス仕様

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- **ストーリー2**: 「ログイン済みユーザーとして、私はバックエンドAPIから自分のユーザー情報を取得して画面に表示されることを確認したい」

### 参照した機能要件
- **REQ-005**: バックエンドAPIは認証済みユーザーのプロフィール情報を返却しなければならない
- **REQ-104**: ユーザーが認証済みの場合、システムはユーザー情報とログアウトボタンを表示しなければならない
- **REQ-402**: バックエンドはHono フレームワークを使用しなければならない
- **REQ-407**: バックエンドは以下の層構造を実装しなければならない（Presentation層の実装）

### 参照した非機能要件
- **NFR-002**: バックエンドAPIの認証チェックは1秒以内に完了しなければならない
- **NFR-101**: すべての認証通信はHTTPS経由で行われなければならない
- **NFR-202**: 認証エラーは理解しやすい日本語で表示されなければならない

### 参照したEdgeケース
- **EDGE-002**: JWT検証失敗時はバックエンドが401エラーを返却する
- **EDGE-003**: バックエンドAPI通信エラー時は「APIサーバーとの通信に失敗しました」メッセージを表示する

### 参照した受け入れ基準
- ユーザー情報を取得して画面に表示される
- ページリロード後も認証状態が維持される
- モバイルデバイスでスムーズに認証できる

### 参照した設計文書
- **アーキテクチャ**: architecture.md Presentation層（Interface Adapters）の責務・依存関係管理
- **データフロー**: dataflow.md 2回目以降ログインフロー、ユーザープロフィール表示フロー
- **型定義**: interfaces.ts GetUserProfileResponse, User, AuthenticatedRequest
- **データベース**: database-schema.sql users テーブル定義・インデックス戦略
- **API仕様**: api-endpoints.md GET /api/user/profile エンドポイント詳細仕様・エラーハンドリング

## 品質判定結果

✅ **高品質**:
- **要件の曖昧さ**: なし（EARS要件定義書・設計文書から明確な仕様を抽出）
- **入出力定義**: 完全（TypeScript型定義・API仕様で厳密に定義）
- **制約条件**: 明確（パフォーマンス・セキュリティ・アーキテクチャ制約を明文化）
- **実装可能性**: 確実（依存するGetUserProfileUseCaseは実装済み、TASK-201のAuthControllerパターンを参考可能）

## 次のステップ

**次のお勧めステップ**: `/tdd-testcases` でテストケースの洗い出しを行います。