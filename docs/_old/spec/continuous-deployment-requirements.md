# 継続的デプロイフロー 要件定義書

作成日：2025年09月12日
最終更新：2025年10月05日  


## 概要

GitHub Actions と Terraform を使用した継続的デプロイフローを構築し、フロントエンドを CloudFlare Pages、バックエンドを AWS Lambda Function URL、データベースマイグレーションを drizzle-kit で運用する統合デプロイメントシステムを実現する。

## ユーザストーリー

### ストーリー1: 開発者としての自動デプロイ

- **である** 開発者 **として**
- **私は** コードをmainブランチにプッシュするだけで、全サービス（フロント・API・DB）が安全かつ自動的にデプロイされる **をしたい**
- **そうすることで** 手動デプロイの手間を削減し、デプロイエラーによる障害リスクを最小化できる

### ストーリー2: チームリーダーとしての品質保証

- **である** チームリーダー **として**
- **私は** PRごとにプレビュー環境が自動生成され、安全なデプロイフローで制御される **をしたい**
- **そうすることで** 安全なリリースプロセスを確保し、本番環境への影響を最小化できる

### ストーリー3: 開発者としての基本監視

- **である** 開発者 **として**
- **私は** Production環境のLambda関数エラーを検知できる **をしたい**
- **そうすることで** 本番障害を早期発見し、迅速に対応できる

## 機能要件（EARS記法）

### 通常要件

- REQ-001: システムは mainブランチへのプッシュ時に自動的に継続的デプロイフローを開始しなければならない
- REQ-002: システムは Terraform による基盤構築を最優先で実行しなければならない
- REQ-003: システムは drizzle-kit によるデータベースマイグレーションを基盤構築後に実行しなければならない
- REQ-004: システムは AWS Lambda Function URL デプロイをマイグレーション完了後に実行しなければならない
- REQ-005: システムは CloudFlare Pages デプロイを Lambda デプロイ完了後に実行しなければならない
- REQ-006: システムは GitHub OIDC を使用したシークレットレス認証を実装しなければならない
- REQ-007: システムは drizzle-kit push によるマイグレーション実行（production環境）を行わなければならない
- REQ-008: システムは 本番環境では drizzle-kit push による直接スキーマ適用を行わなければならない

### 条件付き要件

- REQ-101: プルリクエスト作成・更新時の場合、システムは 単一の共有プレビュー環境（CloudFlare Preview + Lambda Function URL Preview + PostgreSQL `app_projectname_preview` schema）を上書き更新しなければならない
- REQ-102: Terraform plan で破壊的変更が検出された場合、システムは 詳細ログ出力と確認ステップを実行し、自動継続しなければならない
- REQ-103: マイグレーション実行時にDBロックが発生した場合、システムは タイムアウト設定に従って処理を中止しなければならない
- REQ-104: mainブランチマージ時の場合、システムは プロダクション環境（CloudFlare Production + Lambda Function URL Production + PostgreSQL `app_projectname` schema）を自動更新しなければならない

### 状態要件

- REQ-201: デプロイ実行中の状態にある場合、システムは 重複実行を防止し待機キューに登録しなければならない

### オプション要件

- オプション要件はない

### 制約要件

