# 環境別Lambda Function変数定義

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "function_name" {
  description = "Lambda function name"
  type        = string
}

variable "environment" {
  description = "Environment name (production or preview)"
  type        = string
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs22.x"
}

variable "handler" {
  description = "Lambda handler"
  type        = string
  default     = "index.handler"
}

variable "memory_size" {
  description = "Lambda memory size"
  type        = number
  default     = 512
}

variable "timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "base_environment_variables" {
  description = "Base environment variables for Lambda function"
  type        = map(string)
  default     = {}
}

variable "cors_allow_origin" {
  description = "CORS allow origin for Function URL"
  type        = string
  default     = "*"
}

variable "lambda_role_arn" {
  description = "Lambda execution role ARN"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}