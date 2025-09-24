# Bootstrap Infrastructure Outputs
# これらの値はapp/でのCI/CD実行時に使用される

# GitHub Actions用ロール
output "github_actions_role_arn" {
  description = "GitHub Actions IAM role ARN for CI/CD"
  value       = module.github_oidc.github_actions_role_arn
}

# Lambda関数情報
output "lambda_production_function_name" {
  description = "Production Lambda function name"
  value       = aws_lambda_function.production.function_name
}

output "lambda_production_arn" {
  description = "Production Lambda function ARN"
  value       = aws_lambda_function.production.arn
}

output "lambda_preview_function_name" {
  description = "Preview Lambda function name"
  value       = aws_lambda_function.preview.function_name
}

output "lambda_preview_arn" {
  description = "Preview Lambda function ARN"
  value       = aws_lambda_function.preview.arn
}

# Lambda Function URLs
output "lambda_production_function_url" {
  description = "Production Lambda Function URL"
  value       = aws_lambda_function_url.production.function_url
}

output "lambda_preview_function_url" {
  description = "Preview Lambda Function URL"
  value       = aws_lambda_function_url.preview.function_url
}

# Lambda Stable Alias (事前作成済み)
output "lambda_production_stable_alias" {
  description = "Production stable alias name"
  value       = aws_lambda_alias.production_stable.name
}

# Terraform State管理情報
output "terraform_state_bucket" {
  description = "Terraform state S3 bucket name"
  value       = aws_s3_bucket.terraform_state.bucket
}

output "terraform_locks_table" {
  description = "Terraform state lock DynamoDB table name"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "terraform_state_kms_key_id" {
  description = "Terraform state encryption KMS key ID"
  value       = aws_kms_key.terraform_state.key_id
}

# CloudFlare Pages情報
output "cloudflare_pages_project_name" {
  description = "CloudFlare Pages project name"
  value       = module.cloudflare_pages.pages_project_name
}

# 環境変数用出力（Next.js用）
output "next_public_api_base_url_production" {
  description = "Next.js API Base URL for Production"
  value       = aws_lambda_function_url.production.function_url
}

output "next_public_site_url_production" {
  description = "Next.js Site URL for Production"
  value       = "https://${var.domain_name}"
}

output "next_public_trusted_domains_production" {
  description = "Next.js Trusted Domains for Production"
  value       = "https://${var.domain_name},${aws_lambda_function_url.production.function_url}"
}

output "next_public_api_base_url_preview" {
  description = "Next.js API Base URL for Preview"
  value       = aws_lambda_function_url.preview.function_url
}

output "next_public_site_url_preview" {
  description = "Next.js Site URL for Preview"
  value       = "https://preview.${var.project_name}.pages.dev"
}

output "next_public_trusted_domains_preview" {
  description = "Next.js Trusted Domains for Preview"
  value       = "https://preview.${var.project_name}.pages.dev,${aws_lambda_function_url.preview.function_url}"
}

# CORS設定用
output "access_allow_origin_production" {
  description = "Production CORS Allow Origin URL"
  value       = "https://${var.domain_name}"
}