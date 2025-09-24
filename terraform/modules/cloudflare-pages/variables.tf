/**
 * CloudFlare Pages参照モジュール変数定義
 * 既存プロジェクトをdata sourceとして参照
 */

variable "account_id" {
  description = "CloudFlare account ID"
  type        = string
}

variable "project_name" {
  description = "Project name for existing Pages project"
  type        = string
}

variable "domain_name" {
  description = "Production domain name"
  type        = string
}