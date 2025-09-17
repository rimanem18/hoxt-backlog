/**
 * GitHub OIDC認証モジュールの出力値
 */

output "github_oidc_provider_arn" {
  description = "GitHub OIDC Provider ARN"
  value       = aws_iam_openid_connect_provider.github_oidc.arn
}

output "github_actions_role_arn" {
  description = "GitHub Actions unified IAM role ARN"
  value       = aws_iam_role.github_actions.arn
}

output "github_actions_role_name" {
  description = "GitHub Actions unified IAM role name"
  value       = aws_iam_role.github_actions.name
}

output "github_actions_policy_arn" {
  description = "GitHub Actions policy ARN"
  value       = aws_iam_policy.github_actions_policy.arn
}

output "terraform_management_policy_arn" {
  description = "Terraform management policy ARN"
  value       = aws_iam_policy.terraform_management_policy.arn
}