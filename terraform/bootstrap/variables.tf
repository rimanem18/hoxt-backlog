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