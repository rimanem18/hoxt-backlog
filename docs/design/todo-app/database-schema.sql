-- =============================================================================
-- TODOリストアプリ データベーススキーマ
-- =============================================================================
--
-- 作成日: 2025-11-06
-- 要件名: TODO リストアプリ
-- バージョン: 1.0.0
--
-- 🔵 信頼性レベル: 要件定義書、技術スタックから確実な定義
--
-- 注意:
-- - このファイルは設計段階のスキーマであり、実際の実装では
--   Drizzle ORMのスキーマ定義(app/server/src/infrastructure/database/schema.ts)を使用
-- - スキーマ駆動開発フロー: Drizzle → Zod → OpenAPI → TypeScript型定義
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- スキーマ設定
-- -----------------------------------------------------------------------------
-- 🔵 要件定義書 REQ-408、技術スタック より
-- 環境変数 BASE_SCHEMA で定義されたスキーマ配下にテーブルを作成
-- 開発環境: app_test
-- 本番環境: app (環境変数で切り替え)

-- SET search_path TO app_test; -- Drizzle ORMで自動設定

-- -----------------------------------------------------------------------------
-- tasksテーブル
-- -----------------------------------------------------------------------------
-- 🔵 要件定義書 REQ-001〜REQ-007、技術スタック より

