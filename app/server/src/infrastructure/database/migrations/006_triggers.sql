-- ================================================
-- 006_triggers.sql
-- Google認証システム トリガー関数とプロシージャの作成
-- ================================================
--
-- 作成日: 2025-08-12
-- 作成者: TASK002 データベースマイグレーション
-- 対象: 自動処理用トリガー・関数・プロシージャ
--

-- ================================================
-- トリガー関数: updated_at自動更新
-- ================================================

/**
 * updated_at列を自動更新するトリガー関数
 *
 * 使用方法:
 * CREATE TRIGGER trigger_name
 *   BEFORE UPDATE ON table_name
 *   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 */
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ================================================
-- トリガー定義: updated_at自動更新
-- ================================================

-- users テーブル
CREATE TRIGGER "trigger_users_updated_at"
    BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_preferences テーブル
CREATE TRIGGER "trigger_user_preferences_updated_at"
    BEFORE UPDATE ON "user_preferences"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_sessions テーブル
CREATE TRIGGER "trigger_user_sessions_updated_at"
    BEFORE UPDATE ON "user_sessions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 初期データ投入用関数
-- ================================================

/**
 * 新規ユーザー作成時にユーザー設定レコードを自動生成
 * JIT Provisioning時の初期設定作成
 */
CREATE OR REPLACE FUNCTION create_user_preferences_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "user_preferences" ("user_id")
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 新規ユーザー作成時に設定レコード自動生成
CREATE TRIGGER "trigger_create_user_preferences"
    AFTER INSERT ON "users"
    FOR EACH ROW EXECUTE FUNCTION create_user_preferences_for_new_user();

-- ================================================
-- メンテナンス用ストアドプロシージャ
-- ================================================

/**
 * 期限切れセッションの削除
 * 定期実行推奨（例: 1日1回）
 *
 * @returns INTEGER 削除されたセッション数
 */
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "user_sessions"
    WHERE "expires_at" < NOW() OR ("is_active" = false AND "updated_at" < NOW() - INTERVAL '7 days');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- ログ記録
    INSERT INTO "auth_logs" ("event_type", "metadata")
    VALUES ('cleanup', jsonb_build_object('deleted_sessions', deleted_count));

    RETURN deleted_count;
END;
$$ language 'plpgsql';

/**
 * 古い認証ログの削除
 * 3ヶ月以上前のログを削除（コンプライアンス要件に応じて調整）
 *
 * @param retention_months INTEGER 保持期間（月数）デフォルト3ヶ月
 * @returns INTEGER 削除されたログ数
 */
CREATE OR REPLACE FUNCTION cleanup_old_auth_logs(retention_months INTEGER DEFAULT 3)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "auth_logs"
    WHERE "created_at" < NOW() - INTERVAL '1 month' * retention_months;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

/**
 * ドメインイベントの処理状態更新
 * 非同期処理完了時に処理状態をマーク
 *
 * @param event_id TEXT イベントID
 * @returns BOOLEAN 更新成功
 */
CREATE OR REPLACE FUNCTION mark_domain_event_processed(event_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE "domain_events"
    SET
        "processed_at" = NOW(),
        "processing_attempts" = "processing_attempts" + 1
    WHERE "event_id" = mark_domain_event_processed.event_id
      AND "processed_at" IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ language 'plpgsql';

/**
 * ドメインイベントの失敗状態更新
 * 処理失敗時のエラー記録
 *
 * @param event_id TEXT イベントID
 * @param error_message TEXT エラーメッセージ
 * @returns BOOLEAN 更新成功
 */
CREATE OR REPLACE FUNCTION mark_domain_event_failed(event_id TEXT, error_message TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE "domain_events"
    SET
        "processing_attempts" = "processing_attempts" + 1,
        "last_error" = error_message
    WHERE "event_id" = mark_domain_event_failed.event_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ language 'plpgsql';

-- トリガー・関数作成完了メッセージ
SELECT 'トリガー関数とプロシージャが正常に作成されました' AS status;
