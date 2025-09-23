# Terraformアプリケーションリソース用Provider設定

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  # S3バックエンド設定（CI/CDから設定される）
  backend "s3" {
    # バケット名、キー、リージョンはCI/CDから動的に設定
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project    = var.project_name
      ManagedBy  = "Terraform"
      Repository = var.repository_name
      Layer      = "Application"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}