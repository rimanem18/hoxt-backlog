# 統合Lambda Function変数定義

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "function_name" {
  description = "Lambda function name"
  type        = string
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs20.x"
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

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}