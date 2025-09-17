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

output "pages_subdomain" {
  description = "CloudFlare Pages subdomain"
  value       = cloudflare_pages_project.this.subdomain
}

output "dns_record_id" {
  description = "CloudFlare DNS record ID"
  value       = length(cloudflare_record.main) > 0 ? cloudflare_record.main[0].id : ""
}