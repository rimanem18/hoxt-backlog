# TDD要件定義・機能仕様：TASK-201 認証コントローラー実装

**作成日**: 2025-08-23  
**機能名**: mvp-google-auth  
**タスクID**: TASK-201  
**タスクタイプ**: TDD  

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🟢 **HttpAuthControllerクラスの実装**: Presentation層でのHTTPリクエスト・レスポンスの変換処理を行う認証コントローラー
- 🟢 **POST /api/auth/verify エンドポイント**: JWT検証・ユーザー認証を実行するRESTfulエンドポイント  
- 🟢 **AuthenticateUserUseCaseとの連携**: Application層のユーザー認証UseCaseを呼び出し、ビジネスロジックを実行
- 🟢 **HTTPエラーハンドリング**: ドメインエラーを適切なHTTPステータスコード・エラーレスポンスに変換
- 🟢 **システム内での位置づけ**: DDD + クリーンアーキテクチャのPresentation層として、外部インターフェース（HTTP API）を提供
- 🟢 **想定されるユーザー**: フロントエンド（Next.js）から送信されるJWT検証リクエストを処理
- **参照したEARS要件**: REQ-002（バックエンドはJWTを検証してユーザー認証を行わなければならない）、REQ-407（Presentation層の実装要件）
- **参照した設計文書**: architecture.md Presentation層セクション、api-endpoints.md POST /api/auth/verify仕様

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 入力パラメータ
- 🟢 **HTTPリクエスト形式**: `POST /api/auth/verify`
- 🟢 **Content-Type**: `application/json` (必須)
- 🟢 **リクエストボディ**:
  ```typescript
  {
    token: string; // Supabase Auth発行のJWT（必須、非空文字列）
  }
  ```
- 🟢 **バリデーション制約**: 
  - `token`フィールドの存在確認
  - `token`が空文字列でないこと
  - JSONパース可能であること

### 出力値
- 🟢 **成功レスポンス（200 OK）**:
  ```typescript
  {
    success: true,
    data: {
      user: User, // interfaces.ts User型に準拠
      isNewUser: boolean // JITプロビジョニング実行フラグ
    }
  }
  ```
- 🟢 **エラーレスポンス形式**:
  ```typescript
  {
    success: false,
    error: {
      code: string, // "INVALID_TOKEN" | "AUTHENTICATION_REQUIRED" | "INTERNAL_SERVER_ERROR"
      message: string, // ユーザー向けエラーメッセージ（日本語）
      details?: string // 開発者向け詳細情報（オプション）
    }
  }
  ```
- 🟢 **HTTPステータスコード**: 200（成功）、400（不正リクエスト）、401（認証エラー）、500（サーバーエラー）

### 入出力の関係性
- 🟢 **JWTトークン → AuthenticateUserUseCase → ユーザー情報**: 有効なJWTから認証済みユーザー情報を取得・作成
- 🟢 **ドメインエラー → HTTPエラー**: `AuthenticationError`→401、`ValidationError`→400、その他→500

### データフロー  
- **参照したEARS要件**: REQ-002、REQ-004（JITプロビジョニング）
- **参照した設計文書**: interfaces.ts VerifyTokenRequest/Response型定義、dataflow.md アプリケーション層認証処理フロー

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### パフォーマンス要件
- 🟢 **レスポンス時間**: 1000ms以内（JITプロビジョニング処理含む）- NFR-002, api-endpoints.md
- 🟢 **同時リクエスト処理**: 100リクエスト/分まで対応可能（將来のレート制限準備）

### セキュリティ要件  
- 🟢 **HTTPS通信必須**: 本番環境でのHTTPS通信のみ許可 - NFR-101
- 🟢 **入力検証**: Zodスキーマによる厳格なリクエストデータ検証
- 🟢 **エラー情報秘匿**: セキュリティ上重要な詳細情報は開発環境でのみ露出

