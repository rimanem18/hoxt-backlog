/**
 * CloudFlare Pages統合モジュール
 * 1プロジェクト方式によるフロントエンドデプロイメント管理
 * Production/Preview環境を統合プロジェクトで管理
 */

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# 既存CloudFlare Pages Project（import済みリソース管理）
resource "cloudflare_pages_project" "this" {
  account_id        = var.account_id
  name             = var.project_name
  production_branch = "main"
  
  # 最小設定のみ（環境変数はGitHub Actionsで直接設定）
  build_config {
    build_command   = "bun run build"
    destination_dir = "out"
    root_dir       = "app/client"
  }
}

# CloudFlare DNS Record（Production用）
# セキュリティ重視: DNS Edit権限を避けるため手動設定推奨
# 手動設定手順: 
# 1. CloudFlare Dashboard → DNS → Records
# 2. CNAME: production_domain → cloudflare_pages_project.this.subdomain
# resource "cloudflare_record" "production" {
#   count   = var.zone_id != "" && var.production_domain != "" ? 1 : 0
#   zone_id = var.zone_id
#   name    = "@"
#   value   = cloudflare_pages_project.this.subdomain
#   type    = "CNAME"
#   ttl     = 1
#   proxied = true
# }

# CloudFlare DNS Record（Preview用）
# セキュリティ重視: DNS Edit権限を避けるため手動設定推奨
# 手動設定手順:
# 1. CloudFlare Dashboard → DNS → Records  
# 2. CNAME: preview_subdomain → cloudflare_pages_project.this.subdomain
# resource "cloudflare_record" "preview" {
#   count   = var.zone_id != "" && var.preview_subdomain != "" ? 1 : 0
#   zone_id = var.zone_id
#   name    = var.preview_subdomain
#   value   = cloudflare_pages_project.this.subdomain
#   type    = "CNAME"
#   ttl     = 1
#   proxied = true
# }