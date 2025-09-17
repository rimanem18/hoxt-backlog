#!/bin/bash

# このスクリプトはsourceで実行される前提
# ロールを引き受けてAWS認証情報を取得
echo "=== AWS認証情報を設定中 ==="
ROLE_INFO=$(aws sts assume-role --role-arn ${AWS_ROLE_ARN} --role-session-name terraform-session --output json)
export AWS_ACCESS_KEY_ID=$(echo $ROLE_INFO | jq -r ".Credentials.AccessKeyId")
export AWS_SECRET_ACCESS_KEY=$(echo $ROLE_INFO | jq -r ".Credentials.SecretAccessKey")
export AWS_SESSION_TOKEN=$(echo $ROLE_INFO | jq -r ".Credentials.SessionToken")

# CORS設定の型変換（カンマ区切り文字列 → JSON配列）
if [ -n "${TF_VAR_access_allow_methods}" ]; then
  export TF_VAR_access_allow_methods=$(echo "\"${TF_VAR_access_allow_methods}\"" | sed 's/,/","/g' | sed 's/^/[/' | sed 's/$/]/')
fi

if [ -n "${TF_VAR_access_allow_headers}" ]; then
  export TF_VAR_access_allow_headers=$(echo "\"${TF_VAR_access_allow_headers}\"" | sed 's/,/","/g' | sed 's/^/[/' | sed 's/$/]/')
fi

echo "✅ 認証完了: $(aws sts get-caller-identity --query Arn --output text)"
