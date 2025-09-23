# Terraformアプリケーションリソース管理
# 作成日: 2025年09月23日
# 目的: Lambda、CloudFlare等のアプリケーション実行環境

locals {
  project_name = var.project_name

  common_tags = {
    Project     = local.project_name
    ManagedBy   = "Terraform"
    Repository  = var.repository_name
    Environment = var.environment
    Layer       = "Application"
  }
}

# Current AWS Account ID
data "aws_caller_identity" "current" {}

# 既存Lambda Execution Roleを参照（競合回避のためdata source使用）
data "aws_iam_role" "lambda_exec" {
  name = "${local.project_name}-lambda-exec-role"
}

# Lambda Basic Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = data.aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 既存Lambda関数を参照（CI/CDはUpdate系のみ実行）
data "aws_lambda_function" "production" {
  function_name = "${local.project_name}-api-production"
}

data "aws_lambda_function" "preview" {
  function_name = "${local.project_name}-api-preview"
}

# Lambda Function URLを取得
data "aws_lambda_function_url" "production" {
  function_name = data.aws_lambda_function.production.function_name
}

data "aws_lambda_function_url" "preview" {
  function_name = data.aws_lambda_function.preview.function_name
}

# CloudFlare Pages（既存プロジェクト参照）
module "cloudflare_pages" {
  source = "../modules/cloudflare-pages"

  account_id   = var.cloudflare_account_id
  project_name = local.project_name
}