# ローカルデータベース開発ガイド

## 概要

Google認証システムの開発では、本番Supabaseと分離されたローカルPostgreSQL環境を使用します。

## 環境構成

### ローカル環境
- **コンテナ**: `supabase/postgres:17.4.1.073`
- **接続**: `localhost:5432`
- **認証**: `postgres/postgres`
- **用途**: 開発・テスト・サンプルデータ検証

### 本番環境
- **サービス**: Supabase（`<YOUR_PROJECT>.supabase.co`）
- **接続**: Pooler経由（`aws-0-ap-northeast-1.pooler.supabase.com:6543`）
- **用途**: 本番デプロイ・ユーザーデータ

## ローカル開発フロー

### 1. 環境起動

```bash
# ローカルPostgreSQLコンテナ起動
docker compose up -d db

# 起動確認
docker compose ps db
```

### 2. マイグレーション実行

#### 全マイグレーション一括実行（推奨）
```bash
# サンプルデータ込みで全マイグレーション実行
docker compose exec db migrate-local-all.sh
```

#### 個別マイグレーション実行
```bash
# 特定のマイグレーションファイル実行
docker compose exec db psql -U postgres -d postgres -f /migrations/001_initial_tables.sql
```

#### 既存マイグレーションスクリプト使用
```bash
# ローカル環境用スクリプト
docker compose exec db migrate-local.sh [migration_file]

# 全マイグレーション実行
docker compose exec db migrate-local.sh
```

### 3. データベース操作

#### 直接接続
```bash
# PostgreSQLコンソールに接続
docker compose exec db psql -U postgres -d postgres
```

#### データ確認
```bash
# テーブル一覧
docker compose exec db psql -U postgres -d postgres -c "\dt"

# サンプルユーザー確認
docker compose exec db psql -U postgres -d postgres -c "SELECT name, email FROM users;"

# 統計情報確認
docker compose exec db psql -U postgres -d postgres -c "SELECT * FROM user_statistics;"
```

### 4. データリセット

#### データベース完全リセット
```bash
# コンテナ停止・削除
docker compose down db

# ボリューム削除（データ完全消去）
docker volume rm hoxt-backlog_postgres_data 2>/dev/null || true

# 再起動・マイグレーション
docker compose up -d db
sleep 10
docker compose exec db migrate-local-all.sh
```

## 開発用サンプルデータ

ローカル環境では以下の開発用データが自動で作成されます：

### サンプルユーザー
- **開発ユーザー**: `dev@example.com`
- **テストユーザー**: `test@example.com`

### サンプルイベント
- ユーザー作成イベント（`USER_CREATED`）
- 認証ログエントリ

### 統計ビュー
- `active_users`: アクティブユーザー一覧
- `user_statistics`: ユーザー統計情報
- `session_statistics`: セッション統計情報

## マイグレーションファイル構成

```
app/server/src/infrastructure/database/migrations/
├── 001_initial_tables.sql      # users, auth_logs, user_preferences
├── 002_session_events.sql      # user_sessions, domain_events
├── 003_aggregate_snapshots.sql # aggregate_snapshots
├── 004_indexes.sql             # パフォーマンス最適化インデックス
├── 005_rls_policies.sql        # Row Level Security設定
├── 006_triggers.sql            # トリガー・関数・プロシージャ
└── 007_sample_data.sql         # サンプルデータ・ビュー（ローカル用）
```

## 本番環境への適用

⚠️ **注意**: 本番環境には**サンプルデータを除いて**適用すること

### 安全な本番適用手順

1. **ローカル環境での事前テスト**
```bash
# 1. 完全リセット
docker compose down db && docker volume rm hoxt-backlog_postgres_data

# 2. 本番適用予定のマイグレーション実行（サンプルデータ除外）
docker compose up -d db && sleep 10
for file in 001 002 003 004 005 006; do
  docker compose exec db psql -U postgres -d postgres -f /migrations/${file}_*.sql
done
```

2. **本番環境適用**
```bash
# 本番Supabaseに接続（007_sample_data.sql は除外）
docker compose run --rm \
  -e DB_HOST=aws-0-ap-northeast-1.pooler.supabase.com \
  -e DB_PORT=6543 \
  -e DB_NAME=postgres \
  -e DB_USER=postgres.<YOUR_PROJECT> \
  -e DB_PASSWORD=<PASSWORD> \
  db migrate.sh 001_initial_tables.sql
```

## トラブルシューティング

### PostgreSQL起動失敗
```bash
# コンテナログ確認
docker compose logs db

# ポート確認
lsof -i :5432
```

### マイグレーション失敗
```bash
# エラー詳細確認
docker compose exec db psql -U postgres -d postgres -c "SELECT * FROM pg_stat_activity;"

# 制約違反確認
docker compose exec db psql -U postgres -d postgres -c "\d+ table_name"
```

### データ不整合
```bash
# 制約チェック
docker compose exec db psql -U postgres -d postgres -c "
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE NOT convalidated;
"
```

## ベストプラクティス

### 開発時
1. ✅ **ローカル環境**でマイグレーション・機能テスト
2. ✅ **サンプルデータ**を活用した動作確認
3. ✅ **統計ビュー**でのデータ検証
4. ✅ **完全リセット**でのクリーンな状態確認

### 本番適用時
1. ⚠️ **ローカル事前テスト**必須
2. ⚠️ **サンプルデータ除外**必須
3. ⚠️ **段階適用**で安全性確保
4. ⚠️ **ロールバック計画**準備
