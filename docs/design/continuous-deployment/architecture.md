# 継続的デプロイメントシステム アーキテクチャ設計

作成日: 2025年09月12日
最終更新: 2025年09月23日


## システム概要

GitHub Actions、Terraform、GitHub OIDC認証を活用した継続的デプロイメントシステム。フロントエンド（CloudFlare Pages）、バックエンド（AWS Lambda）、データベース（drizzle-kit + PostgreSQL）の統合デプロイメントを自動化し、セキュリティと運用効率を両立する。

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
- **ツール**: Terraform
- **状態管理**: AWS S3 + KMS暗号化
- **実行制御**: plan → approval → apply の段階実行
- **破壊的変更**: 手動承認フロー必須

### フロントエンド
- **フレームワーク**: Next.js 15 (SSG)
- **プラットフォーム**: CloudFlare Pages
- **デプロイ方式**: GitHub Actions ビルド + CloudFlare Pages API
- **環境分離**: main (production) / PR (preview)
- **API連携**: Hono Lambda API との HTTP 通信

### バックエンド
- **フレームワーク**: Hono 4 + AWS Lambda adapter
- **プラットフォーム**: AWS Lambda (Node.js 22.x) - 環境別関数分離
- **ビルド**: `bun run build:lambda` で lambda.js 生成
- **デプロイ**: GitHub Actions + Lambda ZIP package
- **認証方式**: JWKS (JSON Web Key Set) による非対称鍵暗号認証
- **環境管理**: 環境別Lambda関数（Preview専用関数、Production専用関数による完全分離）
- **エンドポイント**: Lambda Function URL - 直接HTTPS接続（API Gateway不使用）
- **バージョン管理**: stableエイリアス（本番）+ $LATESTバージョン（プレビュー）
- **依存関係**: monorepo shared-schemas パッケージ管理

### データベース
- **サービス**: Supabase PostgreSQL
- **ORM**: Drizzle ORM + drizzle-kit
- **マイグレーション**: drizzle-kit generate + PostgreSQL直接実行
- **接続方式**: DATABASE_URL直接接続（Supabase Access Token不要）
- **環境分離**: PostgreSQLスキーマによる分離
  - Production: `${BASE_SCHEMA}`（例: `projectname`）
  - Preview: `${BASE_SCHEMA}_preview`（例: `projectname_preview`）
  - Terraform連携: Terraformがスキーマ名を環境変数として設定
- **セキュリティ**: Row-Level Security (RLS) 必須

### セキュリティ
- **認証**: 単一GitHub OIDC 統合ロールによる一元認証
- **ブランチ制限**: mainブランチ・PR のみアクセス許可（feature/develop等ブランチ無効化）
- **権限管理**: Repository-level Secrets + 環境別アクセス制御による最小権限制御（Production/Preview共通ロール）
- **シークレット管理**: Repository Secrets + 共通設定統合による管理負荷軽減
- **監査**: CloudTrail + GitHub Actions logs

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
- **承認**: Terraform 破壊的変更時のみ
- **監視**: 基本ログ収集（実行者・日時・対象）

### Preview環境
- **トリガー**: PR 作成・更新
- **データベース**: 同一Supabaseプロジェクト内で `${TABLE_PREFIX}_dev_*` テーブル使用
- **リソース**: CloudFlare Preview + Lambda Preview 関数 + Function URL（PR close で自動削除）
- **制限**: Terraform は read-only plan のみ
- **注意**: テーブルは上書き型（複数PRで共有、競合の可能性あり）

## エラーハンドリング

### AWS API 制限
- **戦略**: 指数バックオフ再試行
- **最大回数**: 5回
- **タイムアウト**: 30秒/回

### Terraform State ロック
- **検出**: 10分間の待機タイムアウト
- **解決**: 手動介入オプション提供
- **予防**: concurrency groups による排他制御

### データベースマイグレーション
- **方針**: Forward-only（ロールバック非対応）
- **長時間実行**: 管理者アラート + 手動介入
- **失敗時**: プロセス全体停止

## 運用・監査

### ログ記録
- **対象**: デプロイ実行者・日時・対象サービス
- **保存先**: GitHub Actions logs + CloudTrail
- **保持期間**: 90日間

### Secret Scanning
- **範囲**: 全リポジトリファイル
- **対象**: AWS keys, API tokens, certificates
- **アクション**: push ブロック + 通知

### アクセス制御
- **GitHub**: Organization owner / Repository admin
- **AWS**: 単一GitHub OIDC 統合 IAM role（Environment条件による最小権限制御）
- **CloudFlare**: API token（ページ管理権限のみ）
- **Supabase**: Service role（マイグレーション権限）
