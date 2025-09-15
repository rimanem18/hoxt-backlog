# Terraform Infrastructure設計

作成日: 2025年09月12日
最終更新: 2025年09月14日


## インフラストラクチャ概要

Terraform を使用した AWS と CloudFlare のインフラ管理。GitHub OIDC 統合ロールによる認証、S3+KMS によるstate管理、GitHub Environment条件による権限制御を実装する。

## ディレクトリ構造

```
terraform/
├── main.tf                 # 統合環境設定
├── variables.tf
├── terraform.tfvars
├── outputs.tf
├── modules/
│   ├── iam-oidc/           # 統合OIDC認証
│   ├── lambda-unified/     # 統合Lambda関数管理
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

# GitHub OIDC Provider & 統合IAM Role
module "github_oidc" {
  source = "./modules/iam-oidc"
  
  project_name = local.project_name
  repository   = var.repository_name
  
  lambda_function_arn = module.lambda_unified.function_arn
  s3_bucket_arn      = data.aws_s3_bucket.terraform_state.arn
  
  tags = local.common_tags
}

# 統合Lambda Function（Production/Preview両対応）
module "lambda_unified" {
  source = "./modules/lambda-unified"
  
  project_name    = local.project_name
  function_name   = "${local.project_name}-api"  # 単一関数名
  
  runtime         = "nodejs22.x"
  handler         = "index.handler"  # Hono Lambda adapter 固定
  memory_size     = 512
  timeout         = 30
  
  # 環境変数は実行時にGitHub Actionsから注入
  base_environment_variables = {
    SUPABASE_URL           = var.supabase_url
    SUPABASE_ACCESS_TOKEN  = var.supabase_access_token
    JWT_SECRET             = var.jwt_secret
    BASE_TABLE_PREFIX      = var.base_table_prefix
  }
  
  tags = local.common_tags
}

# API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "${local.project_name}-api"  # REQ-406準拠: API Gateway環境別分離
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_credentials = false
    allow_headers     = ["content-type", "x-amz-date", "authorization"]
    allow_methods     = ["*"]
    allow_origins     = [var.frontend_domain]
    expose_headers    = ["date", "keep-alive"]
    max_age          = 86400
  }
  
  tags = local.common_tags
}

# API Gateway Stages（環境別分離）
resource "aws_apigatewayv2_stage" "preview" {
  api_id = aws_apigatewayv2_api.main.id
  name   = "preview"
  
  auto_deploy = true
  
  default_route_settings {
    throttling_burst_limit   = 100
    throttling_rate_limit    = 50
  }
  
  tags = merge(local.common_tags, {
    Environment = "preview"
  })
}

resource "aws_apigatewayv2_stage" "production" {
  api_id = aws_apigatewayv2_api.main.id
  name   = "production"
  
  auto_deploy = true
  
  default_route_settings {
    throttling_burst_limit   = 100
    throttling_rate_limit    = 50
  }
  
  tags = merge(local.common_tags, {
    Environment = "production"
  })
}

# Lambda Integrations（環境別エイリアス対応）
resource "aws_apigatewayv2_integration" "lambda_preview" {
  api_id = aws_apigatewayv2_api.main.id
  
  integration_uri    = module.lambda_unified.invoke_arn  # $LATEST
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_integration" "lambda_production" {
  api_id = aws_apigatewayv2_api.main.id
  
  integration_uri    = module.lambda_unified.stable_alias_invoke_arn  # stable alias
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

# Routes（ステージ別設定）
resource "aws_apigatewayv2_route" "preview" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  
  target = "integrations/${aws_apigatewayv2_integration.lambda_preview.id}"
}

resource "aws_apigatewayv2_route" "production" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  
  target = "integrations/${aws_apigatewayv2_integration.lambda_production.id}"
}

# Lambda Permissions for API Gateway（環境別）
resource "aws_lambda_permission" "api_gateway_preview" {
  statement_id  = "AllowExecutionFromAPIGatewayPreview"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_unified.function_name
  principal     = "apigateway.amazonaws.com"
  
  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/preview/*"
}

resource "aws_lambda_permission" "api_gateway_production" {
  statement_id  = "AllowExecutionFromAPIGatewayProduction"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_unified.function_name
  qualifier     = "stable"  # alias指定
  principal     = "apigateway.amazonaws.com"
  
  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/production/*"
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
    API_GATEWAY_BASE_URL = aws_apigatewayv2_api.main.api_endpoint
    NODE_ENV            = "production"
    # 注記: アプリケーション内で ${API_GATEWAY_BASE_URL}/${ENVIRONMENT} として動的構築
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
  
  lambda_function_name = module.lambda_unified.function_name
  api_gateway_id       = aws_apigatewayv2_api.main.id
  
  tags = local.common_tags
}
```

## 統合Lambda関数モジュール

### modules/lambda-unified/main.tf
```hcl
# 統合Lambda Function（Production/Preview両対応）
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

# Lambda Aliases for environment management
resource "aws_lambda_alias" "stable" {
  name             = "stable"
  description      = "Production stable version"
  function_name    = aws_lambda_function.this.function_name
  function_version = "1"  # GitHub Actionsから更新
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
      app.get('/', (c) => c.json({ message: 'Hello from Unified Hono Lambda' }));
      
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

variable "base_table_prefix" {
  description = "Base table prefix for database tables"
  type        = string
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "supabase_access_token" {
  description = "Supabase access token"  
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
base_table_prefix  = "prefix"

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
