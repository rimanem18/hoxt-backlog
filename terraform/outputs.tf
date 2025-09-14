/**
 * Terraform出力値
 * 作成されたリソースの情報を他の設定で参照可能にする
 */

output "terraform_state_bucket" {
  description = "Terraform state用S3バケット名"
  value       = aws_s3_bucket.terraform_state.bucket
}

output "terraform_lock_table" {
  description = "Terraform lock用DynamoDBテーブル名"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "kms_key_id" {
  description = "State暗号化用KMSキーID"
  value       = aws_kms_key.terraform_state.key_id
  sensitive   = true
}

output "kms_key_alias" {
  description = "State暗号化用KMSキーエイリアス"
  value       = aws_kms_alias.terraform_state.name
}

output "aws_account_id" {
  description = "現在のAWSアカウントID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "使用中のAWSリージョン"
  value       = var.aws_region
}