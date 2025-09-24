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
  
  project_name                  = local.project_name
  aws_region                    = var.aws_region
  repository_name               = var.repository_name
  terraform_state_bucket_arn    = aws_s3_bucket.terraform_state.arn
  terraform_locks_table_arn     = aws_dynamodb_table.terraform_locks.arn
  
  tags = local.common_tags
}

# Lambda Execution Role
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

# Production Lambda Function (placeholder for CI/CD updates)
resource "aws_lambda_function" "production" {
  function_name = "${local.project_name}-api-production"
  role         = aws_iam_role.lambda_exec.arn
  handler      = "index.handler"
  runtime      = "nodejs22.x"
  timeout      = 30
  memory_size  = 512
  
  # Placeholder code - will be updated by CI/CD
  filename         = "placeholder.zip"
  source_code_hash = data.archive_file.placeholder.output_base64sha256
  
  environment {
    variables = {
      NODE_ENV = "production"
    }
  }
  
  tags = merge(local.common_tags, { Environment = "production" })
}

# Preview Lambda Function (placeholder for CI/CD updates)
resource "aws_lambda_function" "preview" {
  function_name = "${local.project_name}-api-preview"
  role         = aws_iam_role.lambda_exec.arn
  handler      = "index.handler"
  runtime      = "nodejs22.x"
  timeout      = 30
  memory_size  = 512
  
  # Placeholder code - will be updated by CI/CD
  filename         = "placeholder.zip"
  source_code_hash = data.archive_file.placeholder.output_base64sha256
  
  environment {
    variables = {
      NODE_ENV = "development"
    }
  }
  
  tags = merge(local.common_tags, { Environment = "preview" })
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
  authorization_type = "NONE"
  
  cors {
    allow_credentials = true
    allow_headers     = ["*"]
    allow_methods     = ["*"]
    allow_origins     = ["https://${var.domain_name}"]
    expose_headers    = ["*"]
    max_age          = 86400
  }
}

resource "aws_lambda_function_url" "preview" {
  function_name      = aws_lambda_function.preview.function_name
  authorization_type = "NONE"
  
  cors {
    allow_credentials = true
    allow_headers     = ["*"]
    allow_methods     = ["*"]
    allow_origins     = ["https://preview.${local.project_name}.pages.dev"]
    expose_headers    = ["*"]
    max_age          = 86400
  }
}

# Lambda Stable Alias (事前作成でCreateAlias分岐を不要に)
resource "aws_lambda_alias" "production_stable" {
  name             = "stable"
  description      = "Production stable deployment alias"
  function_name    = aws_lambda_function.production.function_name
  function_version = aws_lambda_function.production.version
}

# CloudFlare Pages
module "cloudflare_pages" {
  source = "../modules/cloudflare-pages"
  
  account_id   = var.cloudflare_account_id
  project_name = local.project_name
  domain_name  = var.domain_name
  
  depends_on = [aws_lambda_function_url.production, aws_lambda_function_url.preview]
}

# Terraform State Management Resources
# KMS Key for State Encryption
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 7
  
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
  name           = "${local.project_name}-terraform-locks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.project_name}-terraform-locks"
  })
}