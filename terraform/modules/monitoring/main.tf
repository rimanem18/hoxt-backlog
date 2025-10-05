/**
 * 監視モジュール
 * CloudWatchログとアラーム設定
 */

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = 7

  tags = var.tags
}

# SNS Topic for alarm notifications
resource "aws_sns_topic" "lambda_alerts" {
  count = length(var.alarm_emails) > 0 ? 1 : 0

  name = "${var.project_name}-${var.environment}-lambda-alerts"
  tags = var.tags
}

# Email subscriptions for alarm notifications
resource "aws_sns_topic_subscription" "lambda_alerts_email" {
  for_each = toset(var.alarm_emails)

  topic_arn = aws_sns_topic.lambda_alerts[0].arn
  protocol  = "email"
  endpoint  = each.value
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

  alarm_actions = try([one(aws_sns_topic.lambda_alerts[*].arn)], [])
  ok_actions    = try([one(aws_sns_topic.lambda_alerts[*].arn)], [])

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

  alarm_actions = try([one(aws_sns_topic.lambda_alerts[*].arn)], [])
  ok_actions    = try([one(aws_sns_topic.lambda_alerts[*].arn)], [])

  tags = var.tags
}