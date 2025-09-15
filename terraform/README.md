# プロジェクト名 - Terraform統合インフラ設計

## 概要

プロジェクトのAWSインフラストラクチャをTerraformで管理します。
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
export TF_VAR_jwt_secret="your-jwt-secret"

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
- IAMロール・Lambda・API Gateway（環境別ステージ）統合

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
BASE_TABLE_PREFIX: yourprefix
CLOUDFLARE_ACCOUNT_ID: your-account-id
CLOUDFLARE_PROJECT_NAME: your-project
API_GATEWAY_BASE_URL: https://api-id.execute-api.ap-northeast-1.amazonaws.com  # terraform output で取得

# Production Secrets
SUPABASE_URL: https://xxxxx.supabase.co
SUPABASE_ACCESS_TOKEN: sbp_xxxxxxxxxxxxx
JWT_SECRET: your-jwt-secret
CLOUDFLARE_API_TOKEN: your-cloudflare-token

# Preview Environment（同一設定＋Preview固有）
API_GATEWAY_BASE_URL: https://api-id.execute-api.ap-northeast-1.amazonaws.com  # 本番と同じベースURL
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

1. **コスト効率**: IAMロール66%削減、単一Lambda・API Gateway（環境別ステージ分離）
2. **学習効率**: 設定項目簡素化、理解しやすい構成
3. **運用効率**: 単一state管理、統一ワークフロー
4. **セキュリティ向上**: 権限の一元管理、最小権限徹底、環境完全分離

## 注意事項

1. **環境変数による機密情報管理を徹底してください**
2. **$LATEST環境の競合に注意（複数PR同時実行時）**
3. **統合stateのため、変更時は影響範囲を確認してください**
4. **削除防止が設定されているリソースは手動削除が必要です**
