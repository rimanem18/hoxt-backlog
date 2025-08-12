-- ================================================
-- 001_initial_tables.sql
-- Google認証システム 初期テーブル作成マイグレーション
-- ================================================
--
-- 作成日: 2025-08-12
-- 作成者: TASK002 データベースマイグレーション
-- 対象: メインテーブル (users, auth_logs, user_preferences)
--

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
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

-- テーブル作成完了メッセージ
SELECT 'users, auth_logs, user_preferences テーブルが正常に作成されました' AS status;
