/**
 * 監視モジュール出力値
 */

output "lambda_log_group_name" {
  description = "Lambda CloudWatch log group name"
  value       = aws_cloudwatch_log_group.lambda_logs.name
}

output "api_gateway_log_group_name" {
  description = "API Gateway CloudWatch log group name"
  value       = aws_cloudwatch_log_group.api_gateway_logs.name
}

output "lambda_error_alarm_arn" {
  description = "Lambda error alarm ARN"
  value       = aws_cloudwatch_metric_alarm.lambda_errors.arn
}

output "lambda_duration_alarm_arn" {
  description = "Lambda duration alarm ARN"
  value       = aws_cloudwatch_metric_alarm.lambda_duration.arn
}