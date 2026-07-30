# MVP Google認証 バックエンド実装タスク

作成日: 2025-08-30
更新日: 2025-08-30

## 概要

バックエンド担当タスク: 11タスク（TASK-001〜TASK-203）
推定作業時間: 2.5時間以内（DDD学習込み）
クリティカルパス: TASK-001 → TASK-002 → TASK-101 → TASK-102 → TASK-201

## アーキテクチャ概要

- **DDD + クリーンアーキテクチャ**: ドメイン層を中心とした設計
- **技術スタック**: Hono 4 API + PostgreSQL + Supabase認証
- **依存性注入**: DIコンテナによる疎結合実現

## タスク一覧

### フェーズ1: 基盤構築

#### TASK-001: データベース初期設定

- [x] **タスク完了**
- **タスクタイプ**: DIRECT
- **要件リンク**: データベーススキーマ設計書
- **依存タスク**: なし
- **実装詳細**:
  - PostgreSQLコンテナの起動確認
  - 環境変数 `DB_TABLE_PREFIX` の設定
  - `database-schema.sql` の実行
  - users テーブル・インデックス・トリガーの作成
- **完了条件**:
  - [x] `${DB_TABLE_PREFIX}users` テーブルが作成されている
  - [x] インデックスが全て作成されている
  - [x] RLSが有効化されている

#### TASK-002: バックエンド環境設定

- [x] **タスク完了**
- **タスクタイプ**: DIRECT
- **要件リンク**: バックエンド技術スタック
- **依存タスク**: TASK-001
- **実装詳細**:
  - Supabase JWT Secret の環境変数設定
  - 必要な npm（bun） パッケージのインストール
  - TypeScript設定の確認
  - ヘルスチェックエンドポイントの実装
- [x] **環境変数設定**（.env）
- **完了条件**:
  - [x] サーバーが `http://localhost:3001` で起動する
  - [x] `GET /api/health` エンドポイントが200を返す
- **確認コマンド**:
  ```bash
  docker compose exec server bun run dev
  curl http://localhost:3001/api/health
  ```

### フェーズ2: Domain層実装（DDD）

#### TASK-101: ドメインエンティティ・値オブジェクト実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **要件リンク**: interfaces.ts, architecture.md
- **依存タスク**: TASK-002
- **実装詳細**:
  - `User` エンティティクラスの実装
  - `AuthProvider` 型定義
  - `CreateUserInput`・`UpdateUserInput` 値オブジェクト
  - ドメインエラークラス群の実装
- **ファイル構成**:
  ```
  app/server/src/domain/
  └── user/
      ├── valueobjects/
      │    ├── CreateUserInput.ts
      │    └──UpdateUserInput.ts
      ├── errors/
      │   ├── UserNotFoundError.ts
      │   └── InvalidProviderError.ts
      ├── AuthProvider.ts
      ├── UserEntity.ts
      └── index.ts
  ```
- **単体テスト要件**:
  - [x] User エンティティのバリデーションテスト
  - [x] 各値オブジェクトの生成・検証テスト
  - [x] ドメインエラーの適切な継承・プロパティテスト

#### TASK-102: リポジトリ・サービスインターフェース実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **要件リンク**: interfaces.ts, DDD設計
- **依存タスク**: TASK-101
- **実装詳細**:
  - `IUserRepository` インターフェース
  - `IAuthProvider` インターフェース
  - `IAuthenticationDomainService` インターフェース
  - ドメインサービスの実装
- **ファイル構成**:
  ```
  app/server/src/domain/
  ├── repositories/
  │   └── IUserRepository.ts
  ├── services/
  │   ├── IAuthProvider.ts
  │   ├── IAuthenticationDomainService.ts
  │   └── AuthenticationDomainService.ts
  └── aggregates/
      └── UserAggregate.ts
  ```
- **単体テスト要件**:
  - [x] AuthenticationDomainService のJITプロビジョニングテスト
  - [x] UserAggregate の整合性管理テスト

### フェーズ3: Infrastructure層実装

