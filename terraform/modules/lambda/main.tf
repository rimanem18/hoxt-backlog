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
# Preview環境: $LATEST使用（GitHub Actionsから直接更新）
# Production環境: versioned alias使用（GitHub Actionsでversion発行→alias更新）
resource "aws_lambda_alias" "stable" {
  name             = "stable"
  description      = "Production stable version"
  function_name    = aws_lambda_function.this.function_name
  function_version = "1"  # GitHub Actionsから更新される
  
  lifecycle {
    ignore_changes = [function_version]
  }
}

# Lambda package from build output
# Makefileでbun run build:lambdaを実行してterraform/lambda/lambda.jsにコピー
locals {
  lambda_js_path = "${path.root}/lambda/lambda.js"
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda.zip"
  
  # 実際のビルド成果物が存在する場合はそれを使用
  dynamic "source" {
    for_each = fileexists(local.lambda_js_path) ? [1] : []
    content {
      content  = file(local.lambda_js_path)
      filename = "index.js"
    }
  }
  
  # フォールバック用の仮ファイル（ビルド成果物が存在しない場合）
  dynamic "source" {
    for_each = fileexists(local.lambda_js_path) ? [] : [1]
    content {
      content = <<-EOT
        // Temporary Hono Lambda handler for initial deployment
        export const handler = async (event, context) => {
          return {
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: "Hello from Unified Hono Lambda - Temporary Handler",
              environment: process.env.NODE_ENV || "development",
              version: context.functionVersion
            })
          };
        };
      EOT
      filename = "index.js"
    }
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