-- ================================================
-- Google認証システム データベーススキーマ設計
-- ================================================
-- 
-- 設計方針:
-- 1. Supabaseの認証ユーザーとアプリケーションユーザーを分離管理
-- 2. JITプロビジョニングによる初回ログイン時の自動ユーザー作成
-- 3. 拡張性を考慮した正規化設計
-- 4. パフォーマンスを重視したインデックス戦略

-- ================================================
-- 拡張機能の有効化
-- ================================================

-- UUID生成用拡張（PostgreSQL標準）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 暗号化機能拡張（機密情報の暗号化用）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- メインテーブル: users
-- ================================================

/**
 * ユーザーテーブル
 * アプリケーション内でのユーザー情報を管理
 * 
 * 設計思想:
 * - auth_provider_user_id: Supabaseの認証ユーザーIDと紐付け
 * - email: 認証プロバイダーから取得（重複不可）
 * - name, avatar_url: プロフィール情報（更新可能）
 * - ソフトデリート対応（deleted_at）
 */
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 認証プロバイダーとの紐付け
    "auth_provider_user_id" TEXT UNIQUE NOT NULL,
    "auth_provider" TEXT NOT NULL DEFAULT 'google',
    
    -- 基本プロフィール情報
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    
    -- システム管理項目
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ NULL,
    
    -- 制約定義
    CONSTRAINT "users_email_check" CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    CONSTRAINT "users_name_check" CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT "users_auth_provider_check" CHECK (auth_provider IN ('google'))
);

-- ================================================
-- 監査ログテーブル: auth_logs
-- ================================================

/**
 * 認証ログテーブル
 * セキュリティ監視とトラブルシューティング用
 * 
 * ログ種別:
 * - login: ログイン成功
 * - login_failed: ログイン失敗
 * - logout: ログアウト
 * - token_refresh: トークンリフレッシュ
 * - session_expired: セッション期限切れ
 */
CREATE TABLE "auth_logs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    
    -- ログ詳細情報
    "event_type" VARCHAR(50) NOT NULL,
    "auth_provider" VARCHAR(50) NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    
    -- セッション情報
    "session_id" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    
    -- 追加メタデータ（JSON形式）
    "metadata" JSONB DEFAULT '{}',
    
    -- システム項目
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 制約定義
    CONSTRAINT "auth_logs_event_type_check" CHECK (
        event_type IN ('login', 'login_failed', 'logout', 'token_refresh', 'session_expired', 'error')
    )
);

-- ================================================
-- ユーザー設定テーブル: user_preferences
-- ================================================

/**
 * ユーザー設定テーブル
 * アプリケーション固有の設定を管理
 * 
 * 設定例:
 * - theme: ダークモード設定
 * - language: 言語設定
 * - notifications: 通知設定
 * - privacy: プライバシー設定
 */
CREATE TABLE "user_preferences" (
    "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
    
    -- UI/UX設定
    "theme" VARCHAR(20) DEFAULT 'light',
    "language" VARCHAR(10) DEFAULT 'ja',
    
    -- 通知設定
    "email_notifications" BOOLEAN DEFAULT true,
    "push_notifications" BOOLEAN DEFAULT true,
    
    -- プライバシー設定
    "profile_visibility" VARCHAR(20) DEFAULT 'public',
    
    -- 追加設定（JSON形式で柔軟に対応）
    "custom_settings" JSONB DEFAULT '{}',
    
    -- システム項目
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 制約定義
    CONSTRAINT "user_preferences_theme_check" CHECK (theme IN ('light', 'dark', 'auto')),
    CONSTRAINT "user_preferences_language_check" CHECK (language IN ('ja', 'en')),
    CONSTRAINT "user_preferences_profile_visibility_check" CHECK (
        profile_visibility IN ('public', 'private', 'friends')
    )
);

-- ================================================
-- セッション管理テーブル: user_sessions（集約設計対応）
-- ================================================

/**
 * ユーザーセッションテーブル
 * UserAggregateによるセッション管理をサポート
 * 
 * 設計思想:
 * - 集約ルート（UserAggregate）によるセッション整合性管理
 * - 同時セッション数制限のビジネスルール実装
 * - ドメインイベントによる状態変更追跡
 */
CREATE TABLE "user_sessions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    
    -- セッション識別情報
    "session_token_hash" TEXT UNIQUE NOT NULL,
    "auth_provider" VARCHAR(50) NOT NULL DEFAULT 'google',
    
    -- デバイス・環境情報
    "device_info" JSONB DEFAULT '{}',
    "ip_address" INET,
    "user_agent" TEXT,
    
    -- セッション状態管理
    "is_active" BOOLEAN DEFAULT true,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_activity_at" TIMESTAMPTZ DEFAULT NOW(),
    
    -- ドメインイベント関連
    "created_by_event" TEXT, -- 作成イベントID
    "last_event" TEXT,       -- 最終イベントID
    
    -- システム項目
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- ビジネスルール制約
    CONSTRAINT "user_sessions_expires_at_check" CHECK (expires_at > created_at),
    CONSTRAINT "user_sessions_auth_provider_check" CHECK (auth_provider IN ('google'))
);

-- ================================================
-- ドメインイベントテーブル: domain_events
-- ================================================

/**
 * ドメインイベントストアテーブル
 * イベントソーシング・イベント駆動アーキテクチャをサポート
 * 
 * 用途:
 * - ドメインイベントの永続化
 * - イベント再生による状態復元
 * - 監査ログとしての活用
 * - 非同期処理のイベントキュー
 */
