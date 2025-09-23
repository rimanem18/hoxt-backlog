# Terraform基盤リソース出力値
# アプリケーションスタックから参照される値

# S3バックエンド情報
output "terraform_state_bucket" {
  description = "Terraform state S3 bucket name"
  value       = aws_s3_bucket.terraform_state.bucket
}

output "terraform_state_bucket_arn" {
  description = "Terraform state S3 bucket ARN"
  value       = aws_s3_bucket.terraform_state.arn
}

output "terraform_locks_table" {
  description = "Terraform state lock DynamoDB table name"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "terraform_locks_table_arn" {
  description = "Terraform state lock DynamoDB table ARN"
  value       = aws_dynamodb_table.terraform_locks.arn
}

# KMS情報
output "terraform_state_kms_key_arn" {
  description = "Terraform state KMS key ARN"
  value       = aws_kms_key.terraform_state.arn
}

# GitHub Actions IAM情報
output "github_actions_role_arn" {
  description = "GitHub Actions IAM role ARN"
  value       = module.github_oidc.github_actions_role_arn
}

# プロジェクト情報
output "project_name" {
  description = "Project name"
  value       = var.project_name
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}