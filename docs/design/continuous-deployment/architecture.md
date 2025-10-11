# 継続的デプロイメントシステム アーキテクチャ設計

作成日: 2025年09月12日
最終更新: 2025年10月05日


## システム概要

GitHub Actions、Terraform、GitHub OIDC認証を活用した継続的デプロイメントシステム。フロントエンド（CloudFlare Pages）、バックエンド（AWS Lambda）、データベース（drizzle-kit + PostgreSQL）の統合デプロイメントを自動化し、セキュリティと運用効率を両立する。

## 設計原則

### セキュリティファースト
- 単一GitHub OIDC 統合ロールによる完全シークレットレス認証
- Repository-level Secrets + 環境別アクセス制御による最小権限制御
- Terraform state の S3+KMS 暗号化保存
- Secret Scanning による機密情報漏洩防止
- Fork PR からのSecrets アクセス制限

### 運用効率
- インフラ変更の破壊的検出と自動継続
- プレビュー環境の自動構築（スキーマ分離方式）
- 依存関係順序制御による安全なデプロイ
- GitHub Actionsログによる基本追跡
- TruffleHog（Secret検出）・Semgrep軽量ルール（基本SAST）によるセキュリティスキャン
- Discord通知による即座のデプロイ結果把握
- Production Lambda監視による障害早期検知

### コスト効率
- AWS Lambda Function URL による API Gateway 回避でのコスト削減
- 環境別Lambda関数分離による明確な責任分離
- 単一IAMロール・ポリシーによる管理コスト削減
- PostgreSQL スキーマ分離による環境分離（production/preview schema）
- Preview環境でのリソース共有による運用コスト最適化
- CloudFlare Pages 単一プロジェクト管理による構成最小化

### 拡張性
- モジュラー設計による保守性確保
- 環境別設定の明確な分離
- エラー処理・再試行戦略の標準化
- 段階的機能追加に対応した設計

## アーキテクチャパターン

- **パターン**: マイクロサービス指向 + Infrastructure as Code + GitOps
- **理由**: サービス独立性確保、インフラ変更の追跡可能性、Git中心の運用フローによる監査性向上

## システムアーキテクチャ図

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Developer     │    │   GitHub         │    │   Services      │
│                 │    │                  │    │                 │
│ git push main   │───▶│ GitHub Actions   │───▶│ CloudFlare Pages│
│ create PR       │    │ ├─ OIDC Auth     │    │ AWS Lambda      │
└─────────────────┘    │ ├─ Terraform     │    │ PostgreSQL      │
                       │ ├─ Test & Deploy │    │                 │
                       │ └─ Approval Flow │    └─────────────────┘
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Infrastructure   │
                       │ ├─ AWS S3 (State)│
                       │ ├─ AWS KMS       │
                       │ ├─ IAM Roles     │
                       │ └─ CloudFlare    │
                       └──────────────────┘
