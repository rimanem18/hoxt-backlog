# Bootstrap Infrastructure Variables

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "repository_name" {
  description = "GitHub repository name (org/repo format)"
  type        = string
}

variable "domain_name" {
  description = "Production domain name"
  type        = string
}

variable "cloudflare_account_id" {
  description = "CloudFlare account ID"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

variable "access_allow_origin_production" {
  description = "Production CORS allow origin URL"
  type        = string
}

variable "access_allow_origin_preview" {
  description = "Preview CORS allow origin URL (supports wildcard)"
  type        = string
}

variable "metrics_namespace" {
  description = "Metrics namespace for application monitoring (platform-agnostic)"
  type        = string
  default     = "Application/Monitoring"
}

variable "next_public_supabase_url" {
  description = "Supabase project URL for authentication (shared with frontend)"
  type        = string
  sensitive   = true
}