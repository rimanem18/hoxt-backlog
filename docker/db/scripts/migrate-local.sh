#!/bin/bash

#
# ローカル環境用マイグレーション実行スクリプト
# PostgreSQLコンテナ内で実行される
# 
# 使用方法:
# docker compose exec db migrate-local.sh [migration_file]
# 
# 例:
# docker compose exec db migrate-local.sh                    # 全マイグレーション実行
# docker compose exec db migrate-local.sh 001_initial_tables.sql  # 特定マイグレーション実行
#

set -e

MIGRATIONS_DIR="/migrations"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
PGPASSWORD="postgres"

# PostgreSQL接続設定
export PGPASSWORD

# 引数チェック
if [ $# -eq 0 ]; then
    echo "🚀 全マイグレーションファイルをローカル環境で実行します..."
    migration_files=($(ls ${MIGRATIONS_DIR}/*.sql 2>/dev/null | sort))
else
    echo "🚀 指定されたマイグレーションファイルをローカル環境で実行します: $1"
    migration_files=("${MIGRATIONS_DIR}/$1")
fi

# マイグレーションファイルが存在するかチェック
if [ ${#migration_files[@]} -eq 0 ]; then
    echo "❌ マイグレーションファイルが見つかりません"
    exit 1
fi

# 接続テスト
echo "🔗 ローカルデータベース接続テスト..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\q" 2>/dev/null; then
    echo "❌ ローカルデータベース接続に失敗しました"
    echo "   HOST: $DB_HOST"
    echo "   PORT: $DB_PORT"
    echo "   USER: $DB_USER"
    echo "   DB: $DB_NAME"
    exit 1
fi
echo "✅ ローカルデータベース接続成功"

# マイグレーション実行
for migration_file in "${migration_files[@]}"; do
    if [ ! -f "$migration_file" ]; then
        echo "⚠️  ファイルが見つかりません: $migration_file"
        continue
    fi
    
    filename=$(basename "$migration_file")
    echo "📂 実行中: $filename"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
        echo "✅ 完了: $filename"
    else
        echo "❌ 失敗: $filename"
        exit 1
    fi
    echo ""
done

echo "🎉 ローカル環境でのマイグレーション処理が完了しました！"