/**
 * Terraform State管理リソース
 * S3バケット、KMS、DynamoDBによるstate保存とロック管理
 */

# KMS Key for S3 Bucket Encryption
resource "aws_kms_key" "terraform_state" {
  description = "KMS key for Terraform state encryption"

  # キーポリシー：管理者とTerraformが使用可能
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
        Sid    = "Allow Terraform access"
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
      }
    ]
  })
}

# KMS Alias for easier identification
resource "aws_kms_alias" "terraform_state" {
  name          = "alias/${var.project_name}-terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

# S3 Bucket for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name != "" ? var.state_bucket_name : "${var.project_name}-terraform-state"

  # バケット削除防止
  lifecycle {
    prevent_destroy = true
  }
}

# S3 Bucket Versioning - 状態ファイルのバージョン管理
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Encryption - KMSによる暗号化
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

# S3 Bucket Public Access Block - パブリックアクセス完全禁止
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Lifecycle Configuration - 古いバージョンの自動削除
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "terraform_state_lifecycle"
    status = "Enabled"

    # フィルター：すべてのオブジェクトに適用
    filter {}

    # 非現行バージョンを30日後に削除
    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    # 削除マーカーのクリーンアップ
    expiration {
      expired_object_delete_marker = true
    }
  }
}

# DynamoDB Table for State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name = var.lock_table_name != "" ? var.lock_table_name : "${var.project_name}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # テーブル削除防止
  lifecycle {
    prevent_destroy = true
  }
}

# 現在のAWSアカウント情報取得
data "aws_caller_identity" "current" {}