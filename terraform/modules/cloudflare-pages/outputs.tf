/**
 * CloudFlare Pagesモジュール出力値
 */

output "pages_project_id" {
  description = "CloudFlare Pages project ID"
  value       = cloudflare_pages_project.this.id
}

output "pages_project_name" {
  description = "CloudFlare Pages project name"
  value       = cloudflare_pages_project.this.name
}

output "subdomain" {
  description = "CloudFlare Pages subdomain"
  value       = cloudflare_pages_project.this.subdomain
}

output "production_url" {
  description = "Production URL"
  value       = var.production_domain != "" ? "https://${var.production_domain}" : "https://${cloudflare_pages_project.this.subdomain}"
}

output "preview_url" {
  description = "Preview URL"
  value       = "https://preview.${var.project_name}.pages.dev"
}

# DNS Record出力（手動設定のためコメントアウト）
# output "dns_record_production_id" {
#   description = "CloudFlare DNS record ID for production"
#   value       = length(cloudflare_record.production) > 0 ? cloudflare_record.production[0].id : ""
# }

# output "dns_record_preview_id" {
#   description = "CloudFlare DNS record ID for preview"
#   value       = length(cloudflare_record.preview) > 0 ? cloudflare_record.preview[0].id : ""
# }

output "pages_subdomain_for_dns" {
  description = "CloudFlare Pages subdomain for manual DNS CNAME setting"
  value       = cloudflare_pages_project.this.subdomain
}