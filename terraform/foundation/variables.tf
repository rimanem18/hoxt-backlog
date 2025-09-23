# Terraform基盤リソース用変数定義

variable "project_name" {
  description = "Project name for resource prefixes"
  type        = string
}

variable "repository_name" {
  description = "Repository name for IAM and tags (owner/repo format)"
  type        = string
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-northeast-1"
}