-- ================================================
-- 007_sample_data.sql
-- Google認証システム 開発用サンプルデータとビュー作成
-- ================================================
--
-- 作成日: 2025-08-12
-- 作成者: TASK002 データベースマイグレーション
-- 対象: 開発用データ、パフォーマンス最適化ビュー
-- 注意: 本番環境では削除すること
--

-- ================================================
-- パフォーマンス最適化用のビュー
-- ================================================

/**
 * アクティブユーザービュー
 * 削除されていないアクティブなユーザーのみ表示
 */
CREATE VIEW "active_users" AS
SELECT
    "id",
    "auth_provider_user_id",
    "auth_provider",
    "email",
    "name",
    "avatar_url",
    "created_at",
    "updated_at"
FROM "users"
WHERE "is_active" = true AND "deleted_at" IS NULL;

/**
 * ユーザー統計ビュー
 * 管理画面用の集計情報
 */
CREATE VIEW "user_statistics" AS
SELECT
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE "is_active" = true AND "deleted_at" IS NULL) as active_users,
    COUNT(*) FILTER (WHERE "deleted_at" IS NOT NULL) as deleted_users,
    COUNT(*) FILTER (WHERE "created_at" >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d,
    COUNT(*) FILTER (WHERE "created_at" >= CURRENT_DATE - INTERVAL '7 days') as new_users_7d
FROM "users";

/**
 * セッション統計ビュー
 * アクティブセッション数の監視用
 */
CREATE VIEW "session_statistics" AS
SELECT
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE "is_active" = true) as active_sessions,
    COUNT(*) FILTER (WHERE "expires_at" < NOW()) as expired_sessions,
    COUNT(DISTINCT "user_id") as users_with_sessions,
    COUNT(*) FILTER (WHERE "created_at" >= CURRENT_DATE - INTERVAL '24 hours') as sessions_24h
FROM "user_sessions";

-- ================================================
-- 開発用サンプルデータ
-- 注意: 本番環境では以下のデータを削除すること
-- ================================================

-- 開発用のサンプルユーザー
INSERT INTO "users" (
    "auth_provider_user_id",
    "auth_provider",
    "email",
    "name",
    "avatar_url"
) VALUES
(
    'dev-user-001',
    'google',
    'dev@example.com',
    '開発ユーザー',
    'https://example.com/avatar1.jpg'
),
(
    'dev-user-002',
    'google',
    'test@example.com',
    'テストユーザー',
    'https://example.com/avatar2.jpg'
);

-- 開発用の認証ログ
INSERT INTO "auth_logs" (
    "user_id",
    "event_type",
    "auth_provider",
    "ip_address",
    "user_agent",
    "metadata"
) VALUES
(
    (SELECT id FROM users WHERE email = 'dev@example.com'),
    'login',
    'google',
    '127.0.0.1'::inet,
    'Mozilla/5.0 (Development)',
    '{"development": true}'::jsonb
);

-- 開発用のドメインイベント
INSERT INTO "domain_events" (
    "event_id",
    "event_name",
    "aggregate_id",
    "aggregate_type",
    "event_data"
) VALUES
(
    'dev-event-001',
    'USER_CREATED',
    (SELECT id::text FROM users WHERE email = 'dev@example.com'),
    'UserAggregate',
    '{"development": true, "source": "sample_data"}'::jsonb
);

-- ================================================
-- 設計ドキュメント（コメント）
-- ================================================

COMMENT ON TABLE "users" IS 'アプリケーションユーザー情報。Supabase Authと紐付けて管理。';
COMMENT ON COLUMN "users"."auth_provider_user_id" IS 'Supabase AuthのユーザーID（JWT subject）';
COMMENT ON COLUMN "users"."auth_provider" IS '認証プロバイダー種別（現在はgoogleのみ）';

COMMENT ON TABLE "auth_logs" IS '認証イベントログ。セキュリティ監視とデバッグ用。';
COMMENT ON COLUMN "auth_logs"."metadata" IS '追加情報をJSONB形式で格納（柔軟性確保）';

COMMENT ON TABLE "user_preferences" IS 'ユーザー個別設定。テーマ、言語、通知等。';
COMMENT ON COLUMN "user_preferences"."custom_settings" IS 'アプリ固有設定のJSONB拡張領域';

COMMENT ON TABLE "user_sessions" IS 'セッション管理テーブル（オプション）。複数デバイス対応時に使用。';
COMMENT ON COLUMN "user_sessions"."session_token_hash" IS 'セッショントークンのハッシュ値（元値は保存しない）';

COMMENT ON TABLE "domain_events" IS 'ドメインイベントストア。イベント駆動アーキテクチャをサポート。';
COMMENT ON TABLE "aggregate_snapshots" IS '集約スナップショット。パフォーマンス最適化用。';

COMMENT ON VIEW "active_users" IS 'アクティブユーザー一覧ビュー（削除済み除外）';
COMMENT ON VIEW "user_statistics" IS 'ユーザー統計情報ビュー（管理画面用）';
COMMENT ON VIEW "session_statistics" IS 'セッション統計情報ビュー（監視用）';

-- サンプルデータ・ビュー作成完了メッセージ
SELECT 'サンプルデータとビューが正常に作成されました（本番環境では削除してください）' AS status;
