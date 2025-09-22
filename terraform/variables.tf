/**
 * 統合Terraform設定用変数定義
 * AWS リソース統合対応
 */


variable "project_name" {
  description = "Project name for resource prefixes"
  type        = string
}

variable "repository_name" {
  description = "Repository name for IAM and tags (owner/repo format)"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}


variable "environment" {
  description = "Deployment environment (preview or production)"
  type        = string
  default     = "preview"

  validation {
    condition     = contains(["preview", "production"], var.environment)
    error_message = "Environment must be either 'preview' or 'production'."
  }
}

variable "base_schema" {
  description = "Base PostgreSQL schema name for database environment separation"
  type        = string
}


variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}


variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

# CORS 設定は各Lambda環境変数で直接定義（サーバーサイドCORS処理）

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-northeast-1"
}

# CloudFlare Pages settings
variable "cloudflare_account_id" {
  description = "CloudFlare account ID"
  type        = string
  default     = ""
}

variable "cloudflare_zone_id" {
  description = "CloudFlare zone ID for DNS management"
  type        = string
  default     = ""
}

variable "cloudflare_api_token" {
  description = "CloudFlare API token for authentication"
  type        = string
  sensitive   = true
}

variable "preview_domain_suffix" {
  description = "Preview domain suffix for CloudFlare Pages (typically .pages.dev)"
  type        = string
  default     = ".pages.dev"
}
