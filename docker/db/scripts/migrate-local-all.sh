#!/bin/bash

#
# ローカル環境用 全マイグレーション一括実行スクリプト
# 開発効率のためサンプルデータ込みで全マイグレーション実行
# 
# 使用方法:
# docker compose exec db migrate-local-all.sh
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

echo "🏠 ローカル環境での全マイグレーション実行を開始します..."

# 接続テスト
echo "🔗 ローカルデータベース接続テスト..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\q" 2>/dev/null; then
    echo "❌ ローカルデータベース接続に失敗しました"
    exit 1
fi
echo "✅ ローカルデータベース接続成功"

# マイグレーションファイルを順序実行
migration_files=(
    "001_initial_tables.sql"
    "002_session_events.sql"
    "003_aggregate_snapshots.sql"
    "004_indexes.sql"
    "005_rls_policies.sql"
    "006_triggers.sql"
    "007_sample_data.sql"
)

echo "📂 実行予定のマイグレーション: ${#migration_files[@]}個"

for filename in "${migration_files[@]}"; do
    migration_file="${MIGRATIONS_DIR}/${filename}"
    
    if [ ! -f "$migration_file" ]; then
        echo "⚠️  ファイルが見つかりません: $migration_file"
        continue
    fi
    
    echo "📂 実行中: $filename"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
        echo "✅ 完了: $filename"
    else
        echo "❌ 失敗: $filename"
        exit 1
    fi
    echo ""
done

# 結果確認
echo "📊 マイグレーション結果確認..."
echo ""
echo "📋 作成されたテーブル:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt" -t | sed 's/|/ |/g'
echo ""
echo "👥 サンプルユーザー:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT name, email FROM users;" -t | sed 's/|/ |/g'
echo ""
echo "📈 ユーザー統計:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM user_statistics;" -t | sed 's/|/ |/g'

echo ""
echo "🎉 ローカル環境での全マイグレーション完了！"
echo "💡 開発用サンプルデータも準備できています"