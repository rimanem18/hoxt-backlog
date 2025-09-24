# CI/CD Application Variables

variable "project_name" {
  description = "Project name for resource identification"
  type        = string
}

variable "repository_name" {
  description = "Repository name for tags (owner/repo format)"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}


variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-northeast-1"
}