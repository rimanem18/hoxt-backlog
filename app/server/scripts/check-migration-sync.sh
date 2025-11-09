#!/bin/bash
set -Eeuo pipefail

# app/server/ ディレクトリに移動
cd "$(dirname "$0")/.."

echo "=== マイグレーション同期チェック開始 ==="

# PROJECT_NAME が設定されているか確認
if [ -z "$PROJECT_NAME" ]; then
  echo "❌ エラー: PROJECT_NAME環境変数が設定されていません"
  exit 1
fi

echo "PROJECT_NAME: $PROJECT_NAME"

# マイグレーション生成
echo "=== マイグレーション生成実行 ==="
bun run db:generate

# migrations/ ディレクトリのみチェック
DIFF=$(git status --porcelain src/infrastructure/database/migrations/)

if [ -n "$DIFF" ]; then
  echo ""
  echo "❌ エラー: スキーマ定義とマイグレーションファイルが同期していません"
  echo ""
  echo "以下のファイルに差分があります:"
  echo "$DIFF"
  echo ""
  echo "詳細な差分:"
  git diff src/infrastructure/database/migrations/
  echo ""
  echo "対処方法:"
  echo "1. 'bun run db:generate' を実行"
  echo "2. 生成されたマイグレーションファイルをコミット"
  exit 1
fi

echo ""
echo "✅ マイグレーション同期OK"
echo "=== マイグレーション同期チェック完了 ==="
