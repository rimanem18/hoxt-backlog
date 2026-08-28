/**
 * SES招待メール送信モジュールの変数定義
 */

variable "project_name" {
  description = "Project name for resource prefixes"
  type        = string
}

variable "domain_name" {
  description = "SES送信ドメイン識別子として検証するドメイン名"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "from_local_part_production" {
  description = "Production環境の送信元メールアドレスのローカルパート"
  type        = string
  default     = "noreply"
}

variable "from_local_part_preview" {
  description = "Preview環境の送信元メールアドレスのローカルパート"
  type        = string
  default     = "noreply-preview"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
