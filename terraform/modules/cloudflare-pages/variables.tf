/**
 * CloudFlare Pagesモジュール変数定義
 */

variable "account_id" {
  description = "CloudFlare account ID"
  type        = string
}

variable "project_name" {
  description = "Project name for resource prefixes"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
}

variable "zone_id" {
  description = "CloudFlare zone ID"
  type        = string
  default     = ""
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

variable "environment_variables" {
  description = "Environment variables for deployment"
  type        = map(string)
  default     = {}
}