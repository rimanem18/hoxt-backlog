# CI/CD Application Management
# 作成日: 2025年09月23日
# 目的: CI/CD用制限権限でのアプリケーション管理

locals {
  project_name = var.project_name

  common_tags = {
    Project     = local.project_name
    ManagedBy   = "Terraform"
    Repository  = var.repository_name
    Environment = "cicd"
    Layer       = "Application"
  }
}

# Current AWS Account ID
data "aws_caller_identity" "current" {}

# Bootstrap Terraform State参照
# bootstrap/で作成されたリソース情報を取得
data "terraform_remote_state" "bootstrap" {
  backend = "s3"
  
  config = {
    bucket         = "${var.project_name}-terraform-state"
    key            = "bootstrap/terraform.tfstate"
    region         = var.aws_region
    dynamodb_table = "${var.project_name}-terraform-locks"
    encrypt        = true
  }
}

# Lambda関数情報（bootstrap outputsから取得）
locals {
  # Bootstrap state outputs
  lambda_production_function_name = data.terraform_remote_state.bootstrap.outputs.lambda_production_function_name
  lambda_production_arn           = data.terraform_remote_state.bootstrap.outputs.lambda_production_arn
  lambda_preview_function_name    = data.terraform_remote_state.bootstrap.outputs.lambda_preview_function_name
  lambda_preview_arn              = data.terraform_remote_state.bootstrap.outputs.lambda_preview_arn
  lambda_production_function_url  = data.terraform_remote_state.bootstrap.outputs.lambda_production_function_url
  lambda_preview_function_url     = data.terraform_remote_state.bootstrap.outputs.lambda_preview_function_url
  lambda_production_stable_alias  = data.terraform_remote_state.bootstrap.outputs.lambda_production_stable_alias
  cloudflare_pages_project_name   = data.terraform_remote_state.bootstrap.outputs.cloudflare_pages_project_name
  github_actions_role_arn         = data.terraform_remote_state.bootstrap.outputs.github_actions_role_arn
}

# 既存Lambda関数を参照（bootstrap outputsから取得）
data "aws_lambda_function" "production" {
  function_name = local.lambda_production_function_name
}

data "aws_lambda_function" "preview" {
  function_name = local.lambda_preview_function_name
}

# Lambda Function URLを取得
data "aws_lambda_function_url" "production" {
  function_name = data.aws_lambda_function.production.function_name
  qualifier     = "stable"
}

data "aws_lambda_function_url" "preview" {
  function_name = data.aws_lambda_function.preview.function_name
  qualifier     = "stable"
}

# 既存Lambda stableエイリアスを参照（bootstrap/で作成済み）
data "aws_lambda_alias" "production_stable" {
  function_name = data.aws_lambda_function.production.function_name
  name         = local.lambda_production_stable_alias
}

# Production Lambda監視（TASK-702簡素化版）
# 個人開発MVP向けにProductionのみ監視、Preview環境は除外
module "monitoring_production" {
  source = "../modules/monitoring"

  project_name         = local.project_name
  environment          = "production"
  lambda_function_name = local.lambda_production_function_name
  alarm_emails         = length(var.ops_email) > 0 ? [var.ops_email] : []

  tags = merge(
    local.common_tags,
    {
      Component = "Monitoring"
      Scope     = "Production"
    }
  )
}


