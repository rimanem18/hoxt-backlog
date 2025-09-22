# Terraform Infrastructure設計

作成日: 2025年09月12日
最終更新: 2025年09月17日


## インフラストラクチャ概要

Terraform を使用した AWS と CloudFlare のインフラ管理。Lambda Function URL による環境別分離、GitHub OIDC 統合ロールによる認証、S3+KMS によるstate管理、GitHub Environment条件による権限制御を実装する。

## ディレクトリ構造

```
terraform/
├── main.tf                 # 統合環境設定
├── variables.tf
├── terraform.tfvars
├── outputs.tf
├── modules/
│   ├── iam-oidc/           # 統合OIDC認証
│   ├── lambda/     # 環境別Lambda関数管理
│   ├── cloudflare-pages/
│   └── monitoring/
├── backend.tf
└── versions.tf
```

## バックエンド設定

### backend.tf
```hcl
terraform {
  backend "s3" {
    # 動的設定（terraform init時に指定）
    # bucket  = "terraform-state-bucket"
    # key     = "unified/terraform.tfstate" (統合環境)
    # region  = "ap-northeast-1"
    # encrypt = true
    # kms_key_id = "arn:aws:kms:ap-northeast-1:123456789012:key/xxxxx"
    
    dynamodb_table = "terraform-state-lock"
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
```

## プロバイダー設定

### versions.tf
```hcl
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name  # REQ-402準拠: ハードコード除去
      Environment = var.environment
      ManagedBy   = "Terraform"
      Repository  = var.repository_name  # REQ-402準拠: ハードコード除去
    }
  }
}

provider "cloudflare" {
  # API tokenは環境変数 CLOUDFLARE_API_TOKEN で設定
}
```

## 統合環境設定

### main.tf
```hcl
locals {
  project_name = var.project_name  # REQ-402準拠: ハードコード除去
  environment  = var.environment
  
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "Terraform"
    Repository  = var.repository_name  # REQ-402準拠: ハードコード除去
  }
}

# GitHub OIDC Provider & 統合IAM Role（ブランチ制限付き）
module "github_oidc" {
  source = "./modules/iam-oidc"
  
  project_name = local.project_name
  repository   = var.repository_name
  
  # ブランチ制限: mainブランチ・PR のみアクセス許可
  # feature/develop等のブランチからは実行不可
  lambda_function_arn = module.lambda.function_arn
  s3_bucket_arn      = data.aws_s3_bucket.terraform_state.arn
  
  tags = local.common_tags
}

# 環境別Lambda Functions（完全分離）
module "lambda_production" {
  source = "./modules/lambda"
  
  project_name    = local.project_name
  function_name   = "${local.project_name}-api-production"
  environment     = "production"
  
  runtime         = "nodejs22.x"
  handler         = "index.handler"  # Hono Lambda adapter 固定
  memory_size     = 512
  timeout         = 30
  
  # Production環境変数
  base_environment_variables = {
    SUPABASE_URL           = var.supabase_url
    SUPABASE_JWT_SECRET    = var.jwt_secret
    BASE_SCHEMA           = var.project_name
    DATABASE_URL           = var.database_url
    NODE_ENV              = "production"
    ACCESS_ALLOW_ORIGIN   = var.access_allow_origin
    ACCESS_ALLOW_METHODS  = join(", ", var.access_allow_methods)
    ACCESS_ALLOW_HEADERS   = join(", ", var.access_allow_headers)
  }
  
  tags = merge(local.common_tags, { Environment = "production" })
}

module "lambda_preview" {
  source = "./modules/lambda"
  
  project_name    = local.project_name
  function_name   = "${local.project_name}-api-preview"
  environment     = "preview"
  
  runtime         = "nodejs22.x"
  handler         = "index.handler"  # Hono Lambda adapter 固定
  memory_size     = 512
  timeout         = 30
  
  # Preview環境変数（dev接尾辞付き）
  base_environment_variables = {
    SUPABASE_URL           = var.supabase_url
    SUPABASE_JWT_SECRET    = var.jwt_secret
    BASE_SCHEMA           = "${var.project_name}_preview"
    DATABASE_URL           = var.database_url
    NODE_ENV              = "development"
    ACCESS_ALLOW_ORIGIN   = var.access_allow_origin
    ACCESS_ALLOW_METHODS  = join(", ", var.access_allow_methods)
    ACCESS_ALLOW_HEADERS   = join(", ", var.access_allow_headers)
  }
  
  tags = merge(local.common_tags, { Environment = "preview" })
}

# CloudFlare Pages（統合管理）
module "cloudflare_pages" {
  source = "./modules/cloudflare-pages"
  
  project_name     = local.project_name
  domain           = var.domain_name
  
  production_branch = "main"
  build_command     = "bun run build"
  output_directory  = "out"
  
  environment_variables = {
    LAMBDA_FUNCTION_URL_PRODUCTION = module.lambda_production.function_url
    LAMBDA_FUNCTION_URL_PREVIEW    = module.lambda_preview.function_url
    NODE_ENV                      = "production"
    # 注記: アプリケーション内で環境に応じたFunction URLを選択
  }
}

# Terraform State Bucket (作成済みの想定だが参照用)
data "aws_s3_bucket" "terraform_state" {
  bucket = var.terraform_state_bucket
}

# Monitoring & Logging
module "monitoring" {
  source = "./modules/monitoring"
  
  project_name = local.project_name
  
  lambda_function_names = [
    module.lambda_production.function_name,
    module.lambda_preview.function_name
  ]
  
  tags = local.common_tags
}
```

## 環境別Lambda関数モジュール

