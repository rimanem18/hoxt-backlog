-- ================================================
-- 005_rls_policies.sql
-- Google認証システム Row Level Security (RLS) ポリシー設定
-- ================================================
--
-- 作成日: 2025-08-12
-- 作成者: TASK002 データベースマイグレーション
-- 対象: RLSポリシーによるデータアクセス制御
--

-- ================================================
-- usersテーブルのRLS設定
-- ================================================

-- RLS有効化
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- 基本ポリシー: ユーザーは自分の情報のみアクセス可能
-- 注意: 実際の実装ではSupabaseの認証コンテキストを使用
CREATE POLICY "users_select_own" ON "users"
    FOR SELECT USING (auth_provider_user_id = auth.uid()::text);

CREATE POLICY "users_update_own" ON "users"
    FOR UPDATE USING (auth_provider_user_id = auth.uid()::text);

-- 新規ユーザー作成は認証済みユーザーのみ（JIT Provisioning用）
CREATE POLICY "users_insert_authenticated" ON "users"
    FOR INSERT WITH CHECK (auth_provider_user_id = auth.uid()::text);

-- ================================================
-- user_preferencesテーブルのRLS設定
-- ================================================

-- RLS有効化
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の設定のみ全操作可能
CREATE POLICY "user_preferences_all_own" ON "user_preferences"
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_provider_user_id = auth.uid()::text
        )
    );

-- ================================================
-- user_sessionsテーブルのRLS設定
-- ================================================

-- RLS有効化
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のセッション情報のみアクセス可能
CREATE POLICY "user_sessions_own_only" ON "user_sessions"
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_provider_user_id = auth.uid()::text
        )
    );

-- ================================================
-- auth_logsテーブルのRLS設定
-- ================================================

-- RLS有効化
ALTER TABLE "auth_logs" ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の認証ログのみ閲覧可能（セキュリティ上、更新・削除は不可）
CREATE POLICY "auth_logs_select_own" ON "auth_logs"
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_provider_user_id = auth.uid()::text
        )
    );

-- システムによるログ記録は service_role でのみ実行
-- （アプリケーションレイヤーで制御）

-- ================================================
-- domain_eventsテーブルのRLS設定
-- ================================================

-- RLS有効化
ALTER TABLE "domain_events" ENABLE ROW LEVEL SECURITY;

-- ドメインイベントは基本的にシステム内部でのみアクセス
-- ユーザーは自分に関連するイベントのみ閲覧可能
CREATE POLICY "domain_events_select_own_aggregate" ON "domain_events"
    FOR SELECT USING (
        aggregate_type = 'UserAggregate' AND
        aggregate_id IN (
            SELECT id::text FROM users WHERE auth_provider_user_id = auth.uid()::text
        )
    );

-- イベント作成・更新は service_role でのみ実行

-- ================================================
-- aggregate_snapshotsテーブルのRLS設定
-- ================================================

-- RLS有効化
ALTER TABLE "aggregate_snapshots" ENABLE ROW LEVEL SECURITY;

-- スナップショットは基本的にシステム内部でのみアクセス
-- ユーザーは自分の集約スナップショットのみ閲覧可能（必要に応じて）
CREATE POLICY "aggregate_snapshots_select_own" ON "aggregate_snapshots"
    FOR SELECT USING (
        aggregate_type = 'UserAggregate' AND
        aggregate_id IN (
            SELECT id::text FROM users WHERE auth_provider_user_id = auth.uid()::text
        )
    );

-- スナップショット作成・更新は service_role でのみ実行

-- RLS設定完了メッセージ
SELECT 'Row Level Security (RLS) ポリシーが正常に設定されました' AS status;
