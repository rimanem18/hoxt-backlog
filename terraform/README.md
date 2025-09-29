# Terraform State分離アーキテクチャ

## 📁 ディレクトリ構造

```
terraform/
├── foundation/          # 基盤リソース（手動管理）
│   ├── main.tf         # ストレージ、ロック、暗号化、認証
│   ├── variables.tf    # 基盤用変数
│   ├── outputs.tf      # アプリが参照する値
│   └── versions.tf     # Provider設定
└── app/                # アプリリソース（CI/CD自動化）
    ├── main.tf         # 実行環境、フロントエンド
    ├── variables.tf    # アプリ用変数
    ├── outputs.tf      # 環境変数用出力
    └── versions.tf     # Provider設定
```

## 🔧 実行手順

### 1. 基盤リソースの初期設定（一度だけ）

```bash
# foundation用の実行
cd terraform/foundation

# 変数設定
cp ../terraform.tfvars ./

# 初期化と適用（管理者権限で）
terraform init
terraform plan
terraform apply
```

### 2. アプリリソースの管理（CI/CD）

```bash
# app用の実行
cd terraform/app

# 初期化（リモートバックエンド使用）
terraform init \
  -backend-config="bucket=${PROJECT_NAME}-terraform-state" \
  -backend-config="key=app/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=${PROJECT_NAME}-terraform-locks"

# 計画と適用
terraform plan
terraform apply
```

## 🎯 権限分離の効果

### **Foundation（基盤）**
- **管理者**: ローカル実行
- **目的**: CI/CDの土台作り
- **権限**: 認証、ストレージ、暗号化等の強力な権限
- **頻度**: 設定変更時のみ

### **App（アプリケーション）**
- **CI/CD**: 自動実行
- **目的**: アプリケーション運用
- **権限**: 実行環境、フロントエンド等の必要最小限
- **頻度**: 開発サイクルに合わせて

## 🚀 移行完了後の運用

1. **日常開発**: appディレクトリのみCI/CDが管理
2. **基盤変更**: 必要時のみfoundationを手動実行
3. **権限競合**: 解消済み（各層で独立管理）
4. **State共有**: リモートバックエンドで一元化

## ⚠️ 注意事項

- foundation適用後は、app実行前に必ずリモートバックエンド設定を確認
- 既存リソースのimportが完了してからCI/CDを有効化
- 両ディレクトリで同じ`terraform.tfvars`を使用
AWS リソース統合設計により、コスト効率と学習効率を両立します。

### 主要な特徴

- **単一IAMロール設計**: GitHub OIDC統合ロール（REQ-401準拠）でEnvironment条件による最小権限制御
- **統合State管理**: `unified/terraform.tfstate`で状態統合管理
- **$LATEST + alias戦略**: Preview→$LATEST、Production→versioned alias によるLambda環境管理

## ディレクトリ構成

```
terraform/
├── main.tf                 # 統合環境設定
├── variables.tf            # 統合変数定義
├── terraform.tfvars        # 統合設定値
├── outputs.tf              # 統合出力値
├── backend.tf.disabled     # Backend設定（unified state）
├── versions.tf             # Provider設定
├── modules/                # 統合モジュール
│   ├── iam-oidc/          # 統合GitHub OIDC認証
│   ├── lambda/     # 統合Lambda関数管理
│   ├── cloudflare-pages/   # CloudFlare Pages
│   └── monitoring/         # CloudWatch監視
├── state-management.tf     # State管理リソース（既存）
└── github-oidc.tf         # GitHub OIDC設定（既存）
```

## デプロイ手順

### 1. 統合インフラのデプロイ

```bash
# 統合Terraform初期化
make iac-init

# 環境変数で機密情報を設定
export TF_VAR_supabase_url="https://xxxxx.supabase.co"
export TF_VAR_supabase_access_token="sbp_xxxxxxxxxxxxx"  

# 統合インフラ計画・適用
make iac-plan-save
make iac-apply
```

### 2. 環境別デプロイ（GitHub Actions自動実行）

```bash
# Production環境（main pushで自動実行）
# - Lambda version発行 → stable alias更新

# Preview環境（PR作成・更新で自動実行）  
# - Lambda $LATEST更新 → 環境変数変更
```

## 重要な設計ポイント

### REQ-405: Lambda $LATEST + alias戦略

- **統合Lambda関数**: 単一関数で環境管理
- **Preview環境**: `$LATEST`を使用（即座に反映）
- **Production環境**: `stable`エイリアスを使用（安定版）
- **デプロイフロー**: コード更新→version発行→alias更新

### REQ-401: 単一GitHub OIDC統合ロール

- 単一IAMロールで両環境をサポート
- Environment条件による最小権限制御
- `repo:owner/repo:environment:production`
- `repo:owner/repo:environment:preview` 
- `repo:owner/repo:ref:refs/heads/main`

### REQ-404: 統合State管理

- `unified/terraform.tfstate`
- 単一stateで環境統合管理
- IAMロール・Lambda統合

## GitHub OIDC認証設定

### Environment設定

GitHub Repositoryで以下のEnvironmentを設定：

- `production`: 本番環境用（mainブランチのみ）
- `preview`: プレビュー環境用（プルリクエスト）

### Variables & Secrets設定

各Environmentに以下を設定：

```yaml
# Production Environment Variables
AWS_ROLE_ARN: arn:aws:iam::ACCOUNT:role/your-project-github-actions-unified
TERRAFORM_STATE_BUCKET: your-project-terraform-state  # 自動生成
LAMBDA_FUNCTION_NAME: your-project-api  # 自動生成
SUPABASE_PROJECT_ID: xxxxx
BASE_SCHEMA: yourproject
CLOUDFLARE_ACCOUNT_ID: your-account-id
CLOUDFLARE_PROJECT_NAME: your-project

# Production Secrets
SUPABASE_URL: https://xxxxx.supabase.co
SUPABASE_ACCESS_TOKEN: sbp_xxxxxxxxxxxxx
CLOUDFLARE_API_TOKEN: your-cloudflare-token

# Preview Environment（同一設定＋Preview固有）
```

## 運用コマンド

| コマンド | 説明 |
|----------|------|
| `make iac` | Terraformコンテナに接続（対話式） |
| `make iac-init` | 統合Terraform初期化（unified state） |
| `make iac-plan-save` | 統合環境変更計画の表示・保存 |
| `make iac-apply` | 統合環境変更の適用 |

## セキュリティ設定

### S3バケット
- KMS暗号化：有効
- バージョニング：有効
- パブリックアクセス：完全ブロック
- ライフサイクル：非現行バージョンを30日で削除

### 単一GitHub OIDC統合認証
- Environment条件による最小権限制御
- production: `repo:owner/repo:environment:production`
- preview: `repo:owner/repo:environment:preview`
- main branch: `repo:owner/repo:ref:refs/heads/main`
- 統合ポリシー: Lambda、Terraform State、PassRole権限

## 統合設計の利点

1. **コスト効率**: IAMロール66%削減、単一Lambda設計
2. **学習効率**: 設定項目簡素化、理解しやすい構成
3. **運用効率**: 単一state管理、統一ワークフロー
4. **セキュリティ向上**: 権限の一元管理、最小権限徹底、環境完全分離

## 注意事項

1. **環境変数による機密情報管理を徹底してください**
2. **$LATEST環境の競合に注意（複数PR同時実行時）**
3. **統合stateのため、変更時は影響範囲を確認してください**
4. **削除防止が設定されているリソースは手動削除が必要です**