### アーキテクチャ制約
- 🟢 **Honoフレームワーク使用**: REQ-402 バックエンドフレームワーク制約
- 🟢 **Presentation層の責務遵守**: HTTPリクエスト/レスポンス変換に限定、ビジネスロジック不含
- 🟢 **依存性逆転原則**: Application層（UseCase）にのみ依存、Infrastructure層に直接依存禁止
- 🟢 **JSON形式レスポンス**: api-endpoints.md統一レスポンス形式準拠

### API制約
- 🟢 **RESTful設計**: POST /api/auth/verify の単一責任（JWT検証・認証のみ）
- 🟢 **Content-Type制約**: application/json以外は400エラー
- 🟢 **CORS対応**: フロントエンド（localhost:3000、本番ドメイン）からのアクセス許可

- **参照したEARS要件**: NFR-001, NFR-002, REQ-402, REQ-407
- **参照した設計文書**: architecture.md セキュリティ・パフォーマンス設計

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 基本的な使用パターン
- 🟢 **既存ユーザーの認証**: フロントエンドからの有効JWT送信→既存ユーザー情報返却
- 🟢 **新規ユーザーのJIT作成**: 初回ログインでのJWT送信→ユーザー作成→新規ユーザー情報返却  
- 🟢 **認証状態の確認**: ページリロード時のJWT再検証→認証状態復元

### データフロー
- 🟢 **正常フロー**: HTTPリクエスト受信→入力検証→UseCase呼び出し→結果変換→JSONレスポンス
- 🟢 **JITプロビジョニングフロー**: JWT検証成功→ユーザー不存在→新規作成→`isNewUser: true`返却

### エッジケース
- 🟢 **無効JWT**: EDGE-002対応 - JWT検証失敗時の401エラー・「認証トークンが無効です」メッセージ
- 🟢 **JSON不正**: リクエストボディJSONパースエラー時の400エラー・「リクエスト形式が不正です」メッセージ  
- 🟢 **必須フィールド不存在**: tokenフィールド不存在時の400エラー・「トークンが必要です」メッセージ
- 🟡 **サーバー内部エラー**: DB接続エラー等の未処理例外時の500エラー・「一時的にサービスが利用できません」メッセージ

### エラーケース
- 🟢 **EDGE-002適用**: JWT検証失敗→401 Unauthorized→フロントエンドでログイン画面表示
- 🟢 **EDGE-003適用**: バックエンド内部エラー→500 Internal Server Error→「APIサーバーとの通信に失敗しました」
- 🟡 **ネットワークタイムアウト**: 1000ms超過時のリクエスト打ち切り・適切なエラーハンドリング

- **参照したEARS要件**: EDGE-002, EDGE-003
- **参照した設計文書**: dataflow.md エラーフローハンドリング、api-endpoints.md エラーレスポンス仕様

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- **ストーリー2**: ログイン済みユーザーとしてバックエンドAPIから自分のユーザー情報を取得して画面に表示される

### 参照した機能要件
- **REQ-002**: バックエンドはJWTを検証してユーザー認証を行わなければならない
- **REQ-004**: システムはJIT（Just-In-Time）プロビジョニングでユーザー作成を行わなければならない
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
- JWT検証を正常に実行できる
- ユーザー情報を取得して画面に表示される  
- ページリロード後も認証状態が維持される

### 参照した設計文書
- **アーキテクチャ**: architecture.md Presentation層（Interface Adapters）セクション
- **データフロー**: dataflow.md アプリケーション層での認証処理フロー
- **型定義**: interfaces.ts VerifyTokenRequest/Response, ApiResponse, AuthenticateUserUseCaseInput/Output
- **API仕様**: api-endpoints.md POST /api/auth/verify エンドポイント詳細仕様

## 品質判定結果

✅ **高品質**:
- **要件の曖昧さ**: なし（EARS要件定義書とAPI仕様で明確に定義）
- **入出力定義**: 完全（TypeScript型定義で厳密に仕様化）  
- **制約条件**: 明確（パフォーマンス・セキュリティ・アーキテクチャ制約すべて定義済み）
- **実装可能性**: 確実（依存するTASK-105完了済み、使用技術スタック確定済み）

**次のお勧めステップ**: `/tdd-testcases` でテストケースの洗い出しを行います。