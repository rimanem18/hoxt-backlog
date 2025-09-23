/**
 * CloudFlare Pages import済みリソース出力値
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
  description = "Production URL（固定値）"
  value       = "https://hoxbl.rimane.net"
}

output "preview_url" {
  description = "Preview URL"
  value       = "https://preview.hoxbl.pages.dev"
}