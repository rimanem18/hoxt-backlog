/**
 * Terraform設定用変数定義
 */

variable "aws_region" {
  description = "AWS リージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "環境名（dev, staging, production）"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "プロジェクト名"
  type        = string
  default     = "your-project"
}

variable "state_bucket_name" {
  description = "Terraform state用S3バケット名"
  type        = string
  default     = ""
}

variable "lock_table_name" {
  description = "Terraform state lock用DynamoDBテーブル名"
  type        = string
  default     = ""
}
