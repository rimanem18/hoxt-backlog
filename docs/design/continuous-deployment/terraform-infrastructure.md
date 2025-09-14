# Terraform Infrastructure設計

作成日: 2025年09月12日
最終更新: 2025年09月12日

## インフラストラクチャ概要

Terraform を使用した AWS と CloudFlare のインフラ管理。GitHub OIDC による認証、S3+KMS によるstate管理、最小権限IAMロール設計を実装する。

## ディレクトリ構造

```
terraform/
├── environments/
│   ├── production/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── outputs.tf
│   └── preview/
│       ├── main.tf
│       ├── variables.tf
│       ├── terraform.tfvars  
│       └── outputs.tf
├── modules/
│   ├── iam-oidc/
│   ├── lambda-function/    # Preview環境用（Lambda本体管理）
│   ├── lambda-alias/       # Production環境用（エイリアス管理）
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
    # key     = "production/terraform.tfstate" (production環境)
    # key     = "preview/terraform.tfstate" (preview環境)  
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

## Production環境

### environments/production/main.tf
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

# GitHub OIDC Provider & IAM Role
module "github_oidc" {
  source = "../../modules/iam-oidc"
  
  project_name = local.project_name
  environment  = local.environment
  repository   = var.repository_name
  
  lambda_function_arn = module.lambda.function_arn
  s3_bucket_arn      = data.aws_s3_bucket.terraform_state.arn
  
  tags = local.common_tags
}

# Lambda Function
module "lambda" {
  source = "../../modules/lambda-function"
  
  project_name    = local.project_name
  environment     = local.environment
  function_name   = "${local.project_name}-api"  # REQ-101準拠: 単一関数名
  
  runtime         = "nodejs22.x"
  handler         = "index.handler"  # Hono Lambda adapter 固定
  memory_size     = 512
  timeout         = 30
  
  environment_variables = {
    NODE_ENV                = "production"
    SUPABASE_URL           = var.supabase_url
    SUPABASE_ACCESS_TOKEN  = var.supabase_access_token  # ワークフローとの統一
    JWT_SECRET             = var.jwt_secret
    TABLE_PREFIX           = var.base_table_prefix  # production環境: ベースプレフィックスをそのまま使用
  }
  
  tags = local.common_tags
}

# API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "${local.project_name}-api"  # REQ-101準拠: 単一API Gateway
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

resource "aws_apigatewayv2_stage" "main" {
  api_id = aws_apigatewayv2_api.main.id
  name   = "$default"
  
  auto_deploy = true
  
  default_route_settings {
    throttling_burst_limit   = 100
    throttling_rate_limit    = 50
  }
  
  tags = local.common_tags
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id = aws_apigatewayv2_api.main.id
  
  integration_uri    = module.lambda.invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  
  target = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda.function_name
  principal     = "apigateway.amazonaws.com"
  
  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# CloudFlare Pages
module "cloudflare_pages" {
  source = "../../modules/cloudflare-pages"
  
  project_name     = local.project_name
  environment      = local.environment
  domain           = var.domain_name
  
  production_branch = "main"
  build_command     = "bun run build"
  output_directory  = "out"
  
  environment_variables = {
    NEXT_PUBLIC_API_URL = aws_apigatewayv2_api.main.api_endpoint
    NODE_ENV           = "production"
  }
}

# Terraform State Bucket (作成済みの想定だが参照用)
data "aws_s3_bucket" "terraform_state" {
  bucket = var.terraform_state_bucket
}

# Monitoring & Logging
module "monitoring" {
  source = "../../modules/monitoring"
  
  project_name = local.project_name
  environment  = local.environment
  
  lambda_function_name = module.lambda.function_name
  api_gateway_id       = aws_apigatewayv2_api.main.id
  
  tags = local.common_tags
}
```

## Preview環境（REQ-405準拠: 片方向管理）

