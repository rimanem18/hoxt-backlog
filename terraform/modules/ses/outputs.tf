/**
 * SES招待メール送信モジュールの出力値
 */

output "identity_arn" {
  description = "SESドメインID ARN"
  value       = aws_sesv2_email_identity.domain.arn
}

output "dkim_tokens" {
  description = "Easy DKIM検証用トークン一覧"
  value       = aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens
}

output "dkim_dns_records" {
  description = "DKIM検証のためDNSへ手動登録が必要なCNAMEレコード一覧"
  value = [
    for token in aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens : {
      name  = "${token}._domainkey.${var.domain_name}"
      type  = "CNAME"
      value = "${token}.dkim.amazonses.com"
    }
  ]
}

output "from_address_production" {
  description = "Production環境の招待メール送信元アドレス"
  value       = local.from_address_production
}

output "from_address_preview" {
  description = "Preview環境の招待メール送信元アドレス"
  value       = local.from_address_preview
}

output "lambda_ses_send_policy_arn" {
  description = "Lambda実行ロールにアタッチするSES送信ポリシーARN"
  value       = aws_iam_policy.lambda_ses_send.arn
}
