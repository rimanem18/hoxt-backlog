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
    allow_methods     = ["*"]
    allow_origins     = [var.cors_allow_origin]
    expose_headers    = ["date", "keep-alive"]
    max_age          = 86400
  }
}

# Lambda package from build output
# ビルド成果物は modules/lambda/lambda.js に配置される
locals {
  lambda_js_path = "${path.module}/lambda.js"
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
              message: "Hello from ${var.environment} Hono Lambda - Temporary Handler",
              environment: process.env.NODE_ENV || "development",
              lambda_environment: "${var.environment}",
              timestamp: new Date().toISOString()
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
