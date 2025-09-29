#!/bin/sh

# Terraform環境変数のデバッグ表示（機密情報は除く）
echo "=== Terraform Environment Setup ==="
echo "AWS_REGION: ${AWS_REGION}"
echo "TF_VAR_environment: ${TF_VAR_environment}"
echo "TF_VAR_aws_region: ${TF_VAR_aws_region}"
echo "TF_VAR_project_name: ${TF_VAR_project_name}"
echo "TF_VAR_repository_name: ${TF_VAR_repository_name}"
echo "TF_VAR_domain_name: ${TF_VAR_domain_name}"
echo "TF_VAR_base_table_prefix: ${TF_VAR_base_table_prefix}"

# CloudFlare Pages設定（非機密）
echo "TF_VAR_cloudflare_account_id: ${TF_VAR_cloudflare_account_id}"
echo "TF_VAR_cloudflare_zone_id: ${TF_VAR_cloudflare_zone_id}"

# 機密情報は存在確認のみ
if [ -n "${TF_VAR_database_url}" ]; then
    echo "TF_VAR_database_url: [SET]"
else
    echo "TF_VAR_database_url: [NOT SET]"
fi

if [ -n "${CLOUDFLARE_API_TOKEN}" ]; then
    echo "CLOUDFLARE_API_TOKEN: [SET]"
else
    echo "CLOUDFLARE_API_TOKEN: [NOT SET]"
fi

if [ -n "${TF_VAR_supabase_url}" ]; then
    echo "TF_VAR_supabase_url: [SET]"
else
    echo "TF_VAR_supabase_url: [NOT SET]"
fi

echo "=============================="

# コマンド実行
exec "$@"
