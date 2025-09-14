#!/bin/sh

# Terraform環境変数のデバッグ表示（機密情報は除く）
echo "=== Terraform Environment Setup ==="
echo "AWS_REGION: ${AWS_REGION}"
echo "TF_VAR_environment: ${TF_VAR_environment}"
echo "TF_VAR_aws_region: ${TF_VAR_aws_region}"
echo "TF_VAR_domain_name: ${TF_VAR_domain_name}"
echo "TF_VAR_table_prefix: ${TF_VAR_table_prefix}"

# 機密情報は存在確認のみ
if [ -n "${TF_VAR_database_url}" ]; then
    echo "TF_VAR_database_url: [SET]"
else
    echo "TF_VAR_database_url: [NOT SET]"
fi

if [ -n "${TF_VAR_cloudflare_api_token}" ]; then
    echo "TF_VAR_cloudflare_api_token: [SET]"
else
    echo "TF_VAR_cloudflare_api_token: [NOT SET]"
fi

if [ -n "${TF_VAR_supabase_access_token}" ]; then
    echo "TF_VAR_supabase_access_token: [SET]"
else
    echo "TF_VAR_supabase_access_token: [NOT SET]"
fi

echo "=============================="

# コマンド実行
exec "$@"
