# Terraformアプリケーションリソース出力値
# GitHub ActionsやNext.jsビルドで使用される値

# Lambda Function出力（data sourceから取得）
output "lambda_production_function_name" {
  description = "Production Lambda function name"
  value       = data.aws_lambda_function.production.function_name
}

output "lambda_preview_function_name" {
  description = "Preview Lambda function name"
  value       = data.aws_lambda_function.preview.function_name
}

# Lambda Function ARN出力
output "lambda_production_arn" {
  description = "Production Lambda function ARN"
  value       = data.aws_lambda_function.production.arn
}

output "lambda_preview_arn" {
  description = "Preview Lambda function ARN"  
  value       = data.aws_lambda_function.preview.arn
}

# CloudFlare Pages出力（固定値）
output "cloudflare_pages_subdomain" {
  description = "CloudFlare Pages subdomain"
  value       = "${local.project_name}.pages.dev"
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
  value       = "https://${var.domain_name}"
}

# Next.js環境変数用出力 - Production環境
output "next_public_api_base_url_production" {
  description = "Next.js API Base URL for Production (自動取得)"
  value       = data.aws_lambda_function_url.production.function_url
}

output "next_public_site_url_production" {
  description = "Next.js Site URL for Production (CloudFlare Pages Production URL)"
  value       = "https://${var.domain_name}"
}

output "next_public_trusted_domains_production" {
  description = "Next.js Trusted Domains for Production (CloudFlare + Lambda URLs)"
  value       = "https://${var.domain_name},${data.aws_lambda_function_url.production.function_url}"
}

# Next.js環境変数用出力 - Preview環境
output "next_public_api_base_url_preview" {
  description = "Next.js API Base URL for Preview (自動取得)"
  value       = data.aws_lambda_function_url.preview.function_url
}

output "next_public_site_url_preview" {
  description = "Next.js Site URL for Preview (CloudFlare Pages Preview URL)"
  value       = "https://preview.${local.project_name}.pages.dev"
}

output "next_public_trusted_domains_preview" {
  description = "Next.js Trusted Domains for Preview (CloudFlare + Lambda URLs)"
  value       = "https://preview.${local.project_name}.pages.dev,${data.aws_lambda_function_url.preview.function_url}"
}