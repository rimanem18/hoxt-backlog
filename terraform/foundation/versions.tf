# Terraform基盤リソース用Provider設定

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # 基盤はローカル実行のため、backendは後で設定
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project    = var.project_name
      ManagedBy  = "Terraform"
      Repository = var.repository_name
      Layer      = "Foundation"
    }
  }
}