#### TASK-103: PostgreSQLリポジトリ実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **要件リンク**: database-schema.sql, IUserRepository
- **依存タスク**: TASK-102
- **実装詳細**:
  - `PostgreSQLUserRepository` クラス実装
  - データベース接続管理
  - SQL クエリの実装（CRUD操作）
  - エラーハンドリング
- **ファイル構成**:
  ```
  app/server/src/infrastructure/
  ├── database/
  │   ├── DatabaseConnection.ts
  │   └── PostgreSQLUserRepository.ts
  └── config/
      └── EnvironmentConfig.ts
  ```
- **実装メソッド**:
  - `findByExternalId(externalId, provider)`
  - `findById(id)`
  - `findByEmail(email)` 
  - `create(input)`
  - `update(id, input)`
  - `delete(id)`
- **統合テスト要件**:
  - [x] データベース接続テスト
  - [x] CRUD操作の正常系テスト
  - [x] 制約違反・エラーハンドリングテスト

#### TASK-104: Supabase認証プロバイダー実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **要件リンク**: IAuthProvider, JWT検証仕様
- **依存タスク**: TASK-102
- **実装詳細**:
  - `SupabaseAuthProvider` クラス実装
  - JWT署名検証ロジック
  - JWTペイロードからのユーザー情報抽出
  - Supabase API連携エラーハンドリング
- **ファイル構成**:
  ```
  app/server/src/infrastructure/
  └── auth/
      └── SupabaseAuthProvider.ts
  ```
- **実装メソッド**:
  - `verifyToken(token)`: JWT検証
  - `getExternalUserInfo(payload)`: ユーザー情報抽出
- **統合テスト要件**:
  - [x] 有効なJWTでの検証成功テスト
  - [x] 無効なJWTでの検証失敗テスト
  - [x] 期限切れJWTでのエラーテスト

### フェーズ4: Application層実装（Use Cases）

#### TASK-105: ユーザー認証UseCase実装

- [x] **タスク完了** ✅ **完了** (TDD開発完了 - 11テストケース全通過)
- **タスクタイプ**: TDD
- **要件リンク**: interfaces.ts, 認証フロー仕様
- **依存タスク**: TASK-103, TASK-104
- **実装詳細**:
  - `AuthenticateUserUseCase` クラス実装
  - JWT検証→ユーザー取得・作成のフロー
  - JITプロビジョニングの実行
  - トランザクション管理
- **ファイル構成**:
  ```
  app/server/src/application/
  ├── usecases/
  │   └── AuthenticateUserUseCase.ts
  └── services/
      └── ApplicationService.ts
  ```
- **処理フロー**:
  1. JWT署名検証（SupabaseAuthProvider）
  2. JWTペイロードからユーザー情報抽出
  3. `external_id` + `provider` でユーザー検索
  4. 未存在の場合、JITプロビジョニング実行
  5. `lastLoginAt` 更新
  6. ユーザー情報返却
- **単体テスト要件**:
  - [x] 既存ユーザーの認証成功テスト
  - [x] 新規ユーザーのJIT作成テスト
  - [x] JWT検証失敗でのエラーテスト

#### TASK-106: ユーザープロフィール取得UseCase実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **要件リンク**: interfaces.ts, API仕様
- **依存タスク**: TASK-103
- **実装詳細**:
  - `GetUserProfileUseCase` クラス実装
  - ユーザーIDによる情報取得
  - 認証済みユーザーのプロフィール返却
- **ファイル構成**:
  ```
  app/server/src/application/
  └── usecases/
      └── GetUserProfileUseCase.ts
  ```
- **単体テスト要件**:
  - [x] 存在するユーザーIDでの取得成功テスト
  - [x] 存在しないユーザーIDでのエラーテスト

### フェーズ5: Presentation層実装（HTTP API）

#### TASK-201: 認証コントローラー実装

- [x] **タスク完了** ✅ **完了** (TDD開発完了 - 14テストケース全通過)
- **タスクタイプ**: TDD
- **要件リンク**: api-endpoints.md, Hono技術仕様
- **依存タスク**: TASK-105
- **実装詳細**:
  - `AuthController` クラス実装
  - `POST /api/auth/verify` エンドポイント
  - HTTPリクエスト・レスポンスの変換
  - エラーハンドリング
