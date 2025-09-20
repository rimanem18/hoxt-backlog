# 統合Terraform設定値
# AWS リソース統合対応

# aws_region         = "ap-northeast-1"
# project_name は環境変数 TF_VAR_project_name で設定 (compose.yaml経由)
# repository_name は環境変数 TF_VAR_repository_name で設定 (compose.yaml経由)
# base_table_prefix は環境変数 TF_VAR_base_table_prefix で設定 (compose.yaml経由)
# domain_name        = "your-domain.com"

# CloudFlare Pages設定
# cloudflare_account_id = "your-cloudflare-account-id"
# cloudflare_zone_id    = "your-cloudflare-zone-id"

# State management
# S3バケット名は ${PROJECT_NAME}-terraform-state で自動生成

# Sensitive variables are set via GitHub Secrets or environment variables:
# TF_VAR_supabase_url
# TF_VAR_supabase_access_token
# TF_VAR_jwt_secret
# TF_VAR_database_url
# CLOUDFLARE_API_TOKEN (環境変数)
