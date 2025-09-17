# 統合継続的デプロイメントシステム - メインTerraform設定
# 作成日: 2025年09月14日

locals {
  project_name = var.project_name

  # 環境別のテーブルプレフィックス設定
  # preview: extbl_dev_ (base_table_prefix + preview_table_prefix_suffix)
  # production: extbl_ (base_table_prefix のみ)
  table_prefix = var.environment == "preview" ? "${var.base_table_prefix}${var.preview_table_prefix_suffix}" : var.base_table_prefix

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
}

# Lambda Basic Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 環境別Lambda Functions（共通ロール使用）
module "lambda_production" {
  source = "./modules/lambda"

  project_name    = local.project_name
  function_name   = "${local.project_name}-api-production"
  environment     = "production"

  runtime         = "nodejs22.x"
  handler         = "index.handler"
  memory_size     = 512
  timeout         = 30

  # Production環境変数
  base_environment_variables = {
    SUPABASE_URL           = var.supabase_url
    SUPABASE_JWT_SECRET    = var.jwt_secret
    BASE_TABLE_PREFIX      = var.base_table_prefix
    DATABASE_URL           = var.database_url
    NODE_ENV              = "production"
    ACCESS_ALLOW_ORIGIN   = var.access_allow_origin
    ACCESS_ALLOW_METHODS  = join(", ", var.access_allow_methods)
    ACCESS_ALLOW_HEADERS   = join(", ", var.access_allow_headers)
  }

  cors_allow_origin = var.access_allow_origin
  lambda_role_arn   = aws_iam_role.lambda_exec.arn

  tags = merge(local.common_tags, { Environment = "production" })
}

module "lambda_preview" {
  source = "./modules/lambda"

  project_name    = local.project_name
  function_name   = "${local.project_name}-api-preview"
  environment     = "preview"

  runtime         = "nodejs22.x"
  handler         = "index.handler"
  memory_size     = 512
  timeout         = 30

  # Preview環境変数（dev接尾辞付き）
  base_environment_variables = {
    SUPABASE_URL           = var.supabase_url
    SUPABASE_JWT_SECRET    = var.jwt_secret
    BASE_TABLE_PREFIX      = "${var.base_table_prefix}${var.preview_table_prefix_suffix}"
    DATABASE_URL           = var.database_url
    NODE_ENV              = "development"
    ACCESS_ALLOW_ORIGIN   = var.access_allow_origin
    ACCESS_ALLOW_METHODS  = join(", ", var.access_allow_methods)
    ACCESS_ALLOW_HEADERS   = join(", ", var.access_allow_headers)
  }

  cors_allow_origin = var.access_allow_origin
  lambda_role_arn   = aws_iam_role.lambda_exec.arn

  tags = merge(local.common_tags, { Environment = "preview" })
}


# CloudFlare Pages（統合管理）
# TODO: CloudFlareプロバイダー設定修正後に有効化
# module "cloudflare_pages" {
#   source = "./modules/cloudflare-pages"
#
#   project_name     = local.project_name
#   domain           = var.domain_name
#
#   production_branch = "main"
#   build_command     = "bun run build"
#   output_directory  = "out"
#
#   environment_variables = {
#     NODE_ENV = "production"
#   }
# }

# Terraform State Bucket (参照用)
data "aws_s3_bucket" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.bucket
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
