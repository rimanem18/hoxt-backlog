# TDD要件定義・機能仕様：TASK-201 認証エンドポイント完全実装【改訂版】

**作成日**: 2025-08-24  
**機能名**: mvp-google-auth  
**タスクID**: TASK-201  
**タスクタイプ**: TDD  
**状態**: 🔴 **不完全実装** - HTTPエンドポイントとして利用不可

## 🚨 改訂の背景

**従来の課題**: AuthControllerクラスとテストは実装済みだが、**HTTPエンドポイントとして実際に利用できない状態**

**実装されているもの**:
- 🟢 AuthController.ts（102行、完全実装）
- 🟢 AuthController.test.ts（14テスト、全てpass）  
- 🟢 バリデーター系クラス（HttpRequestValidator, JwtTokenValidator等）
- 🟢 ResponseService（レスポンス統一処理）

**不足しているもの**:
- 🔴 authRoutes.ts（HTTPルート定義）
- 🔴 routes/index.ts への統合
- 🔴 server/index.ts への統合

## 1. 機能の概要（改訂版）

- 🟢 **AuthControllerクラス**: ✅ 実装済み - JWT検証・ユーザー認証処理
- 🔴 **POST /api/auth/verify エンドポイント**: ❌ 未統合 - HTTPルートとして利用不可
- 🟢 **AuthenticateUserUseCaseとの連携**: ✅ 実装済み - Application層との適切な連携  
- 🟢 **HTTPエラーハンドリング**: ✅ 実装済み - 401/400/500エラーの適切な変換
- 🔴 **サーバー統合**: ❌ 未実装 - Honoサーバーにルートが登録されていない
- 🟢 **想定されるユーザー**: フロントエンド（Next.js）からのJWT検証リクエスト処理

- 🟢 **参照したEARS要件**: REQ-002（JWT検証要件）、REQ-407（Presentation層実装）
- 🟢 **参照した設計文書**: architecture.md Presentation層、api-endpoints.md

## 2. 入力・出力の仕様（変更なし）

### HTTP エンドポイント
- 🔴 **HTTPエンドポイント**: `POST /api/auth/verify` ❌ 未統合
- 🟢 **Content-Type**: `application/json` ✅ バリデーター実装済み
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

### レスポンス形式  
- 🟢 **成功レスポンス（200 OK）**: ✅ ResponseService実装済み
  ```typescript
  {
    success: true,
    data: {
      user: User, // interfaces.ts User型に準拠
      isNewUser: boolean // JITプロビジョニング実行フラグ
    }
  }
  ```
- 🟢 **エラーレスポンス形式**: ✅ ResponseService実装済み
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

## 3. 制約条件（変更なし）

### パフォーマンス要件
- 🟢 **レスポンス時間**: 1000ms以内（JITプロビジョニング処理含む）- NFR-002, api-endpoints.md
- 🟢 **同時リクエスト処理**: 100リクエスト/分まで対応可能（將来のレート制限準備）

### セキュリティ要件  
- 🟢 **HTTPS通信必須**: 本番環境でのHTTPS通信のみ許可 - NFR-101
- 🟢 **入力検証**: Zodスキーマによる厳格なリクエストデータ検証
- 🟢 **エラー情報秘匿**: セキュリティ上重要な詳細情報は開発環境でのみ露出

### アーキテクチャ制約
- 🟢 **Honoフレームワーク**: AuthController は Hono Context 対応実装済み - REQ-402
- 🔴 **RESTful API**: ルート定義が存在せず、RESTfulエンドポイントとして利用不可
- 🟢 **依存性逆転原則**: ✅ 実装済み - Application層（UseCase）にのみ依存、Infrastructure層に直接依存禁止
- 🟢 **JSON形式レスポンス**: api-endpoints.md統一レスポンス形式準拠

### API制約
- 🔴 **RESTful設計**: POST /api/auth/verify の単一責任（JWT検証・認証のみ）- ルートが未定義
- 🟢 **Content-Type制約**: application/json以外は400エラー ✅ バリデーター実装済み
- 🔴 **CORS対応**: フロントエンド（localhost:3000、本番ドメイン）からのアクセス許可 - 未統合

- **参照したEARS要件**: NFR-001, NFR-002, REQ-402, REQ-407
- **参照した設計文書**: architecture.md セキュリティ・パフォーマンス設計

