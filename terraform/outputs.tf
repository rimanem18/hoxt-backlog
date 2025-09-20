# 統合Terraform設定出力値

# Lambda Function URL出力（環境別）
output "function_url_production" {
  description = "Production Lambda Function URL"
  value       = module.lambda_production.function_url
}

output "function_url_preview" {
  description = "Preview Lambda Function URL"
  value       = module.lambda_preview.function_url
}

# Lambda Function出力（参考情報）
output "lambda_production_function_name" {
  description = "Production Lambda function name"
  value       = module.lambda_production.function_name
}

output "lambda_preview_function_name" {
  description = "Preview Lambda function name"
  value       = module.lambda_preview.function_name
}

output "github_actions_role_arn" {
  description = "GitHub Actions unified IAM role ARN"
  value       = module.github_oidc.github_actions_role_arn
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}

# CloudFlare Pages出力
output "cloudflare_pages_subdomain" {
  description = "CloudFlare Pages subdomain"
  value       = module.cloudflare_pages.subdomain
}

output "cloudflare_pages_production_url" {
  description = "CloudFlare Pages production URL"
  value       = module.cloudflare_pages.production_url
}

output "cloudflare_pages_preview_url" {
  description = "CloudFlare Pages preview URL"
  value       = module.cloudflare_pages.preview_url
}
