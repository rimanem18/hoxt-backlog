# Bootstrap Infrastructure Setup
# 作成日: 2025年09月23日
# 目的: インフラ初期構築（強い権限で実行）

locals {
  project_name = var.project_name

  common_tags = {
    Project     = local.project_name
    ManagedBy   = "Terraform"
    Repository  = var.repository_name
    Environment = "bootstrap"
    Layer       = "Infrastructure"
  }
}

# Current AWS Account ID
data "aws_caller_identity" "current" {}

# GitHub OIDC Provider
module "github_oidc" {
  source = "../modules/iam-oidc"

  project_name               = local.project_name
  aws_region                 = var.aws_region
  repository_name            = var.repository_name
  terraform_state_bucket_arn = aws_s3_bucket.terraform_state.arn
  terraform_locks_table_arn  = aws_dynamodb_table.terraform_locks.arn

  tags = local.common_tags
}

# Lambda Execution Role
resource "aws_iam_role" "lambda_exec" {
  name                 = "${local.project_name}-lambda-exec-role"
  permissions_boundary = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${local.project_name}-MaxPermissionsBoundary"

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

# Production Lambda Function (placeholder for CI/CD updates)
resource "aws_lambda_function" "production" {
  function_name = "${local.project_name}-api-production"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  timeout       = 30
  memory_size   = 512

  # Actual application code
  filename         = "../modules/lambda/lambda.zip"
  source_code_hash = filebase64sha256("../modules/lambda/lambda.zip")

  environment {
    variables = {
      NODE_ENV                 = "production"
      BASE_SCHEMA              = "app_${local.project_name}"
      DATABASE_URL             = var.database_url
      SUPABASE_URL             = var.next_public_supabase_url
      SUPABASE_PUBLISHABLE_KEY = var.supabase_publishable_key
      ACCESS_ALLOW_ORIGIN      = var.access_allow_origin_production
      ACCESS_ALLOW_METHODS     = "GET,POST,PUT,DELETE,OPTIONS,HEAD,PATCH"
      ACCESS_ALLOW_HEADERS     = "Content-Type,Authorization,X-Requested-With,Accept,Origin"
      USE_JWKS_VERIFIER        = "true"
      ENABLE_JWKS_VERIFICATION = "true"
      ENVIRONMENT              = "production"
      METRICS_NAMESPACE        = var.metrics_namespace
    }
  }

  tags = merge(local.common_tags, { Environment = "production" })

  # 実運用コードはCI/CDが直接更新するため、placeholderとの差分検知を無視する
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# Preview Lambda Function (placeholder for CI/CD updates)
resource "aws_lambda_function" "preview" {
  function_name = "${local.project_name}-api-preview"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  timeout       = 30
  memory_size   = 512

  # Actual application code
  filename         = "../modules/lambda/lambda.zip"
  source_code_hash = filebase64sha256("../modules/lambda/lambda.zip")

  environment {
    variables = {
      # previewではE2Eを実行しないため、ENABLE_TEST_ENDPOINTSが誤って
      # trueに設定された場合でもテスト専用エンドポイントを有効化させないよう
      # NODE_ENVをproductionと同じ値にする（isTestEndpointsEnabled()参照）
      NODE_ENV                 = "production"
      BASE_SCHEMA              = "app_${local.project_name}_preview"
      DATABASE_URL             = var.database_url
      SUPABASE_URL             = var.next_public_supabase_url
      SUPABASE_PUBLISHABLE_KEY = var.supabase_publishable_key
      ACCESS_ALLOW_ORIGIN      = var.access_allow_origin_preview
      ACCESS_ALLOW_METHODS     = "GET,POST,PUT,DELETE,OPTIONS,HEAD,PATCH"
      ACCESS_ALLOW_HEADERS     = "Content-Type,Authorization,X-Requested-With,Accept,Origin"
      USE_JWKS_VERIFIER        = "true"
      ENABLE_JWKS_VERIFICATION = "true"
      ENVIRONMENT              = "preview"
      METRICS_NAMESPACE        = var.metrics_namespace
    }
  }

  tags = merge(local.common_tags, { Environment = "preview" })

  # 実運用コードはCI/CDが直接更新するため、placeholderとの差分検知を無視する
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# Placeholder Lambda package
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "placeholder.zip"
  source {
    content  = "exports.handler = async () => ({ statusCode: 200, body: 'Placeholder' });"
    filename = "index.js"
  }
}

# Lambda Function URLs
resource "aws_lambda_function_url" "production" {
  function_name      = aws_lambda_function.production.function_name
  qualifier          = "stable"
  authorization_type = "NONE"
}

resource "aws_lambda_function_url" "preview" {
  function_name      = aws_lambda_function.preview.function_name
  qualifier          = "stable"
  authorization_type = "NONE"
}

# Lambda Stable Alias (事前作成でCreateAlias分岐を不要に)
resource "aws_lambda_alias" "production_stable" {
  name             = "stable"
  description      = "Production stable deployment alias"
  function_name    = aws_lambda_function.production.function_name
  function_version = "$LATEST"

  # CDがpublish-version後にstableへ向け直すバージョンをterraform applyで巻き戻さないため
  lifecycle {
    ignore_changes = [function_version]
  }
}

resource "aws_lambda_alias" "preview_stable" {
  name             = "stable"
  description      = "Preview stable deployment alias"
  function_name    = aws_lambda_function.preview.function_name
  function_version = "$LATEST"

  # CDがpublish-version後にstableへ向け直すバージョンをterraform applyで巻き戻さないため
  lifecycle {
    ignore_changes = [function_version]
  }
}

# Terraform State Management Resources
# KMS Key for State Encryption
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-terraform-state-key"
  })
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/${local.project_name}-terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

# S3 Bucket for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${local.project_name}-terraform-state"

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-terraform-state"
  })
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.terraform_state.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB Table for State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${local.project_name}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-terraform-locks"
  })
}