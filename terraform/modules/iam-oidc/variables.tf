/**
 * GitHub OIDC認証モジュールの変数定義
 */

variable "project_name" {
  description = "Project name for resource prefixes"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "repository_name" {
  description = "GitHub repository name (owner/repo format)"
  type        = string
}

variable "terraform_state_bucket_arn" {
  description = "S3 bucket ARN for Terraform state"
  type        = string
}

variable "terraform_locks_table_arn" {
  description = "DynamoDB table ARN for Terraform locks"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}