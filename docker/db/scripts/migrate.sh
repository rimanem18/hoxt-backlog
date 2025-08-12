#!/bin/bash

#
# マイグレーション実行スクリプト
# 指定されたマイグレーションファイルを順次実行する
# 
# 使用方法:
# ./migrate.sh [migration_file]
# 
# 例:
# ./migrate.sh                    # 全マイグレーション実行
# ./migrate.sh 001_initial_tables.sql  # 特定マイグレーション実行
#

set -e

MIGRATIONS_DIR="/migrations"
DB_HOST="${DB_HOST}"
DB_PORT="${DB_PORT}"
DB_NAME="${DB_NAME}"
DB_USER="${DB_USER}"
PGPASSWORD="${DB_PASSWORD}"

# PostgreSQL接続設定
export PGPASSWORD

# 引数チェック
if [ $# -eq 0 ]; then
    echo "🚀 全マイグレーションファイルを実行します..."
    migration_files=($(ls ${MIGRATIONS_DIR}/*.sql 2>/dev/null | sort))
else
    echo "🚀 指定されたマイグレーションファイルを実行します: $1"
    migration_files=("${MIGRATIONS_DIR}/$1")
fi

# マイグレーションファイルが存在するかチェック
if [ ${#migration_files[@]} -eq 0 ]; then
    echo "❌ マイグレーションファイルが見つかりません"
    exit 1
fi

# 接続テスト
echo "🔗 データベース接続テスト..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\q" 2>/dev/null; then
    echo "❌ データベース接続に失敗しました"
    echo "   HOST: $DB_HOST"
    echo "   PORT: $DB_PORT"
    echo "   USER: $DB_USER"
    echo "   DB: $DB_NAME"
    exit 1
fi
echo "✅ データベース接続成功"

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

echo "🎉 マイグレーション処理が完了しました！"