### environments/preview/main.tf
```hcl
locals {
  project_name = var.project_name
  environment  = "preview"
  
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "Terraform"
    Repository  = var.repository_name
  }
}

# Lambda Function（Preview環境がLambda本体を管理）
module "lambda" {
  source = "../../modules/lambda-function"
  
  project_name    = local.project_name
  environment     = local.environment
  function_name   = "${local.project_name}-api"
  
  runtime         = "nodejs22.x"
  handler         = "index.handler"
  memory_size     = 512
  timeout         = 30
  
  environment_variables = {
    NODE_ENV                = "development"
    SUPABASE_URL           = var.supabase_url
    SUPABASE_ACCESS_TOKEN  = var.supabase_access_token
    JWT_SECRET             = var.jwt_secret
    TABLE_PREFIX           = "${var.base_table_prefix}_dev"  # preview環境: ベースプレフィックス + _dev
  }
  
  tags = local.common_tags
}

# Preview Alias（$LATEST使用）
resource "aws_lambda_alias" "preview" {
  name             = "preview"
  description      = "Preview environment alias using $LATEST"
  function_name    = module.lambda.function_name
  function_version = "$LATEST"
  
  depends_on = [module.lambda]
}

# API Gateway（Preview用）
resource "aws_apigatewayv2_api" "preview" {
  name          = "${local.project_name}-api-preview"
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_credentials = false
    allow_headers     = ["content-type", "x-amz-date", "authorization"]
    allow_methods     = ["*"]
    allow_origins     = ["*"]  # Preview環境は制限緩和
    expose_headers    = ["date", "keep-alive"]
    max_age          = 86400
  }
  
  tags = local.common_tags
}

resource "aws_apigatewayv2_stage" "preview" {
  api_id = aws_apigatewayv2_api.preview.id
  name   = "$default"
  
  auto_deploy = true
  
  default_route_settings {
    throttling_burst_limit   = 50   # Preview環境は制限軽減
    throttling_rate_limit    = 25
  }
  
  tags = local.common_tags
}

resource "aws_apigatewayv2_integration" "lambda_preview" {
  api_id = aws_apigatewayv2_api.preview.id
  
  integration_uri    = "${module.lambda.invoke_arn}:preview"
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "preview_default" {
  api_id    = aws_apigatewayv2_api.preview.id
  route_key = "$default"
  
  target = "integrations/${aws_apigatewayv2_integration.lambda_preview.id}"
}

# Lambda Permission for API Gateway Preview
resource "aws_lambda_permission" "api_gateway_preview" {
  statement_id  = "AllowExecutionFromAPIGatewayPreview"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda.function_name
  principal     = "apigateway.amazonaws.com"
  qualifier     = aws_lambda_alias.preview.name
  
  source_arn = "${aws_apigatewayv2_api.preview.execution_arn}/*/*"
}
```

## Production環境（REQ-405準拠: エイリアス管理のみ）

### environments/production/main.tf
```hcl
locals {
  project_name = var.project_name
  environment  = "production"
  
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "Terraform"
    Repository  = var.repository_name
  }
}

# Lambda Function参照（Preview環境で管理済み）
data "aws_lambda_function" "api" {
  function_name = "${local.project_name}-api"
}

# Production Alias管理
module "lambda_alias" {
  source = "../../modules/lambda-alias"
  
  function_name    = data.aws_lambda_function.api.function_name
  alias_name       = "stable"
  description      = "Production stable version"
  function_version = var.promoted_version  # CI/CDから注入
  
  tags = local.common_tags
}

# API Gateway（Production用）
resource "aws_apigatewayv2_api" "production" {
  name          = "${local.project_name}-api"
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_credentials = false
    allow_headers     = ["content-type", "x-amz-date", "authorization"]
    allow_methods     = ["*"]
    allow_origins     = [var.frontend_domain]  # Production用制限
    expose_headers    = ["date", "keep-alive"]
    max_age          = 86400
  }
  
  tags = local.common_tags
}

resource "aws_apigatewayv2_stage" "production" {
  api_id = aws_apigatewayv2_api.production.id
  name   = "$default"
  
  auto_deploy = true
  
  default_route_settings {
    throttling_burst_limit   = 100
    throttling_rate_limit    = 50
  }
  
  tags = local.common_tags
}

resource "aws_apigatewayv2_integration" "lambda_production" {
  api_id = aws_apigatewayv2_api.production.id
  
  integration_uri    = "${data.aws_lambda_function.api.invoke_arn}:stable"
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "production_default" {
  api_id    = aws_apigatewayv2_api.production.id
  route_key = "$default"
  
  target = "integrations/${aws_apigatewayv2_integration.lambda_production.id}"
}

# Lambda Permission for API Gateway Production
resource "aws_lambda_permission" "api_gateway_production" {
  statement_id  = "AllowExecutionFromAPIGatewayProduction"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  qualifier     = module.lambda_alias.alias_name
  
  source_arn = "${aws_apigatewayv2_api.production.execution_arn}/*/*"
}
```

### environments/production/variables.tf
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

### environments/production/terraform.tfvars
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

## IAM OIDC モジュール

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

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-github-actions-${var.environment}"
  
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
            "token.actions.githubusercontent.com:sub" = "repo:${var.repository}:*"
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

# IAM Policy for Lambda deployment
resource "aws_iam_policy" "lambda_deploy" {
  name        = "${var.project_name}-lambda-deploy-${var.environment}"
  description = "Policy for deploying Lambda functions"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
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
      }
    ]
  })
  
  tags = var.tags
}

