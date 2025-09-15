# 統合Lambda Function出力値

output "function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.this.function_name
}

output "function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.this.arn
}

output "invoke_arn" {
  description = "Lambda function invoke ARN"
  value       = aws_lambda_function.this.invoke_arn
}

output "stable_alias_arn" {
  description = "Lambda stable alias ARN"
  value       = aws_lambda_alias.stable.arn
}

output "stable_alias_invoke_arn" {
  description = "Lambda stable alias invoke ARN"
  value       = aws_lambda_alias.stable.invoke_arn
}