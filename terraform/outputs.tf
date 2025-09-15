# 統合Terraform設定出力値

output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.lambda_unified.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = module.lambda_unified.function_arn
}

output "api_gateway_production_url" {
  description = "API Gateway Production URL"
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/production"
}

output "api_gateway_preview_url" {
  description = "API Gateway Preview URL"
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/preview"
}

output "github_actions_role_arn" {
  description = "GitHub Actions unified IAM role ARN"
  value       = module.github_oidc.github_actions_role_arn
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}
