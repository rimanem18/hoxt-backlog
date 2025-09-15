/**
 * Terraform Backend設定
 * 統合State管理
 */

terraform {
  backend "s3" {
    # 動的設定（terraform init時に指定）
    # bucket  = "terraform-state-bucket"
    # key     = "unified/terraform.tfstate" (統合環境)
    # region  = "ap-northeast-1"
    # encrypt = true
    # kms_key_id = "arn:aws:kms:ap-northeast-1:123456789012:key/xxxxx"
    # dynamodb_table = "terraform-state-locks"
  }
}
