# TASK-505: drizzle-kitマイグレーション設定 - 人間が手動で行う事前準備

**作成日**: 2025年09月21日  
**タスク**: TASK-505 - drizzle-kitマイグレーション設定  
**要件リンク**: REQ-003, REQ-007, REQ-008, REQ-403, REQ-407

## 概要

TASK-505を実装する前に、人間が手動で行う必要がある事前準備手順をまとめています。主にSupabaseプロジェクトでのデータベース接続設定とRLS準備が必要です。

## 事前準備チェックリスト

### 1. Supabaseプロジェクトの準備

#### 1.1 プロジェクト情報の確認
- [ ] Supabaseプロジェクトが作成済みであることを確認
- [ ] プロジェクトIDを控えておく（環境変数で使用）
- [ ] データベース接続URLを確認（`DATABASE_URL`として使用）

#### 1.2 Supabase Access Tokenの取得
- [ ] Supabaseダッシュボードにログイン
- [ ] Settings > API > Service Role Keyを取得
- [ ] このトークンをGitHub Repository Secretsに保存する準備

### 2. Row-Level Security (RLS) の有効化準備
各テーブルでRLSを有効化する基盤設定：

```sql
-- RLS有効化の準備（テーブル作成後に各テーブルで実行）
-- ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 基本的なRLSポリシーの例（認証済みユーザーのみアクセス可能）
-- CREATE POLICY "authenticated_users_policy" ON table_name
--   FOR ALL USING (auth.uid() IS NOT NULL);
```

### 3. 環境変数・シークレットの準備

#### 3.1 GitHub Environment Secretsの設定
以下の変数をGitHub Repository Secretsに追加：

**Secrets:**
- [ ] `SUPABASE_ACCESS_TOKEN`: Supabase Service Role Key
- [ ] `DATABASE_URL`: PostgreSQL接続URL（Supabase提供）

**Variables:**
- [ ] `SUPABASE_PROJECT_ID`: SupabaseプロジェクトID
- [ ] `TABLE_PREFIX`: テーブルプレフィックス（例: `project_name`）

#### 3.2 ローカル開発環境の準備
`.env.local`ファイルに開発用の環境変数を設定：

```bash
# Supabase設定
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_ACCESS_TOKEN=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/[db]

# テーブルプレフィックス
TABLE_PREFIX=project_name

```

### 3. DATABASE_URL接続テスト

```bash
# データベース接続確認
psql "${DATABASE_URL}" -c "SELECT current_user, current_database();"
```

### 4. drizzle-kit事前準備

#### 4.1 既存スキーマファイルの確認
- [ ] `app/server/src/infrastructure/database/schema.ts`が存在するか確認
- [ ] Drizzle ORMの型定義が正しく設定されているか確認

#### 4.2 パッケージ依存関係の確認
`app/server/package.json`で以下の依存関係が含まれているか確認：

```json
{
  "dependencies": {
    "drizzle-orm": "^0.x.x",
    "postgres": "^3.x.x"
  },
  "devDependencies": {
    "drizzle-kit": "^0.x.x"
  }
}
```

## 完了確認

すべての事前準備が完了したら、以下を確認：

- [ ] Supabaseプロジェクトが設定済み
- [ ] GitHub Secretsに必要な情報がすべて設定済み
- [ ] ローカル環境でデータベース接続が可能
- [ ] drizzle-kitの依存関係が整っている

## 次のステップ

事前準備が完了したら、以下の実装フェーズに進みます：

1. `drizzle.config.ts`の設定
2. マイグレーションスクリプトの作成
3. 環境別マイグレーション戦略の実装
4. テーブルプレフィックス機能の実装
5. RLSポリシーの適用

## 注意事項

- **セキュリティ**: パスワードやアクセストークンは絶対にソースコードにコミットしない
- **テスト**: 本番環境での実行前に必ず開発環境でのテストを実施する
- **バックアップ**: 権限変更前にデータベースの状態をバックアップしておく
