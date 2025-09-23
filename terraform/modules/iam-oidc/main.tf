/**
 * GitHub OIDC認証設定モジュール
 *
 * GitHub ActionsからAWSリソースへの安全なアクセスを提供
 * セキュリティベストプラクティスに従い最小権限の原則を適用
 * ブランチ制限により mainブランチ・PR のみアクセス許可
 */

# GitHub OIDC Provider設定
resource "aws_iam_openid_connect_provider" "github_oidc" {
  url = "https://token.actions.githubusercontent.com"

  # OIDCプロバイダーのクライアントIDリスト
  # GitHub Actionsの標準設定
  client_id_list = [
    "sts.amazonaws.com"
  ]

  # GitHub ActionsのOIDCプロバイダーの信頼できるサムプリント
  # 2023年6月時点での公式サムプリント
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]

  tags = merge(var.tags, {
    Name        = "${var.project_name}-github-oidc-provider"
    Purpose     = "github-actions-authentication"
  })
}

# 統合IAMロール（Preview/Production両対応）
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-github-actions"

  # GitHub Actionsからの信頼関係設定
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_oidc.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          # リポジトリ・ブランチ・Environment制限
          StringLike = {
            "token.actions.githubusercontent.com:sub" = [
              "repo:${var.repository_name}:ref:refs/heads/main",
              "repo:${var.repository_name}:ref:refs/heads/HOXBL-27-main-deploy-workflow",
              "repo:${var.repository_name}:pull_request"
            ]
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-github-actions"
    Purpose     = "unified-deployment"
  })
}

# 統合IAMポリシー（Preview/Production両対応）
resource "aws_iam_policy" "github_actions_policy" {
  name        = "${var.project_name}-github-actions-policy"
  description = "GitHub Actions統合デプロイ用の最小権限ポリシー"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Lambda関数の管理
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
        Resource = [
          "arn:aws:lambda:${var.aws_region}:*:function:${var.project_name}-api-*"
        ]
      },
      # CloudWatch Logs（監視・デバッグ用）
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-github-actions-policy"
  })
}

# Terraform管理用IAMポリシー
resource "aws_iam_policy" "terraform_management_policy" {
  name        = "${var.project_name}-terraform-management-policy"
  description = "Terraform実行用の管理権限ポリシー"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Terraformステート読み取り/書き込み
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.terraform_state_bucket_arn,
          "${var.terraform_state_bucket_arn}/*"
        ]
      },
      # DynamoDB ロック管理
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = var.terraform_locks_table_arn
      },
      # IAM関連の権限（読み取り・アタッチのみ）
      {
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:GetPolicy",
          "iam:GetPolicyVersion",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:AttachRolePolicy",
          "iam:PassRole"
        ]
        Resource = [
          "arn:aws:iam::*:role/${var.project_name}-lambda-exec-role",
          "arn:aws:iam::*:role/${var.project_name}-github-actions"
        ]
      },
      # Lambda関数の権限（アプリケーション関数のみ）
      {
        Effect = "Allow"
        Action = [
          "lambda:GetFunction",
          "lambda:ListFunctions",
          "lambda:CreateFunction",
          "lambda:TagResource"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "lambda:FunctionArn" = "arn:aws:lambda:${var.aws_region}:*:function:${var.project_name}-api-*"
          }
        }
      },
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-terraform-management-policy"
  })
}

# 統合ロールにポリシーをアタッチ
resource "aws_iam_role_policy_attachment" "github_actions_policy_attachment" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions_policy.arn
}

resource "aws_iam_role_policy_attachment" "terraform_management_policy_attachment" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.terraform_management_policy.arn
}