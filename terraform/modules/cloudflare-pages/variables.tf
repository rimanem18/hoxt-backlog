/**
 * CloudFlare Pages統合モジュール変数定義
 * 1プロジェクト方式対応
 */

variable "account_id" {
  description = "CloudFlare account ID"
  type        = string
}

variable "project_name" {
  description = "Project name for unified Pages project"
  type        = string
}

variable "zone_id" {
  description = "CloudFlare zone ID"
  type        = string
  default     = ""
}

variable "production_domain" {
  description = "Production domain name"
  type        = string
  default     = ""
}

variable "preview_subdomain" {
  description = "Preview subdomain name"
  type        = string
  default     = "preview"
}

variable "production_branch" {
  description = "Production branch name"
  type        = string
  default     = "main"
}

variable "build_command" {
  description = "Build command for Pages"
  type        = string
  default     = "bun run build"
}

variable "output_directory" {
  description = "Output directory for build"
  type        = string
  default     = "out"
}

variable "root_directory" {
  description = "Root directory for build"
  type        = string
  default     = ""
}

variable "web_analytics_tag" {
  description = "Web analytics tag"
  type        = string
  default     = ""
}

variable "web_analytics_token" {
  description = "Web analytics token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "base_environment_variables" {
  description = "Base environment variables for deployment"
  type        = map(string)
  default     = {}
}

variable "production_api_url" {
  description = "Production Lambda Function URL"
  type        = string
}

variable "preview_api_url" {
  description = "Preview Lambda Function URL"
  type        = string
}

variable "preview_domain_suffix" {
  description = "Preview domain suffix for CloudFlare Pages (typically .pages.dev)"
  type        = string
  default     = ".pages.dev"
}