/**
 * CloudFlare Pagesモジュール
 * フロントエンドデプロイメント管理
 */

# CloudFlare Pages Project
resource "cloudflare_pages_project" "this" {
  account_id        = var.account_id
  name             = "${var.project_name}-${var.environment}"
  production_branch = var.production_branch
  
  build_config {
    build_command       = var.build_command
    destination_dir     = var.output_directory
    root_dir           = var.root_directory
    web_analytics_tag  = var.web_analytics_tag
    web_analytics_token = var.web_analytics_token
  }
  
  deployment_configs {
    production {
      environment_variables = var.environment_variables
    }
    
    preview {
      environment_variables = var.environment_variables
    }
  }
}

# CloudFlare DNS Record  
resource "cloudflare_record" "main" {
  count   = var.zone_id != "" ? 1 : 0
  zone_id = var.zone_id
  name    = var.environment == "production" ? "@" : var.environment
  value   = cloudflare_pages_project.this.subdomain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}