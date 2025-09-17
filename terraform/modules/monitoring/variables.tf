/**
 * 監視モジュール変数定義
 */

variable "project_name" {
  description = "Project name for resource prefixes"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "lambda_function_name" {
  description = "Lambda function name to monitor"
  type        = string
}


variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}