- REQ-401: システムは GitHub OIDC統合ロール設計（単一ロールでProduction/Preview両対応）を実装し、環境別アクセス制御による最小権限制御を行わなければならない
- REQ-402: システムは シークレット情報をソースコードに含めてはならない
- REQ-403: システムは drizzle-kit によるデータベースマイグレーションでのロールバック非対応（Forward-onlyポリシー）を遵守しなければならない
- REQ-404: システムは Terraform state を単一ファイルで管理し、環境は変数による論理分離を実装しなければならない
- REQ-405: システムは 環境別Lambda関数による完全分離（Preview専用関数、Production専用関数）を実装し、各々にFunction URLを設定して独立したHTTPSエンドポイントによる環境分離を行わなければならない
- REQ-406: システムは Lambda Function URL による直接HTTP接続を実装し、API Gatewayを使用せずシンプルで確実なエンドポイント提供を行わなければならない
- REQ-407: システムは drizzle-kit設定でDATABASE_URL直接接続を使用し、Supabase Access Tokenに依存しない自律的なマイグレーション実行を行わなければならない
- REQ-408: システムは PostgreSQLスキーマ分離による環境分離を実装し、BASE_SCHEMA環境変数（production: `app_projectname`、preview: `app_projectname_preview`）によるスキーマベース環境分離を行い、全PRで単一のpreviewスキーマを共有・上書き更新しなければならない
- REQ-409: システムは JWKS (JSON Web Key Set) による非対称鍵暗号認証を実装し、HS256共有秘密鍵に依存しない高セキュリティ認証を行わなければならない
- REQ-410: システムは Lambda関数のstableエイリアス自動管理を実装し、エイリアス存在確認による冪等なデプロイを行わなければならない
- REQ-411: システムは monorepo構成でのshared-schemas依存関係を適切に管理し、ビルド時の依存関係不足を防止しなければならない
- REQ-412: システムは IAMポリシーによる最小権限制御を実装し、Lambda関数のバージョン・エイリアス管理に必要な権限のみを付与しなければならない
- REQ-413: システムは プレビュー環境のリソース削除を実装してはならず、削除失敗によるリソース増殖リスクを回避するため、全PRで同一リソースを上書き利用する方針を採用しなければならない
- REQ-414: システムは CloudFlare Pagesのpreview deployment管理をCloudFlare側の自動管理に委ねなければならない

## 非機能要件

### セキュリティ

- NFR-001: GitHub OIDC + 単一IAM統合ロール（環境別アクセス制御による最小権限制御）による認証を実装すること
- NFR-002: Terraform state ファイルを暗号化ストレージ（S3+KMS）に保存すること  
- NFR-003: PostgreSQL Row-Level Security（RLS）を必須とすること
- NFR-004: TruffleHogによるSecret Scanning と Semgrep軽量ルールによるSASTを有効化し、機密情報漏洩と基本的な脆弱性を防止すること（重要度別ゲーティング: High/Critical検出時はCI失敗、Medium/Low検出時は警告継続）
- NFR-005: Fork リポジトリからのプルリクエストでは Preview 環境を生成・更新してはならない
- NFR-006: JWT検証は JWKS エンドポイントからの動的公開鍵取得による RS256/ES256 非対称鍵暗号を使用し、共有秘密鍵に依存しないセキュアな認証を実装すること

### 監視

- NFR-007: Production Lambda関数のエラー率と実行時間を監視すること

## Edgeケース

### インフラストラクチャエラー

- EDGE-001: AWS API制限超過時は自動retry（最大3回）を実行
- EDGE-002: Terraform state ロック競合時は手動で `terraform force-unlock` を実行

### データベース関連

- EDGE-101: マイグレーション中の長時間トランザクションはSupabase Dashboardで手動確認

### 認証・認可エラー

- EDGE-201: GitHub OIDC トークン期限切れ時はワークフロー再実行

## 受け入れ基準

### 基盤構築テスト

- [ ] Terraform による AWS、CloudFlare リソース作成が成功すること
- [ ] 単一GitHub OIDC統合ロール認証でAWS/CloudFlareアクセスが成功すること
- [ ] 環境別アクセス制御による最小権限制御が適切に機能すること
- [ ] Secrets 管理が Repository-level で環境分離されて動作すること

### デプロイフローテスト

- [ ] main ブランチマージでProduction環境が自動更新されること
- [ ] PR作成・更新で共有Preview環境が上書き更新されること
- [ ] Lambda Function URLでProduction/Preview環境が正常動作すること
- [ ] drizzle-kitマイグレーションが成功すること

### セキュリティテスト

- [ ] TruffleHog Secret Scanningが動作すること
- [ ] Semgrep SASTが動作すること
- [ ] Fork PRでPreview環境が生成されないこと
- [ ] GitHub OIDC認証が動作すること

### 監視テスト

- [ ] Production Lambda監視（エラー率・実行時間）が動作すること
