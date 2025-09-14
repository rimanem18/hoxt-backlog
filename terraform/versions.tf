/**
 * Terraformとプロバイダーのバージョン制約定義
 */
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }
}

/**
 * AWS プロバイダー設定
 * デフォルトタグを全リソースに適用
 */
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "your-project"
      Environment = var.environment
      ManagedBy   = "terraform"
      CreatedAt   = formatdate("YYYY-MM-DD", timestamp())
    }
  }
}