- **ファイル構成**:
  ```
  app/server/src/presentation/
  ├── controllers/
  │   └── AuthController.ts
  ├── middleware/
  │   ├── AuthMiddleware.ts
  │   └── ErrorHandlerMiddleware.ts
  └── routes/
      └── authRoutes.ts
  ```
- **エンドポイント実装**:
  - `POST /api/auth/verify`: JWT検証・ユーザー認証
- **レスポンス形式**:
  ```json
  {
    "success": true,
    "data": {
      "user": { /* User情報 */ },
      "isNewUser": false
    }
  }
  ```
- **統合テスト要件**:
  - [x] 正常なJWTでの認証成功レスポンス
  - [x] 無効なJWTでの401エラーレスポンス
  - [x] リクエスト形式不正での400エラーレスポンス

#### TASK-202: ユーザーコントローラー実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **要件リンク**: api-endpoints.md, 認証ミドルウェア仕様
- **依存タスク**: TASK-106, TASK-201
- **実装詳細**:
  - `UserController` クラス実装
  - `GET /api/user/profile` エンドポイント
  - 認証ミドルウェアの適用
  - JWT検証後のユーザー情報取得
- **ファイル構成**:
  ```
  app/server/src/presentation/
  ├── controllers/
  │   └── UserController.ts
  └── routes/
      └── userRoutes.ts
  ```
- **エンドポイント実装**:
  - `GET /api/user/profile`: 認証済みユーザーのプロフィール取得
- **認証要件**:
  - `Authorization: Bearer {JWT}` ヘッダー必須
  - AuthMiddleware による事前検証
- **統合テスト要件**:
  - [x] 有効なJWTでのプロフィール取得成功
  - [x] Authorizationヘッダー不存在での401エラー
  - [x] 無効なJWTでの401エラー

#### TASK-203: システム系エンドポイント実装

- [x] **タスク完了** ✅ **完了** (2025-08-27 14:00 JST) - ヘルスチェックエンドポイント実装・DI統合・品質確認完了
- **タスクタイプ**: DIRECT
- **要件リンク**: api-endpoints.md, ヘルスチェック仕様
- **依存タスク**: TASK-002
- **実装詳細**:
  - `GET /api/health` エンドポイント実装
  - データベース接続確認
  - Supabase接続確認
  - システム稼働状態の返却
- **レスポンス形式**:
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "timestamp": "2025-08-14T10:31:50.000Z",
      "version": "1.0.0",
      "dependencies": {
        "database": "healthy",
        "supabase": "healthy"
      }
    }
  }
  ```
- **完了条件**:
  - [x] ヘルスチェックが正常時200を返す
  - [x] DB接続失敗時503を返す
  - [x] Supabase接続失敗時503を返す

## セキュリティ要件

### JWT検証
- 署名検証の実装
- 期限切れトークンの適切な処理
- 不正なペイロードの検証

### データベースセキュリティ
- SQLインジェクション対策（パラメータ化クエリ）
- Row Level Security (RLS) の活用
- 最小権限の原則

### 入力検証
- Zod による実行時型チェック
- 適切なエラーハンドリング
- セキュリティヘッダーの設定

## 完了確認コマンド

```bash
# 型チェック
docker compose exec server bunx tsc --noEmit

# テスト実行
docker compose exec server bun test

# 静的解析
docker compose exec server bunx biome check .

# サーバー起動確認
docker compose exec server bun run dev
curl http://localhost:3001/api/health
```

## トラブルシューティング

### JWT検証エラー
- **原因**: Supabase JWT Secret の設定間違い
- **対処**: 環境変数の確認・再設定

### データベース接続エラー  
- **原因**: PostgreSQLコンテナの起動失敗
- **対処**: `docker compose logs db` でログ確認

### ビルドエラー
- **原因**: TypeScript型エラー・依存関係問題
- **対処**: `bunx tsc --noEmit` で型エラー確認

---

**次のステップ**: バックエンド実装完了後は、フロントエンドタスクとの連携テストを実施します。