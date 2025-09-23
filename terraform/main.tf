# 統合継続的デプロイメントシステム - メインTerraform設定
# 作成日: 2025年09月14日

locals {
  project_name = var.project_name

  # プロジェクト名の設定
  # 各Lambda関数で環境別スキーマ名を直接指定

  common_tags = {
    Project     = local.project_name
    ManagedBy   = "Terraform"
    Repository  = var.repository_name
    Environment = var.environment
  }
}

module "github_oidc" {
  source = "./modules/iam-oidc"

  project_name    = local.project_name
  aws_region      = var.aws_region
  repository_name = var.repository_name

  terraform_state_bucket_arn = aws_s3_bucket.terraform_state.arn
  terraform_locks_table_arn  = aws_dynamodb_table.terraform_locks.arn

  tags = local.common_tags
}

# 共通Lambda Execution Role
resource "aws_iam_role" "lambda_exec" {
  name = "${local.project_name}-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags

  lifecycle {
    ignore_changes = [tags]
  }
}

# Lambda Basic Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 環境別Lambda Functions（共通ロール使用）
module "lambda_production" {
  source = "./modules/lambda"

  project_name  = local.project_name
  function_name = "${local.project_name}-api-production"
  environment   = "production"

  runtime     = "nodejs22.x"
  handler     = "index.handler"
  memory_size = 512
  timeout     = 30

  # Production環境変数
  base_environment_variables = {
    SUPABASE_URL         = var.supabase_url
    BASE_SCHEMA          = "app_${var.project_name}"
    DATABASE_URL         = var.database_url
    NODE_ENV             = "production"
    ACCESS_ALLOW_ORIGIN  = "https://${var.domain_name}"
  }

  cors_allow_origin = "https://${var.domain_name}"
  lambda_role_arn   = aws_iam_role.lambda_exec.arn

  tags = merge(local.common_tags, { Environment = "production" })
}

module "lambda_preview" {
  source = "./modules/lambda"

  project_name  = local.project_name
  function_name = "${local.project_name}-api-preview"
  environment   = "preview"

  runtime     = "nodejs22.x"
  handler     = "index.handler"
  memory_size = 512
  timeout     = 30

  # Preview環境変数（dev接尾辞付き）
  base_environment_variables = {
    SUPABASE_URL         = var.supabase_url
    BASE_SCHEMA          = "app_${var.project_name}_preview"
    DATABASE_URL         = var.database_url
    NODE_ENV             = "development"
    ACCESS_ALLOW_ORIGIN  = "https://preview.${local.project_name}.pages.dev"
  }

  cors_allow_origin = "https://preview.${local.project_name}.pages.dev"
  lambda_role_arn   = aws_iam_role.lambda_exec.arn

  tags = merge(local.common_tags, { Environment = "preview" })
}


# CloudFlare Pages（既存プロジェクト参照方式）
module "cloudflare_pages" {
  source = "./modules/cloudflare-pages"

  account_id   = var.cloudflare_account_id
  project_name = local.project_name
}

# Terraform State Bucket (参照用)
data "aws_s3_bucket" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.bucket
  depends_on = [aws_s3_bucket.terraform_state]
}

# Monitoring & Logging
# TODO: 監視設定が完成後に有効化
# module "monitoring" {
#   source = "./modules/monitoring"
#
#   project_name = local.project_name
#
#   lambda_function_name = module.lambda.function_name
#
#   tags = local.common_tags
# }
