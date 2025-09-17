/**
 * Terraform Backend設定
 * 統合State管理
 */

terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
