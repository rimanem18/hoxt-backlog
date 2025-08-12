-- ================================================
-- 002_session_events.sql
-- Google認証システム セッション・イベント管理テーブル作成
-- ================================================
--
-- 作成日: 2025-08-12
-- 作成者: TASK002 データベースマイグレーション
-- 対象: user_sessions, domain_events テーブル
--

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

-- テーブル作成完了メッセージ
SELECT 'user_sessions, domain_events テーブルが正常に作成されました' AS status;
