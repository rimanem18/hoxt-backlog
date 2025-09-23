# Terraform基盤リソース管理
# 作成日: 2025年09月23日
# 目的: S3バックエンド、IAM OIDC、基盤セキュリティの一元管理

locals {
  project_name = var.project_name

  common_tags = {
    Project     = local.project_name
    ManagedBy   = "Terraform"
    Repository  = var.repository_name
    Layer       = "Foundation"
  }
}

# Current AWS Account ID
data "aws_caller_identity" "current" {}

# KMS Key for S3 Bucket Encryption
resource "aws_kms_key" "terraform_state" {
  description = "KMS key for Terraform state encryption"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM policies"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Terraform access (local)"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-TerraformRole"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow GitHub Actions access"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-github-actions"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*",
          "kms:PutKeyPolicy"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

# KMS Alias for easier identification
resource "aws_kms_alias" "terraform_state" {
  name          = "alias/${var.project_name}-terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

# S3 Bucket for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-terraform-state"

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-terraform-state"
    Purpose     = "terraform-backend"
  })

  lifecycle {
    prevent_destroy = true
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.terraform_state.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# DynamoDB Table for Terraform State Lock
resource "aws_dynamodb_table" "terraform_locks" {
  name           = "${var.project_name}-terraform-locks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.terraform_state.arn
  }

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-terraform-locks"
    Purpose     = "terraform-state-locking"
  })

  lifecycle {
    prevent_destroy = true
  }
}

# GitHub OIDC Configuration
module "github_oidc" {
  source = "../modules/iam-oidc"

  project_name    = local.project_name
  aws_region      = var.aws_region
  repository_name = var.repository_name

  terraform_state_bucket_arn = aws_s3_bucket.terraform_state.arn
  terraform_locks_table_arn  = aws_dynamodb_table.terraform_locks.arn

  tags = local.common_tags
}