CREATE TABLE IF NOT EXISTS app_test.tasks (
    -- 主キー
    -- 🔵 UUID v4 を自動生成
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ユーザーID (外部キー)
    -- 🔵 要件定義書 REQ-403、NFR-102 より
    -- usersテーブルへの外部キー制約
    -- onDelete: CASCADE - ユーザー削除時にタスクも削除
    user_id UUID NOT NULL REFERENCES app_test.users(id) ON DELETE CASCADE,

    -- タイトル
    -- 🔵 要件定義書 REQ-001、REQ-102、EDGE-002 より
    -- 1-100文字、必須、空文字不可(CHECK制約)
    title VARCHAR(100) NOT NULL,

    -- 説明
    -- 🔵 要件定義書 REQ-002、REQ-007 より
    -- Markdown形式、任意(NULL可)
    -- 🔴 最大10000文字(推測)
    description TEXT,

    -- 優先度
    -- 🔵 要件定義書 REQ-005、REQ-103 より
    -- 'high', 'medium', 'low' のいずれか
    -- デフォルト: 'medium'
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',

    -- ステータス
    -- 🔵 要件定義書 REQ-004、REQ-104 より
    -- 'not_started', 'in_progress', 'in_review', 'completed' のいずれか
    -- デフォルト: 'not_started'
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',

    -- 作成日時
    -- 🔵 技術スタック より
    -- タイムゾーン付きタイムスタンプ、デフォルト: 現在時刻
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 更新日時
    -- 🔵 技術スタック より
    -- タイムゾーン付きタイムスタンプ、デフォルト: 現在時刻
    -- トリガーで自動更新
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- インデックス
-- -----------------------------------------------------------------------------
-- 🔵 要件定義書、パフォーマンス要件 NFR-001 より

-- ユーザーごとのタスク検索用インデックス(最頻クエリ)
-- 🔵 RLS と併用してユーザーごとのタスク取得を最適化
CREATE INDEX IF NOT EXISTS idx_tasks_user_id
    ON app_test.tasks(user_id);

-- 作成日時でのソート用インデックス(降順)
-- 🔵 要件定義書 REQ-203 より
-- デフォルトソート: created_at DESC
CREATE INDEX IF NOT EXISTS idx_tasks_created_at
    ON app_test.tasks(created_at DESC);

-- 優先度フィルタ用インデックス
-- 🔵 要件定義書 REQ-201 より
CREATE INDEX IF NOT EXISTS idx_tasks_priority
    ON app_test.tasks(priority);

-- ステータスフィルタ用インデックス
-- 🔵 要件定義書 REQ-202 より
CREATE INDEX IF NOT EXISTS idx_tasks_status
    ON app_test.tasks(status);

-- タイトル検索用インデックス(将来的な拡張)
-- 🔵 要件定義書 将来的な拡張より
-- 🟡 全文検索対応の可能性を考慮
CREATE INDEX IF NOT EXISTS idx_tasks_title
    ON app_test.tasks(title);

-- 複合インデックス: user_id + created_at
-- 🔵 最頻クエリパターン最適化
-- SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_tasks_user_created
    ON app_test.tasks(user_id, created_at DESC);

-- 複合インデックス: user_id + priority
-- 🔵 優先度フィルタクエリ最適化
-- SELECT * FROM tasks WHERE user_id = ? AND priority = ?
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority
    ON app_test.tasks(user_id, priority);

-- 複合インデックス: user_id + status
-- 🔵 ステータスフィルタクエリ最適化
-- SELECT * FROM tasks WHERE user_id = ? AND status IN (?, ?)
CREATE INDEX IF NOT EXISTS idx_tasks_user_status
    ON app_test.tasks(user_id, status);

-- -----------------------------------------------------------------------------
-- CHECK制約
-- -----------------------------------------------------------------------------
-- 🔵 要件定義書、データ整合性担保より

-- 優先度の値制限
-- 🔵 要件定義書 REQ-005 より
ALTER TABLE app_test.tasks
    ADD CONSTRAINT valid_priority
    CHECK (priority IN ('high', 'medium', 'low'));

-- ステータスの値制限
-- 🔵 要件定義書 REQ-004 より
ALTER TABLE app_test.tasks
    ADD CONSTRAINT valid_status
    CHECK (status IN ('not_started', 'in_progress', 'in_review', 'completed'));

-- タイトルの空文字チェック
-- 🔵 要件定義書 REQ-102、EDGE-001 より
ALTER TABLE app_test.tasks
    ADD CONSTRAINT non_empty_title
    CHECK (length(trim(title)) > 0);

-- タイトルの文字数制限
-- 🔵 要件定義書 EDGE-002 より
ALTER TABLE app_test.tasks
    ADD CONSTRAINT title_length
    CHECK (length(title) <= 100);

-- -----------------------------------------------------------------------------
-- Row-Level Security (RLS) ポリシー
-- -----------------------------------------------------------------------------
-- 🔵 要件定義書 REQ-403、NFR-102 より

-- RLS を有効化
ALTER TABLE app_test.tasks ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタスクのみアクセス可能
-- 🔵 要件定義書 NFR-102、NFR-103 より
-- すべての操作(SELECT, INSERT, UPDATE, DELETE)に適用
CREATE POLICY "Users can only access their own tasks"
    ON app_test.tasks
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- セッションパラメータの説明:
-- JWT認証後、バックエンドで以下を実行:
-- SET LOCAL app.current_user_id = '{user_id}';
-- これにより、RLS ポリシーが自動的にuser_idフィルタを適用

-- -----------------------------------------------------------------------------
-- トリガー: updated_at 自動更新
-- -----------------------------------------------------------------------------
-- 🔵 技術スタック、一般的なベストプラクティス より

-- トリガー関数: updated_at を現在時刻に更新
CREATE OR REPLACE FUNCTION app_test.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー: tasks テーブルの更新時に updated_at を自動更新
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON app_test.tasks
    FOR EACH ROW
    EXECUTE FUNCTION app_test.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- サンプルデータ(開発・テスト用)
-- -----------------------------------------------------------------------------
-- 🟡 テスト環境用のサンプルデータ
-- 本番環境では実行しない

-- サンプルユーザーID(既存のusersテーブルから取得想定)
-- 実際には Supabase Auth で生成されたユーザーIDを使用
-- DO $$
-- DECLARE
--     sample_user_id UUID := '00000000-0000-0000-0000-000000000001';
-- BEGIN
--     -- サンプルタスク1: 高優先度、未着手
--     INSERT INTO app_test.tasks (user_id, title, description, priority, status)
--     VALUES (
--         sample_user_id,
--         '重要な会議の資料作成',
--         '## チェックリスト\n- [ ] 資料の構成を考える\n- [ ] スライドを作成\n- [ ] レビュー依頼',
--         'high',
--         'not_started'
--     );
--
--     -- サンプルタスク2: 中優先度、進行中
--     INSERT INTO app_test.tasks (user_id, title, description, priority, status)
--     VALUES (
--         sample_user_id,
--         'バグ修正: ログイン画面',
--         'エラーメッセージが正しく表示されない問題を修正',
--         'medium',
--         'in_progress'
--     );
--
--     -- サンプルタスク3: 低優先度、完了
--     INSERT INTO app_test.tasks (user_id, title, description, priority, status)
--     VALUES (
--         sample_user_id,
--         'ドキュメント更新',
--         'README.mdを最新の状態に更新',
--         'low',
--         'completed'
--     );
-- END $$;

-- -----------------------------------------------------------------------------
-- クエリ例
-- -----------------------------------------------------------------------------

-- タスク一覧取得(デフォルト: 作成日時降順)
-- SELECT * FROM app_test.tasks
-- WHERE user_id = current_setting('app.current_user_id')::uuid
-- ORDER BY created_at DESC;

-- タスク一覧取得(優先度フィルタ: 高)
-- SELECT * FROM app_test.tasks
-- WHERE user_id = current_setting('app.current_user_id')::uuid
--   AND priority = 'high'
-- ORDER BY created_at DESC;

-- タスク一覧取得(ステータスフィルタ: 未着手・進行中)
-- SELECT * FROM app_test.tasks
-- WHERE user_id = current_setting('app.current_user_id')::uuid
--   AND status IN ('not_started', 'in_progress')
-- ORDER BY created_at DESC;

-- タスク一覧取得(優先度ソート: 高→低)
-- SELECT * FROM app_test.tasks
-- WHERE user_id = current_setting('app.current_user_id')::uuid
-- ORDER BY
--   CASE priority
--     WHEN 'high' THEN 1
--     WHEN 'medium' THEN 2
--     WHEN 'low' THEN 3
--   END,
--   created_at DESC;

-- タスク詳細取得
-- SELECT * FROM app_test.tasks
-- WHERE user_id = current_setting('app.current_user_id')::uuid
--   AND id = ?;

-- タスク作成
-- INSERT INTO app_test.tasks (user_id, title, description, priority)
-- VALUES (current_setting('app.current_user_id')::uuid, ?, ?, ?);

-- タスク更新
-- UPDATE app_test.tasks
-- SET title = ?, description = ?, priority = ?
-- WHERE user_id = current_setting('app.current_user_id')::uuid
--   AND id = ?;

-- タスクステータス変更
-- UPDATE app_test.tasks
-- SET status = ?
-- WHERE user_id = current_setting('app.current_user_id')::uuid
--   AND id = ?;

-- タスク削除
-- DELETE FROM app_test.tasks
-- WHERE user_id = current_setting('app.current_user_id')::uuid
--   AND id = ?;

-- -----------------------------------------------------------------------------
-- パフォーマンス分析
-- -----------------------------------------------------------------------------

-- インデックスの使用状況確認
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan,
--     idx_tup_read,
--     idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'tasks'
-- ORDER BY idx_scan DESC;

-- テーブルの統計情報確認
-- SELECT
--     relname,
--     n_tup_ins,
--     n_tup_upd,
--     n_tup_del,
--     n_live_tup,
--     n_dead_tup
-- FROM pg_stat_user_tables
-- WHERE relname = 'tasks';

-- -----------------------------------------------------------------------------
-- 将来的な拡張
-- -----------------------------------------------------------------------------
-- 🔵 要件定義書 将来的な拡張より

-- バックログ管理機能への拡張(今回は対象外)
-- - parent_task_id カラム追加でタスク階層化
-- - backlog テーブル追加
-- - backlog_items テーブル追加(中間テーブル)
-- - ストーリーポイント、スプリントなどの属性追加

-- 高度な機能(今回は対象外)
-- - due_date カラム追加(期限設定)
-- - tags テーブル + task_tags 中間テーブル(タグ付け)
-- - categories テーブル + カテゴリ分類
-- - archived_at カラム追加(論理削除・アーカイブ)
-- - custom_statuses テーブル(ユーザー定義ステータス)

-- =============================================================================
-- 参考資料
-- =============================================================================
-- - [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
-- - [Drizzle ORM公式ドキュメント](https://orm.drizzle.team/)
-- - [Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
