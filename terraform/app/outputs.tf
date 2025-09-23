# Terraformアプリケーションリソース出力値
# GitHub ActionsやNext.jsビルドで使用される値

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

# CORS設定用出力（サーバービルド時に使用）
output "access_allow_origin_production" {
  description = "Production CORS Allow Origin URL"
  value       = "https://${var.domain_name}"
}

# Next.js環境変数用出力 - Production環境
output "next_public_api_base_url_production" {
  description = "Next.js API Base URL for Production (Lambda Function URL)"
  value       = module.lambda_production.function_url
}

output "next_public_site_url_production" {
  description = "Next.js Site URL for Production (CloudFlare Pages Production URL)"
  value       = module.cloudflare_pages.production_url
}

output "next_public_trusted_domains_production" {
  description = "Next.js Trusted Domains for Production (CloudFlare + Lambda URLs)"
  value       = "${module.cloudflare_pages.production_url},${module.lambda_production.function_url}"
}

# Next.js環境変数用出力 - Preview環境
output "next_public_api_base_url_preview" {
  description = "Next.js API Base URL for Preview (Lambda Function URL)"
  value       = module.lambda_preview.function_url
}

output "next_public_site_url_preview" {
  description = "Next.js Site URL for Preview (CloudFlare Pages Preview URL)"
  value       = module.cloudflare_pages.preview_url
}

output "next_public_trusted_domains_preview" {
  description = "Next.js Trusted Domains for Preview (CloudFlare + Lambda URLs)"
  value       = "${module.cloudflare_pages.preview_url},${module.lambda_preview.function_url}"
}