### modules/lambda/main.tf
```hcl
# 環境別Lambda Function
resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role         = aws_iam_role.lambda_exec.arn
  
  runtime     = var.runtime
  handler     = var.handler
  memory_size = var.memory_size
  timeout     = var.timeout
  
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  
  environment {
    variables = var.base_environment_variables
  }
  
  tags = var.tags
}

# Lambda Function URL（環境別に独立したHTTPSエンドポイント）
resource "aws_lambda_function_url" "this" {
  function_name      = aws_lambda_function.this.function_name
  authorization_type = "NONE"
  
  cors {
    allow_credentials = false
    allow_headers     = ["content-type", "authorization"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins     = [var.cors_allow_origin]
    expose_headers    = ["date", "keep-alive"]
    max_age          = 86400
  }
}

# Temporary Lambda package for initial creation
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda.zip"
  
  source {
    content = <<-EOT
      // Temporary Hono Lambda handler for initial deployment
      import { Hono } from 'hono';
      import { handle } from 'hono/aws-lambda';
      
      const app = new Hono();
      app.get('/', (c) => c.json({ 
        message: 'Hello from ${var.environment} Hono Lambda',
        environment: '${var.environment}',
        timestamp: new Date().toISOString()
      }));
      
      export const handler = handle(app);
    EOT
    filename = "index.js"
  }
}

# Lambda Execution Role
resource "aws_iam_role" "lambda_exec" {
  name = "${var.function_name}-exec-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.tags
}

# Lambda Basic Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

### variables.tf
```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "frontend_domain" {
  description = "Frontend domain for CORS"
  type        = string
}

variable "project_name" {
  description = "Project name for resource prefixes"
  type        = string
}

variable "repository_name" {
  description = "Repository name for IAM and tags"
  type        = string
}

variable "preview_table_prefix_suffix" {
  description = "Suffix for preview environment table prefix"
  type        = string
  default     = "_dev"
}

variable "access_allow_origin" {
  description = "CORS allow origin"
  type        = string
  default     = "http://localhost:3000"
}

variable "access_allow_methods" {
  description = "CORS allow methods list"
  type        = list(string)
  default     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}

variable "access_allow_headers" {
  description = "CORS allow headers list"
  type        = list(string)
  default     = ["Content-Type", "Authorization"]
}

variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

variable "base_schema" {
  description = "Base PostgreSQL schema name for database environment separation"
  type        = string
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "promoted_version" {
  description = "Lambda function version to promote to stable alias"
  type        = string
  default     = "1"
}
```

### terraform.tfvars
```hcl
aws_region         = "ap-northeast-1"
environment        = "production"
domain_name        = "your-domain.com"
frontend_domain    = "https://your-domain.com"
project_name       = "your-project"
repository_name    = "owner/your-repo"
base_schema       = "projectname"

# Sensitive variables are set via GitHub Secrets or environment variables
# supabase_url = "https://xxxxx.supabase.co"
# supabase_access_token = "sbp_xxxxxxxxxxxxx"
# jwt_secret = "your-jwt-secret"
```

## 統合IAM OIDC モジュール

### modules/iam-oidc/main.tf
```hcl
# GitHub OIDC Provider
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  count = length(data.aws_iam_openid_connect_provider.github.arn) == 0 ? 1 : 0
  
  url = "https://token.actions.githubusercontent.com"
  
  client_id_list = [
    "sts.amazonaws.com",
  ]
  
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]
  
  tags = var.tags
}

# 単一IAM Role for GitHub Actions（Production/Preview共通）
resource "aws_iam_role" "github_actions_unified" {
  name = "${var.project_name}-github-actions-unified"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = coalesce(
            try(data.aws_iam_openid_connect_provider.github.arn, ""),
            try(aws_iam_openid_connect_provider.github[0].arn, "")
          )
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = [
              "repo:${var.repository}:environment:production",
              "repo:${var.repository}:environment:preview",
              "repo:${var.repository}:ref:refs/heads/main"
            ]
          }
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
  
  tags = var.tags
}

# 統合デプロイポリシー（最小権限）
resource "aws_iam_policy" "unified_deploy" {
  name        = "${var.project_name}-unified-deploy"
  description = "Unified deployment policy for GitHub Actions"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "TerraformState"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.s3_bucket_arn,
          "${var.s3_bucket_arn}/*"
        ]
      },
      {
        Sid = "TerraformStateLock"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:*:*:table/terraform-state-lock"
      },
      {
        Sid = "LambdaDeploy"
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:PublishVersion",
          "lambda:UpdateAlias",
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration"
        ]
        Resource = var.lambda_function_arn
      },
      {
        Sid = "PassExecutionRole"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = "${replace(var.lambda_function_arn, ":function:", ":role/")}-exec-role"
      }
    ]
  })
  
  tags = var.tags
}

# Attach unified policy to role
resource "aws_iam_role_policy_attachment" "unified_deploy" {
  role       = aws_iam_role.github_actions_unified.name
  policy_arn = aws_iam_policy.unified_deploy.arn
}
```


## State管理とセキュリティ

### Terraform State S3 Bucket (事前作成)
```hcl
# 手動作成が必要なリソース
# State管理リソースは別途作成・管理（REQ-402準拠）
data "aws_s3_bucket" "terraform_state" {
  bucket = var.terraform_state_bucket
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = data.aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "terraform_state" {
  bucket = data.aws_s3_bucket.terraform_state.id
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.terraform_state.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

resource "aws_kms_key" "terraform_state" {
  description = "KMS key for Terraform state encryption"
}

resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = "terraform-state-lock"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
}
```
