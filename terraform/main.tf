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

# 統合Lambda Function（Production/Preview両対応）
module "lambda_unified" {
  source = "./modules/lambda"

  project_name    = local.project_name
  function_name   = "${local.project_name}-api"

  runtime         = "nodejs22.x"
  handler         = "index.handler"
  memory_size     = 512
  timeout         = 30

  # 環境変数は実行時にGitHub Actionsから注入
  # BASE_TABLE_PREFIXは環境別に動的設定
  base_environment_variables = {
    SUPABASE_URL           = var.supabase_url
    SUPABASE_ACCESS_TOKEN  = var.supabase_access_token
    JWT_SECRET             = var.jwt_secret
    BASE_TABLE_PREFIX      = local.table_prefix
    DATABASE_URL           = var.database_url
    NODE_ENV              = var.environment == "production" ? "production" : "development"
  }

  tags = local.common_tags
}

# API Gateway（環境別ステージ分離）
resource "aws_apigatewayv2_api" "main" {
  name          = "${local.project_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_credentials = false
    allow_headers     = ["content-type", "x-amz-date", "authorization"]
    allow_methods     = ["*"]
    allow_origins     = [var.frontend_domain]
    expose_headers    = ["date", "keep-alive"]
    max_age          = 86400
  }

  tags = local.common_tags
}

# API Gateway Stage - Production
resource "aws_apigatewayv2_stage" "production" {
  api_id = aws_apigatewayv2_api.main.id
  name   = "production"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 1000
    throttling_burst_limit = 2000
  }

  tags = merge(local.common_tags, {
    Environment = "production"
  })
}

# API Gateway Stage - Preview
resource "aws_apigatewayv2_stage" "preview" {
  api_id = aws_apigatewayv2_api.main.id
  name   = "preview"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 100
    throttling_burst_limit = 200
  }

  tags = merge(local.common_tags, {
    Environment = "preview"
  })
}

# Lambda Integration - Production
resource "aws_apigatewayv2_integration" "lambda_production" {
  api_id = aws_apigatewayv2_api.main.id

  integration_uri    = module.lambda_unified.stable_alias_invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

# Lambda Integration - Preview
resource "aws_apigatewayv2_integration" "lambda_preview" {
  api_id = aws_apigatewayv2_api.main.id

  integration_uri    = module.lambda_unified.invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

# Route - Production
resource "aws_apigatewayv2_route" "production" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"

  target = "integrations/${aws_apigatewayv2_integration.lambda_production.id}"

  depends_on = [aws_apigatewayv2_stage.production]
}

# Route - Preview
resource "aws_apigatewayv2_route" "preview" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"

  target = "integrations/${aws_apigatewayv2_integration.lambda_preview.id}"

  depends_on = [aws_apigatewayv2_stage.preview]
}

# Lambda Permissions for API Gateway - Production
resource "aws_lambda_permission" "api_gateway_production" {
  statement_id  = "AllowExecutionFromAPIGatewayProduction"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_unified.function_name
  qualifier     = "stable"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/production/*/*"
}

# Lambda Permissions for API Gateway - Preview
resource "aws_lambda_permission" "api_gateway_preview" {
  statement_id  = "AllowExecutionFromAPIGatewayPreview"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_unified.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/preview/*/*"
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
#     API_GATEWAY_BASE_URL = aws_apigatewayv2_api.main.api_endpoint
#     NODE_ENV            = "production"
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
#   lambda_function_name = module.lambda_unified.function_name
#   api_gateway_id       = aws_apigatewayv2_api.main.id
#
#   tags = local.common_tags
# }
