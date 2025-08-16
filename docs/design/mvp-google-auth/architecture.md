# MVP Google認証 アーキテクチャ設計

作成日: 2025-08-12
更新日: 2025-08-16

## システム概要

SupabaseとGoogle OAuthを使用したフロントエンド（Next.js）・バックエンドAPI（Hono）分離型の認証システム。バックエンドにDDD + クリーンアーキテクチャを適用し、学習効果を最大化する実装。

### 主要コンポーネント
- **フロントエンド**: JWT取得・認証状態管理
- **バックエンドAPI**: JWT検証・ユーザードメイン管理
- **外部サービス**: Supabase Auth・Google OAuth 2.0

## アーキテクチャパターン

### 全体アーキテクチャ
- **パターン**: フロントエンド・バックエンド分離 + DDD + クリーンアーキテクチャ
- **理由**: 
  - 関心の分離による保守性向上
  - DDDによるビジネスロジックの明確化
  - 依存性逆転による外部サービス変更への柔軟性
  - プロバイダー非依存の認証アーキテクチャ実現

### DDD戦略設計
- **ドメイン**: 認証・ユーザー管理ドメイン
- **境界づけられたコンテキスト**: 
  - 認証コンテキスト（Authentication Context）
  - ユーザー管理コンテキスト（User Management Context）

## コンポーネント構成

### フロントエンド（Next.js）
- **フレームワーク**: Next.js 15 + TypeScript
- **状態管理**: Redux
- **認証ライブラリ**: @supabase/supabase-js
- **スタイリング**: Tailwind CSS
- **主要機能**:
  - Google OAuth フロー実行
  - JWT取得・保存
  - 認証状態管理
  - バックエンドAPI通信

### バックエンド（Hono API）
- **フレームワーク**: Hono 4
- **認証方式**: JWT検証（Supabase JWT Secret）
- **アーキテクチャ**: DDD + クリーンアーキテクチャ
- **データベース**: PostgreSQL

#### DDD層構造

##### Presentation層（Interface Adapters）
- **責務**: HTTP要求・応答の変換、入力検証
- **コンポーネント**:
  - `AuthController`: 認証関連のHTTPエンドポイント
  - `UserController`: ユーザー情報取得エンドポイント
  - `AuthMiddleware`: JWT検証ミドルウェア
  - `ErrorHandler`: 例外・エラー処理

##### Application層（Use Cases）
- **責務**: ビジネスフローの調整、トランザクション管理
- **コンポーネント**:
  - `AuthenticateUserUseCase`: JWT検証→ユーザー取得・作成
  - `GetUserProfileUseCase`: 認証済みユーザー情報取得
  - `LogoutUserUseCase`: ログアウト処理
  - `ApplicationService`: 横断的関心事の調整

##### Domain層（Entities & Business Logic）
- **責務**: ビジネスルール・不変条件の管理
- **コンポーネント**:
  - `UserEntity`: ユーザーエンティティ（ID、email、name、プロバイダー情報）
  - `UserAggregate`: ユーザー作成・更新の整合性管理
  - `AuthenticationDomainService`: 認証ビジネスロジック
  - `UserRepository`: ユーザー永続化の抽象化
  - `AuthProvider`: 認証プロバイダーの抽象化

##### Infrastructure層（External Dependencies）
- **責務**: 外部システム・データベースとの連携
- **コンポーネント**:
  - `PostgreSQLUserRepository`: ユーザーデータ永続化実装
  - `SupabaseAuthProvider`: JWT検証・ユーザー情報取得実装
  - `DatabaseConnection`: DB接続管理
  - `EnvironmentConfig`: 環境設定管理

### データベース（PostgreSQL + Supabase）
- **DBMS**: PostgreSQL（Supabase DB）
- **接続方式**: Transaction Pooler（port: 6543）- サーバーレス環境最適化
- **テーブル設計**: プロバイダー非依存・拡張可能設計
- **接頭辞対応**: 環境変数による動的テーブル名
- **インデックス戦略**: email・external_idによる高速検索

## 依存関係管理

### 依存性の方向
```
Presentation → Application → Domain ← Infrastructure
```

### 依存性逆転の適用箇所
- `Domain/UserRepository` ← `Infrastructure/PostgreSQLUserRepository`
- `Domain/AuthProvider` ← `Infrastructure/SupabaseAuthProvider`
- `Application/UseCase` → `Domain/Repository`（抽象化に依存）

### DI（依存性注入）戦略
- **コンテナ**: 軽量DIコンテナ使用
- **ライフサイクル**: シングルトン・リクエストスコープ管理
- **設定**: 環境変数ベースの設定注入

## プロバイダー拡張戦略

### 現在のプロバイダー
- Google OAuth 2.0（Supabase経由）

### 将来対応予定プロバイダー
- Apple Sign In、Microsoft Azure AD、GitHub OAuth、Facebook Login、LINE Login

### 拡張設計原則
- **開放閉鎖の原則**: 新規プロバイダー追加時、既存コードの変更最小化
- **プロバイダー抽象化**: `AuthProvider`インターフェースによる統一
- **ドメイン独立性**: User Entityはプロバイダー固有情報を直接保持しない
- **設定駆動**: プロバイダー固有設定は環境変数・設定ファイルで管理

## セキュリティアーキテクチャ

### 認証フロー
1. フロントエンドでGoogle OAuth実行
2. SupabaseからJWT取得
3. バックエンドでJWT検証
4. JITプロビジョニング実行
5. ユーザー情報返却

### セキュリティ原則
- **最小権限の原則**: 必要最小限のスコープでアクセス
- **防御の深層化**: JWT検証・RLS・HTTPS通信の多層防御
- **データ最小化**: 必要最小限のユーザー情報のみ保存
- **監査可能性**: 将来の拡張で認証ログ対応予定

## パフォーマンス設計

### レスポンス時間目標
- 認証フロー: 10秒以内
- JWT検証: 1秒以内  
- JITプロビジョニング: 2秒以内

### 最適化戦略
- **データベースインデックス**: email・external_idの複合インデックス
- **JWT検証**: メモリ内署名検証
- **コネクションプール**: サーバーレス環境最適化（max: 2接続、短縮アイドルタイムアウト）
- **Transaction Pooler**: Supabaseの接続プーリングでDB接続効率化
- **キャッシュ戦略**: 将来拡張でユーザー情報キャッシュ対応予定

## サーバーレス環境対応

### Transaction Pooler最適化
- **接続数制限**: max 2接続（サーバーレス関数のスケールアウトに対応）
- **タイムアウト短縮**: idleTimeoutMillis 5秒（短時間実行モデルに最適化）
- **プロセス終了制御**: allowExitOnIdle設定でLambda等での適切な終了を保証
- **エラーハンドリング**: 接続エラー時のプロセス終了で障害の連鎖を防止

### 将来のサーバーレス展開予定
- **AWS Lambda**: イベント駆動型の認証処理
- **Cloudflare Workers**: エッジでの高速JWT検証
- **Google Cloud Run**: コンテナベースの自動スケール
- **Vercel Functions**: Next.jsとの統合最適化

## 開発・運用考慮事項

### 学習効果の最大化
- **実装時間**: 4時間以内（DDD学習込み）
- **層分離**: 各層の責務明確化
- **コード品質**: SOLID原則準拠
- **テスタビリティ**: 単体テスト・結合テスト対応

### 運用性
- **設定管理**: 環境変数による外部化
- **ログ**: 構造化ログ出力
- **エラーハンドリング**: 適切な例外処理・ユーザーフレンドリーメッセージ
- **監視**: 将来拡張でヘルスチェック・メトリクス対応予定
