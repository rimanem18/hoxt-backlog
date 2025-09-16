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

variable "frontend_domain" {
  description = "Frontend domain for CORS"
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

variable "base_table_prefix" {
  description = "Base table prefix for database tables"
  type        = string
}

variable "preview_table_prefix_suffix" {
  description = "Additional suffix for preview environment table prefix"
  type        = string
  default     = "dev_"
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "supabase_access_token" {
  description = "Supabase access token"  
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





variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-northeast-1"
}