```

## コンポーネント構成

### CI/CDプラットフォーム
- **プラットフォーム**: GitHub Actions
- **認証方式**: GitHub OIDC（シークレットレス）
- **ワークフロー**: main push トリガー + PR preview
- **並列制御**: job dependency + concurrency groups

### Infrastructure as Code
- **ツール**: Terraform 1.6以上
- **状態管理**: AWS S3 + KMS暗号化
- **実行制御**: plan → approval → apply の段階実行
- **破壊的変更**: 手動承認フロー必須
- **モジュール構成**:
  - `iam-oidc`: GitHub OIDC Provider と統合IAM Role
  - `lambda-functions`: 環境別Lambda関数管理
  - `cloudflare-pages`: CloudFlare Pages 設定（単一プロジェクト管理）
  - `monitoring`: Production Lambda CloudWatch監視
- **変数管理**: `preview_schema_suffix`（`_preview`）、CORS設定（`access_allow_*`）、スキーマ名（`base_schema`）を環境変数で制御

### フロントエンド
- **フレームワーク**: Next.js 15以上 (SSG)
- **プラットフォーム**: CloudFlare Pages
- **デプロイ方式**: GitHub Actions ビルド + CloudFlare Pages Direct Upload API
- **環境分離**: main (production) / PR (preview) - 単一プロジェクト内でブランチ管理
- **単一プロジェクト戦略の理由**:
  - Terraform による統合管理を実現（複数プロジェクトは管理複雑化）
  - Production と Preview の構成同期を保証
  - 個人開発における最小構成で運用負荷を軽減
- **Direct Upload 採用理由**: GitHub 統合不使用により Terraform との一貫性を確保、デプロイタイミングの完全制御
- **API連携**: Hono Lambda API との HTTP 通信

### バックエンド
- **フレームワーク**: Hono 4以上 + AWS Lambda adapter
- **プラットフォーム**: AWS Lambda (Node.js 22以上) - 環境別関数分離
- **ビルド**: `bun run build:lambda` で lambda.js 生成
- **デプロイ**: GitHub Actions + Lambda ZIP package
- **認証方式**: JWKS (JSON Web Key Set) による非対称鍵暗号認証
- **環境管理**: 環境別Lambda関数（Preview専用関数、Production専用関数による完全分離）
- **エンドポイント**: Lambda Function URL - 直接HTTPS接続（API Gateway不使用によるコスト削減）
- **バージョン管理**: stableエイリアス（本番）+ $LATESTバージョン（プレビュー）
- **依存関係**: monorepo shared-schemas パッケージ管理

### データベース
- **サービス**: Supabase PostgreSQL
- **ORM**: Drizzle ORM + drizzle-kit
- **マイグレーション**: drizzle-kit generate + PostgreSQL直接実行
- **接続方式**: DATABASE_URL直接接続（Supabase Access Token不要）
- **環境分離**: PostgreSQLスキーマによる分離
  - Production: `${BASE_SCHEMA}`（例: `app_projectname`）
  - Preview: `${BASE_SCHEMA}_preview`（例: `app_projectname_preview`）
  - Terraform連携: Terraformが `preview_schema_suffix = "_preview"` を設定
  - スキーマ分離の利点:
    - 環境間の完全な論理分離（名前空間レベル）
    - PR Close時の一括削除が容易（`DROP SCHEMA app_projectname_preview CASCADE`）
    - 権限管理の簡素化（スキーマ単位で制御）
- **セキュリティ**: Row-Level Security (RLS) 必須

### セキュリティ
- **認証**: 単一GitHub OIDC 統合ロールによる一元認証
- **ブランチ制限**: mainブランチ・PR のみアクセス許可（feature/develop等ブランチ無効化）
- **権限管理**: Repository-level Secrets + 環境別アクセス制御による最小権限制御（Production/Preview共通ロール）
- **シークレット管理**: Repository Secrets + 共通設定統合による管理負荷軽減
  - **統合戦略**: Environment 別Secrets を廃止し Repository Secrets に集約
  - **効果**: 設定項目 60%削減、更新時の修正箇所を1箇所に統一
  - **OIDC制約**: IAM Role の Trust Policy で `repo:${owner}/${repo}:environment:production` 等を指定し、ブランチレベルでアクセス制御
- **監視**: Production Lambda CloudWatch監視（エラー率・実行時間）

## デプロイメント順序

1. **Infrastructure (Terraform)**
   - AWS リソース作成/更新
   - CloudFlare 設定
   - IAM ロール・ポリシー適用

2. **Database (drizzle-kit)**
   - drizzle-kit generate でマイグレーションファイル生成（本番環境）
   - drizzle-kit push による直接適用（開発・プレビュー環境）
   - RLS ポリシー適用
   - データ整合性確認

3. **Backend (AWS Lambda)**
   - shared-schemas依存関係インストール
   - JWKS認証設定でのビルド実行
   - 環境別Lambda関数コードデプロイ
   - バージョン発行とstableエイリアス管理（冪等）
   - Lambda Function URL 設定更新

4. **Frontend (CloudFlare Pages)**
   - shared-schemas依存関係インストール
   - Terraform出力値による環境変数設定
   - 静的ファイルビルド（Next.js SSG）
   - CloudFlare Pages デプロイ
   - DNS 設定確認

## 環境戦略

### Production環境
- **トリガー**: main ブランチへの push
- **承認**: Terraform 破壊的変更検出時は自動継続
- **監視**: CloudWatch Alarmsによる Lambda エラー・実行時間監視

### Preview環境
- **トリガー**: PR 作成・更新
- **データベース**: 全PRで単一の `app_projectname_preview` スキーマを共有・上書き更新
- **リソース**: CloudFlare Preview + Lambda Preview 関数 + Function URL（常に同一リソースを再利用）
- **制限**: Terraform は read-only plan のみ
- **注意**: 全PRで同一リソース共有のため、最後のPR更新内容が反映される（並行レビュー時は最新のみ有効）
- **削除方針**: リソース削除は実装せず、削除失敗によるリソース増殖リスクを回避
- **CloudFlare**: Preview deployment管理はCloudFlare側に委任

## エラーハンドリング

### AWS API 制限
- **戦略**: 自動retry（nick-fields/retry@v3）
- **最大回数**: 3回
- **タイムアウト**: 設定ごとに異なる

### Terraform State ロック
- **検出**: DynamoDB state locking
- **解決**: 手動で `terraform force-unlock` 実行
- **予防**: concurrency groups による排他制御

### データベースマイグレーション
- **方針**: Forward-only（ロールバック非対応）
- **長時間実行**: Supabase Dashboardで手動確認
- **失敗時**: プロセス全体停止

## 運用・監視

### ログ記録
- **対象**: デプロイ実行者・日時・対象サービス
- **保存先**: GitHub Actions logs + deployment-logger アクション
- **保持期間**: 90日間（GitHub Actionsアーティファクト）

### 監視
- **対象**: Production Lambda関数のみ
- **メトリクス**: エラー率（閾値: 5エラー/分）、実行時間（閾値: 10秒）
- **アラート**: CloudWatch Alarms
- **通知**: SNS Email通知（自動送信、SES・Lambda不要）
  - 設定: GitHub Repository Secret `OPS_EMAIL`
  - 初回のみメール購読確認リンククリック必要
  - アラーム発火時・復旧時に自動通知

### セキュリティスキャン（ミニマム構成）
- **Secret Scanning（TruffleHog）**:
  - 範囲: 全リポジトリファイル + Git履歴
  - 対象: AWS keys, API tokens, certificates, private keys
  - アクション: 検出時CI失敗（デプロイブロック）
- **SAST（Semgrep軽量ルール）**:
  - ルールセット: 公式推奨ルール（言語別`auto`設定）のみ
  - 重要度別ゲーティング: High/Critical検出でCI失敗、Medium/Low検出で警告継続
- **Fork PR制限**: 条件分岐による簡易制御（専用検証ロジックなし）
- **通知**: GitHub Actions標準のCI失敗通知のみ（個別通知設定なし）

### アクセス制御
- **GitHub**: Organization owner / Repository admin
- **AWS**: 単一GitHub OIDC 統合 IAM role（Environment条件による最小権限制御）
- **CloudFlare**: API token（ページ管理権限のみ）
- **Supabase**: Service role（マイグレーション権限）

## 実装ロードマップ

### フェーズ1: 統合基盤整備
- Terraform state管理用 S3・DynamoDB・KMS 作成
- 単一GitHub OIDC Provider・統合IAM Role 設定
- Repository Secrets 統合戦略の適用

### フェーズ2: 統合インフラ自動化
- 統合Terraform設定実装（単一state管理）
- 環境別AWS Lambda Function URL 構築
- CloudFlare Pages 単一プロジェクト設定

### フェーズ3: 統合CI/CD パイプライン
- GitHub Actions ワークフロー実装（統一ロール使用）
- デプロイ順序制御・エラーハンドリング
- ミニマムセキュリティスキャン統合（TruffleHog Secret検出 + Semgrep軽量ルール）
- Discord 通知設定

### フェーズ4: 監視・運用
- Production Lambda CloudWatch アラーム設定
- エラーハンドリング運用手順書作成

## 受け入れ基準

本システムは以下の受け入れ基準を満たします：

- ✅ **統合基盤構築**: Terraform・単一GitHub OIDC・統合IAM設定
- ✅ **統合デプロイフロー**: main push・PR プレビュー・順序制御
- ✅ **品質保証**: 破壊的変更検出・マイグレーション・待機キュー
- ✅ **基本ログ**: GitHub Actionsログ・Secret Scanning
- ✅ **エラーハンドリング**: 自動retry・手動対応手順
- ✅ **セキュリティ**: シークレットレス・暗号化・RLS設定
- ✅ **監視**: Production Lambda CloudWatch監視

## 次ステップ

1. **技術検証**: 統合設計内容の実装可能性検証
2. **段階実装**: 統合基盤→CI/CD→監視の順で段階的実装
3. **テスト**: 各受け入れ基準に対する動作確認
4. **運用開始**: 統合環境での継続的デプロイメント開始
