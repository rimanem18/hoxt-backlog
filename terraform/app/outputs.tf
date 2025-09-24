# CI/CD Application Outputs
# GitHub ActionsやNext.jsビルドで使用される値

# Lambda Function出力（bootstrap stateから取得）
output "lambda_production_function_name" {
  description = "Production Lambda function name"
  value       = local.lambda_production_function_name
}

output "lambda_preview_function_name" {
  description = "Preview Lambda function name"
  value       = local.lambda_preview_function_name
}

# Lambda Function ARN出力
output "lambda_production_arn" {
  description = "Production Lambda function ARN"
  value       = local.lambda_production_arn
}

output "lambda_preview_arn" {
  description = "Preview Lambda function ARN"  
  value       = local.lambda_preview_arn
}

# Lambda Stable Alias（事前作成済み）
output "lambda_production_stable_alias" {
  description = "Production stable alias name"
  value       = local.lambda_production_stable_alias
}

# GitHub Actions IAM Role
output "github_actions_role_arn" {
  description = "GitHub Actions IAM role ARN"
  value       = local.github_actions_role_arn
}

# Project Name
output "project_name" {
  description = "Project name"
  value       = local.project_name
}

# CloudFlare Pages出力
output "cloudflare_pages_project_name" {
  description = "CloudFlare Pages project name"
  value       = local.cloudflare_pages_project_name
}

output "cloudflare_pages_production_url" {
  description = "CloudFlare Pages production URL"
  value       = "https://${var.domain_name}"
}

output "cloudflare_pages_preview_url" {
  description = "CloudFlare Pages preview URL"
  value       = "https://preview.${local.project_name}.pages.dev"
}

# CORS設定用出力（サーバービルド時に使用）
output "access_allow_origin_production" {
  description = "Production CORS Allow Origin URL"
  value       = data.terraform_remote_state.bootstrap.outputs.access_allow_origin_production
}

output "access_allow_origin_preview" {
  description = "Preview CORS Allow Origin URL with wildcard"
  value       = data.terraform_remote_state.bootstrap.outputs.access_allow_origin_preview
}

# Next.js環境変数用出力 - Production環境
output "next_public_api_base_url_production" {
  description = "Next.js API Base URL for Production"
  value       = data.terraform_remote_state.bootstrap.outputs.next_public_api_base_url_production
}

output "next_public_site_url_production" {
  description = "Next.js Site URL for Production"
  value       = data.terraform_remote_state.bootstrap.outputs.next_public_site_url_production
}

output "next_public_trusted_domains_production" {
  description = "Next.js Trusted Domains for Production"
  value       = data.terraform_remote_state.bootstrap.outputs.next_public_trusted_domains_production
}

# Next.js環境変数用出力 - Preview環境
output "next_public_api_base_url_preview" {
  description = "Next.js API Base URL for Preview"
  value       = data.terraform_remote_state.bootstrap.outputs.next_public_api_base_url_preview
}

output "next_public_site_url_preview" {
  description = "Next.js Site URL for Preview"
  value       = data.terraform_remote_state.bootstrap.outputs.next_public_site_url_preview
}

output "next_public_trusted_domains_preview" {
  description = "Next.js Trusted Domains for Preview"
  value       = data.terraform_remote_state.bootstrap.outputs.next_public_trusted_domains_preview
}