CREATE TABLE "domain_events" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- イベント基本情報
    "event_id" TEXT UNIQUE NOT NULL,
    "event_name" VARCHAR(100) NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" VARCHAR(50) NOT NULL,
    "occurred_on" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- イベントデータ
    "event_data" JSONB NOT NULL DEFAULT '{}',
    "event_version" INTEGER DEFAULT 1,
    
    -- 処理状態管理
    "processed_at" TIMESTAMPTZ NULL,
    "processing_attempts" INTEGER DEFAULT 0,
    "last_error" TEXT NULL,
    
    -- システム項目
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 制約定義
    CONSTRAINT "domain_events_event_name_check" CHECK (
        event_name IN (
            'USER_LOGGED_IN', 'USER_LOGGED_OUT', 'SESSION_REFRESHED', 
            'USER_CREATED', 'USER_PROFILE_UPDATED', 'ACCOUNT_DEACTIVATED'
        )
    ),
    CONSTRAINT "domain_events_aggregate_type_check" CHECK (
        aggregate_type IN ('UserAggregate', 'AuthAggregate')
    )
);

-- ================================================
-- 集約スナップショットテーブル: aggregate_snapshots（オプション）
-- ================================================

/**
 * 集約スナップショットテーブル
 * パフォーマンス最適化のためのイベント再生キャッシュ
 * 
 * 用途:
 * - 大量イベントがある集約の高速復元
 * - イベント履歴の圧縮
 * - パフォーマンス向上
 */
CREATE TABLE "aggregate_snapshots" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" VARCHAR(50) NOT NULL,
    "version" INTEGER NOT NULL,
    
    -- スナップショットデータ
    "snapshot_data" JSONB NOT NULL,
    "last_event_id" TEXT NOT NULL,
    
    -- システム項目
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 一意制約（集約ごとに最新スナップショット）
    UNIQUE("aggregate_id", "aggregate_type"),
    
    CONSTRAINT "aggregate_snapshots_version_check" CHECK (version > 0)
);

-- ================================================
-- インデックス定義
-- ================================================

-- users テーブル
CREATE INDEX "idx_users_auth_provider_user_id" ON "users" ("auth_provider_user_id");
CREATE INDEX "idx_users_email" ON "users" ("email") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_users_active" ON "users" ("is_active", "created_at") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_users_created_at" ON "users" ("created_at");

-- auth_logs テーブル
CREATE INDEX "idx_auth_logs_user_id_created_at" ON "auth_logs" ("user_id", "created_at" DESC);
CREATE INDEX "idx_auth_logs_event_type_created_at" ON "auth_logs" ("event_type", "created_at" DESC);
CREATE INDEX "idx_auth_logs_ip_address" ON "auth_logs" ("ip_address", "created_at" DESC);
CREATE INDEX "idx_auth_logs_created_at" ON "auth_logs" ("created_at" DESC);

-- user_sessions テーブル
CREATE INDEX "idx_user_sessions_user_active" ON "user_sessions" ("user_id", "is_active", "expires_at");
CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions" ("expires_at") WHERE "is_active" = true;
CREATE INDEX "idx_user_sessions_last_activity" ON "user_sessions" ("last_activity_at" DESC);
CREATE INDEX "idx_user_sessions_token_hash" ON "user_sessions" ("session_token_hash");
CREATE INDEX "idx_user_sessions_auth_provider" ON "user_sessions" ("auth_provider", "created_at" DESC);

-- domain_events テーブル
CREATE INDEX "idx_domain_events_aggregate" ON "domain_events" ("aggregate_id", "aggregate_type", "occurred_on" DESC);
CREATE INDEX "idx_domain_events_event_name" ON "domain_events" ("event_name", "occurred_on" DESC);
CREATE INDEX "idx_domain_events_unprocessed" ON "domain_events" ("processed_at", "occurred_on") WHERE "processed_at" IS NULL;
CREATE INDEX "idx_domain_events_occurred_on" ON "domain_events" ("occurred_on" DESC);
CREATE INDEX "idx_domain_events_event_id" ON "domain_events" ("event_id");

-- aggregate_snapshots テーブル
CREATE INDEX "idx_aggregate_snapshots_aggregate" ON "aggregate_snapshots" ("aggregate_id", "aggregate_type");
CREATE INDEX "idx_aggregate_snapshots_created_at" ON "aggregate_snapshots" ("created_at" DESC);

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
-- トリガー定義
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
-- Row Level Security (RLS) ポリシー
-- ================================================

-- usersテーブルのRLS有効化
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- 基本ポリシー: ユーザーは自分の情報のみアクセス可能
-- 注意: 実際の実装ではSupabaseの認証コンテキストを使用
CREATE POLICY "users_select_own" ON "users"
    FOR SELECT USING (auth_provider_user_id = auth.uid()::text);

CREATE POLICY "users_update_own" ON "users"
    FOR UPDATE USING (auth_provider_user_id = auth.uid()::text);

-- user_preferencesテーブルのRLS
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_all_own" ON "user_preferences"
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_provider_user_id = auth.uid()::text
        )
    );

-- ================================================
-- 初期データ投入
-- ================================================

-- デフォルト設定値投入用の関数
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

-- ================================================
-- サンプルデータ（開発環境用）
-- ================================================

-- 開発用のサンプルユーザー
-- 注意: 本番環境では削除すること
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

-- ================================================
-- セキュリティ関連の追加設定
-- ================================================

-- 機密データ列のコメント（暗号化推奨）
COMMENT ON COLUMN "user_sessions"."session_token_hash" IS 'セッショントークンのハッシュ値（元値は保存しない）';

-- データベースロール設定（本番環境では適切な権限設定を行う）
-- 例: アプリケーション用ロールの作成と権限付与
-- CREATE ROLE app_user;
-- GRANT SELECT, INSERT, UPDATE ON users TO app_user;
-- GRANT SELECT, INSERT ON auth_logs TO app_user;
-- など...