# IAM Policy for Terraform state management
resource "aws_iam_policy" "terraform_state" {
  name        = "${var.project_name}-terraform-state-${var.environment}"
  description = "Policy for managing Terraform state"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${var.s3_bucket_arn}/production/terraform.tfstate",
          "${var.s3_bucket_arn}/preview/terraform.tfstate"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = var.s3_bucket_arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:*:*:table/terraform-state-lock"
      }
    ]
  })
  
  tags = var.tags
}

# Attach policies to role
resource "aws_iam_role_policy_attachment" "lambda_deploy" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.lambda_deploy.arn
}

resource "aws_iam_role_policy_attachment" "terraform_state" {
  role       = aws_iam_role.github_actions.name  
  policy_arn = aws_iam_policy.terraform_state.arn
}
```

## Lambda Function モジュール

### modules/lambda-function/main.tf
```hcl
# Lambda Function
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
    variables = var.environment_variables
  }
  
  tags = var.tags
}

# Temporary Lambda package for initial creation (Hono Lambda adapter format)
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda.zip"
  
  source {
    content = <<-EOT
      // Temporary Hono Lambda handler for initial deployment
      import { Hono } from 'hono';
      import { handle } from 'hono/aws-lambda';
      
      const app = new Hono();
      app.get('/', (c) => c.json({ message: 'Hello from Hono on Lambda' }));
      
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

# Lambda Aliases for environment separation (REQ-101準拠)
resource "aws_lambda_alias" "stable" {
  name             = "stable"
  description      = "Production stable version"
  function_name    = aws_lambda_function.this.function_name
  function_version = aws_lambda_function.this.version
}

# Note: Preview environment uses $LATEST directly (no alias needed)
# This allows immediate deployment for preview while maintaining stable production
```

## CloudFlare Pages モジュール

### modules/cloudflare-pages/main.tf
```hcl
# CloudFlare Pages Project
resource "cloudflare_pages_project" "this" {
  account_id        = var.account_id
  name             = "${var.project_name}-${var.environment}"
  production_branch = var.production_branch
  
  build_config {
    build_command       = var.build_command
    destination_dir     = var.output_directory
    root_dir           = var.root_directory
    web_analytics_tag  = var.web_analytics_tag
    web_analytics_token = var.web_analytics_token
  }
  
  deployment_configs {
    production {
      environment_variables = var.environment_variables
    }
    
    preview {
      environment_variables = var.environment_variables
    }
  }
}

# CloudFlare DNS Record  
resource "cloudflare_record" "main" {
  zone_id = var.zone_id
  name    = var.environment == "production" ? "@" : var.environment
  value   = cloudflare_pages_project.this.subdomain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}
```

## 監視モジュール

### modules/monitoring/main.tf
```hcl
# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = 7
  
  tags = var.tags
}

resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${var.api_gateway_id}"  
  retention_in_days = 7
  
  tags = var.tags
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors lambda errors"
  
  dimensions = {
    FunctionName = var.lambda_function_name
  }
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${var.project_name}-${var.environment}-lambda-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Average"
  threshold           = "10000"
  alarm_description   = "This metric monitors lambda duration"
  
  dimensions = {
    FunctionName = var.lambda_function_name
  }
  
  tags = var.tags
}
```

## Lambda Alias モジュール（Production環境用）

### modules/lambda-alias/main.tf
```hcl
# Production Lambda Alias（Version管理）
resource "aws_lambda_alias" "this" {
  name             = var.alias_name
  description      = var.description
  function_name    = var.function_name
  function_version = var.function_version
  
  tags = var.tags
}

# Provisioned Concurrency（必要に応じて）
resource "aws_lambda_provisioned_concurrency_config" "this" {
  count                     = var.provisioned_concurrency_enabled ? 1 : 0
  function_name             = var.function_name
  provisioned_concurrent_executions = var.provisioned_concurrency
  qualifier                 = aws_lambda_alias.this.name
  
  depends_on = [aws_lambda_alias.this]
}
```

### modules/lambda-alias/variables.tf
```hcl
variable "function_name" {
  description = "Lambda function name"
  type        = string
}

variable "alias_name" {
  description = "Alias name"
  type        = string
}

variable "description" {
  description = "Alias description"
  type        = string
  default     = ""
}

variable "function_version" {
  description = "Lambda function version to point to"
  type        = string
}

variable "provisioned_concurrency_enabled" {
  description = "Enable provisioned concurrency"
  type        = bool
  default     = false
}

variable "provisioned_concurrency" {
  description = "Number of provisioned concurrent executions"
  type        = number
  default     = 0
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
```

### modules/lambda-alias/outputs.tf
```hcl
output "alias_name" {
  description = "Lambda alias name"
  value       = aws_lambda_alias.this.name
}

output "alias_arn" {
  description = "Lambda alias ARN"
  value       = aws_lambda_alias.this.arn
}

output "invoke_arn" {
  description = "Lambda alias invoke ARN"
  value       = aws_lambda_alias.this.invoke_arn
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
