/**
 * SES招待メール送信モジュール
 *
 * viewer招待メール送信用のSESドメインID（Easy DKIM）と、
 * Lambda実行ロールにアタッチする最小権限IAMポリシーを提供する。
 * DNSへのDKIMレコード登録・SESサンドボックス解除は本モジュールのスコープ外（手動対応）。
 */

locals {
  from_address_production = "${var.from_local_part_production}@${var.domain_name}"
  from_address_preview    = "${var.from_local_part_preview}@${var.domain_name}"
}

# SES送信ドメインID（Easy DKIM）
resource "aws_sesv2_email_identity" "domain" {
  email_identity = var.domain_name

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-ses-domain-identity"
  })
}

# Lambda実行ロール向け送信権限ポリシー
# ses:SendEmailのみ許可し、Resourceをドメイン識別子・From差出人を許可アドレスに限定する
resource "aws_iam_policy" "lambda_ses_send" {
  name = "${var.project_name}-lambda-ses-send-policy"
  # IAMポリシーのdescriptionは作成後に変更不可のため、手動作成時に設定した値と一致させる
  description = "LeastPrivilegePolicy-AllowOnly-ses.SendEmail-ForInvitationEmails"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail"]
        Resource = aws_sesv2_email_identity.domain.arn
        Condition = {
          StringEquals = {
            "ses:FromAddress" = [
              local.from_address_production,
              local.from_address_preview,
            ]
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-lambda-ses-send-policy"
  })
}
