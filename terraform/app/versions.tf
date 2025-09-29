terraform {
  # S3 Backend設定（GitHub Actionsで動的設定）
  backend "s3" {
    # 動的設定（terraform init時に指定）
    # bucket         = "project-terraform-state"
    # key            = "app/terraform.tfstate"
    # region         = "ap-northeast-1"
    # dynamodb_table = "project-terraform-locks"
    # encrypt        = true
  }
  
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
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      ManagedBy   = "Terraform"
      Repository  = var.repository_name
      Layer       = "Application"
    }
  }
}

provider "cloudflare" {
  # API tokenは環境変数 CLOUDFLARE_API_TOKEN で設定
}