## 4. 新規追加要件（HTTPエンドポイント統合）

### 4.1 authRoutes.ts 実装要件
- 🔴 **ファイル位置**: `app/server/src/presentation/http/routes/authRoutes.ts`
- 🔴 **実装パターン**: greetRoutes.ts と同じパターンを踏襲
- 🔴 **エンドポイント定義**: `POST /auth/verify`
- 🔴 **AuthController連携**: 依存性注入による AuthController.verifyToken 呼び出し
- 🔴 **UseCase統合**: AuthenticateUserUseCaseのインスタンス作成と注入
- 🔴 **エラーハンドリング**: AuthController内のエラーハンドリングに委譲

### 4.2 ルート統合要件
- 🔴 **routes/index.ts**: auth ルートの export 追加
- 🔴 **server/index.ts**: `app.route('/api', auth)` でのマウント
- 🔴 **ミドルウェア**: CORS対応（既存のcorsMiddleware利用）
- 🔴 **ルート順序**: 既存のgreet, healthルートと同じ形式で追加

### 4.3 統合テスト要件
- 🔴 **実HTTPリクエストテスト**: 実際のサーバー起動での動作確認
- 🔴 **ルーティングテスト**: `/api/auth/verify` への POST リクエスト成功確認
- 🔴 **CORS対応確認**: フロントエンドからの接続確認
- 🔴 **既存テスト互換性**: AuthController.test.ts の全テスト継続実行

### 4.4 依存性解決要件
- 🔴 **UseCase注入**: AuthenticateUserUseCaseの適切なインスタンス作成
- 🔴 **Repository注入**: IUserRepositoryの具体実装注入
- 🔴 **AuthProvider注入**: IAuthProviderの具体実装（SupabaseAuthProvider）注入
- 🔴 **設定管理**: 環境変数からの設定値注入

## 5. 想定される使用例（変更なし）

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

## 6. EARS要件・設計文書との対応関係（追加）

### 参照したユーザストーリー
- **ストーリー2**: ログイン済みユーザーとしてバックエンドAPIから自分のユーザー情報を取得して画面に表示される

### 参照した機能要件
- **REQ-002**: バックエンドはJWTを検証してユーザー認証を行わなければならない
- **REQ-004**: システムはJIT（Just-In-Time）プロビジョニングでユーザー作成を行わなければならない
- **REQ-402**: バックエンドはHono フレームワークを使用しなければならない
- **REQ-407**: バックエンドは以下の層構造を実装しなければならない（Presentation層の実装）

### 新規追加要件
- **REQ-408**: HTTPエンドポイントとしての完全統合が必要
- **REQ-409**: ルーティング設定による RESTful API の提供が必要
- **REQ-410**: サーバー起動時のエンドポイント利用可能性確保が必要

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

### 参照した既存実装
- **greetRoutes.ts**: 同様のルート定義パターン
- **server/index.ts**: 既存のルートマウントパターン  
- **corsMiddleware**: 既存のCORS設定パターン

## 品質判定結果

🟡 **要改善**:
- **実装完了度**: 70% - AuthController は完成、HTTPエンドポイント統合が未完了
- **利用可能性**: ❌ - 実際にHTTPリクエストを送信できない状態
- **要件遵守**: 部分的 - クラス実装は完了、エンドポイント要件未達成
- **実装可能性**: 確実 - 既存パターンの適用で統合可能

## 改訂された実装計画

### Phase 1: HTTPエンドポイント統合
1. **authRoutes.ts の実装**
   - greetRoutes.ts パターンに基づく実装
   - AuthController の適切な依存性注入
   - AuthenticateUserUseCase の適切なインスタンス作成
   
2. **サーバー統合**
   - routes/index.ts への auth export 追加
   - server/index.ts への auth ルートマウント

### Phase 2: 統合テスト
1. **実サーバーでの動作確認**
2. **フロントエンドからの接続テスト**
3. **既存テストとの整合性確認**

### Phase 3: 品質保証
1. **型チェック実行**: `docker compose exec server bunx tsc --noEmit`
2. **全テスト実行**: 既存テストの継続実行確認
3. **統合テスト**: 実HTTPリクエストでの動作確認

**次のお勧めステップ**: `/tdd-testcases` で統合テストケースの追加定義、または `/tdd-red` で実装フェーズに直接進みます。