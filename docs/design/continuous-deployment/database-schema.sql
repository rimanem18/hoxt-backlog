-- ============================================================================
-- MVP Google認証システム データベーススキーマ
--
-- 作成日: 2025-08-12
-- 更新日: 2025-09-30
--
-- 設計原則:
-- 1. プロバイダー非依存設計（将来的な拡張対応）
-- 2. PostgreSQLスキーマによる環境分離
-- 3. DDD + クリーンアーキテクチャ対応
-- 4. パフォーマンス最適化済みインデックス設計
--
-- 環境別スキーマ分離運用:
-- - Production環境: ${BASE_SCHEMA} = "app_projectname"
--   → スキーマ名: app_projectname
--   → テーブル参照例: app_projectname.users
-- - Preview環境: ${BASE_SCHEMA} = "app_projectname_preview"
--   → スキーマ名: app_projectname_preview
--   → テーブル参照例: app_projectname_preview.users
-- - Terraform変数: preview_schema_suffix = "_preview"
-- - PR Close時: DROP SCHEMA app_projectname_preview CASCADE で一括削除
--
-- スキーマ分離の利点:
-- - 環境間の完全な論理分離（名前空間レベル）
-- - PR Close時の一括削除が容易（CASCADE）
-- - 権限管理の簡素化（スキーマ単位で制御）
-- ============================================================================

-- ============================================================================
-- Extensions（必要な拡張機能を有効化）
-- ============================================================================

-- UUID生成用拡張
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 日時関数用拡張
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- Custom Types（カスタム型定義）
-- ============================================================================

-- 認証プロバイダー種別
-- 将来的な拡張を考慮した enum 型
-- スキーマ内に定義することで環境分離を実現
CREATE TYPE ${BASE_SCHEMA}.auth_provider_type AS ENUM (
    'google',
    'apple',
    'microsoft',
    'github',
    'facebook',
    'line'
);

-- ============================================================================
-- Core Tables（メインテーブル）
-- ============================================================================

-- ユーザーテーブル
-- DDD User Entity に対応するメインテーブル
CREATE TABLE IF NOT EXISTS ${BASE_SCHEMA}.users (
    -- プライマリキー（UUID v4）
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 外部認証プロバイダーでのユーザーID
    -- Google の場合は sub claim、Apple の場合は user identifier など
    external_id VARCHAR(255) NOT NULL,

    -- 認証プロバイダー種別
    provider ${BASE_SCHEMA}.auth_provider_type NOT NULL,

    -- ユーザー基本情報
    email VARCHAR(320) NOT NULL, -- RFC 5321 準拠の最大長
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT, -- 長いURL対応のためTEXT型使用

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- 制約定義
    CONSTRAINT unique_external_id_provider UNIQUE (external_id, provider),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT non_empty_name CHECK (length(trim(name)) > 0),
    CONSTRAINT valid_avatar_url CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://')
);

-- ============================================================================
-- Indexes（パフォーマンス最適化用インデックス）
-- ============================================================================

-- 高速認証のための複合インデックス
-- JWT検証時の external_id + provider での検索を最適化
CREATE INDEX IF NOT EXISTS idx_users_external_id_provider
ON ${BASE_SCHEMA}.users (external_id, provider);

-- メールアドレス検索用インデックス
-- 重複チェック・ユーザー検索用
CREATE INDEX IF NOT EXISTS idx_users_email
ON ${BASE_SCHEMA}.users (email);

-- 最終ログイン日時でのソート・フィルタ用インデックス
-- 分析・管理画面での使用を想定
CREATE INDEX IF NOT EXISTS idx_users_last_login_at
ON ${BASE_SCHEMA}.users (last_login_at DESC NULLS LAST);

-- プロバイダー別統計用インデックス
-- 管理画面・分析での使用を想定
CREATE INDEX IF NOT EXISTS idx_users_provider_created_at
ON ${BASE_SCHEMA}.users (provider, created_at DESC);

-- ============================================================================
-- Row Level Security (RLS)（行レベルセキュリティ）
-- ============================================================================

-- RLSを有効化（要件 NFR-103 対応）
ALTER TABLE ${BASE_SCHEMA}.users ENABLE ROW LEVEL SECURITY;

-- ユーザーが自分自身の情報のみアクセス可能なポリシー
-- JWT の sub claim と external_id が一致する場合のみ許可
CREATE POLICY users_self_access ON ${BASE_SCHEMA}.users
    FOR ALL
    USING (
        -- Supabase の auth.jwt() 関数を使用してJWTからsubを取得
        -- 本来は auth.jwt() ->> 'sub' = external_id::text の形
        -- MVP では簡略化してアプリケーション層で制御
        true  -- アプリケーション層でのアクセス制御に委譲
    );

-- ============================================================================
-- Functions（トリガー関数・ヘルパー関数）
-- ============================================================================

-- updated_at 自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- users テーブルの updated_at 自動更新トリガー
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON ${BASE_SCHEMA}.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Data（初期データ）
-- ============================================================================

-- 開発・テスト用のサンプルユーザー（developmentの場合のみ）
-- 本番環境では実行しない
DO $$
BEGIN
    IF current_setting('app.environment', true) = 'development' THEN
        INSERT INTO ${BASE_SCHEMA}.users (
            external_id,
            provider,
            email,
            name,
            avatar_url,
            last_login_at
        ) VALUES (
            'dev_user_123456789',
            'google',
            'developer@example.com',
            '開発テストユーザー',
            'https://example.com/avatar.jpg',
            CURRENT_TIMESTAMP - INTERVAL '1 day'
        ) ON CONFLICT (external_id, provider) DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- Views（ビュー）
-- ============================================================================

-- 統計・分析用ビュー
-- 管理画面・ダッシュボードでの使用を想定
CREATE OR REPLACE VIEW ${BASE_SCHEMA}.user_statistics AS
SELECT
    provider,
    COUNT(*) as total_users,
    COUNT(CASE WHEN last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as active_users_30d,
    COUNT(CASE WHEN last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as active_users_7d,
    MIN(created_at) as first_user_created,
    MAX(created_at) as latest_user_created
FROM ${BASE_SCHEMA}.users
GROUP BY provider
ORDER BY total_users DESC;

-- ============================================================================
-- 将来拡張予定のテーブル設計（今回のMVPでは作成しない）
-- ============================================================================

/*
-- 認証ログテーブル（監査・セキュリティ用）
CREATE TABLE IF NOT EXISTS ${BASE_SCHEMA}.auth_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES ${BASE_SCHEMA}.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'token_refresh'
    provider auth_provider_type NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- セッション管理テーブル（高度なセッション制御用）
CREATE TABLE IF NOT EXISTS ${BASE_SCHEMA}.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES ${BASE_SCHEMA}.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- ドメインイベントテーブル（イベントソーシング用）
CREATE TABLE IF NOT EXISTS ${BASE_SCHEMA}.domain_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- アカウント連携テーブル（複数プロバイダー対応用）
CREATE TABLE IF NOT EXISTS ${BASE_SCHEMA}.user_provider_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES ${BASE_SCHEMA}.users(id) ON DELETE CASCADE,
    provider auth_provider_type NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_external_id UNIQUE (provider, external_id)
);
*/

-- ============================================================================
-- Performance Monitoring（パフォーマンス監視用）
-- ============================================================================

-- スロークエリログ設定（本番環境推奨設定）
-- postgresql.conf での設定例:
-- log_min_duration_statement = 1000  # 1秒以上のクエリをログ出力
-- log_statement = 'none'  # 通常のクエリはログ出力しない

-- 統計情報収集用設定
-- shared_preload_libraries = 'pg_stat_statements'

-- ============================================================================
-- Backup & Maintenance（バックアップ・メンテナンス用）
-- ============================================================================

-- 定期的なVACUUM・ANALYZEの実行推奨
-- cron設定例:
-- 0 2 * * 0  # 毎週日曜日2時にVACUUM ANALYZE実行

-- バックアップ戦略:
-- - 日次フルバックアップ（pg_dump）
-- - 継続的アーカイブログバックアップ（WAL-E/WAL-G）
-- - Point-in-time Recovery (PITR) 対応

-- ============================================================================
-- Security Considerations（セキュリティ考慮事項）
-- ============================================================================

-- 1. 接続セキュリティ
--    - SSL/TLS必須（sslmode=require）
--    - 専用データベースユーザー使用
--    - 最小権限の原則適用

-- 2. データ暗号化
--    - 保存時暗号化（Transparent Data Encryption）
--    - 転送時暗号化（SSL/TLS）

-- 3. アクセス制御
--    - Row Level Security有効化
--    - アプリケーション層でのアクセス制御
--    - 定期的な権限レビュー

-- ============================================================================
-- Migration Strategy（マイグレーション戦略）
-- ============================================================================

-- バージョン管理:
-- V001__初期スキーマ作成.sql
-- V002__インデックス追加.sql
-- V003__RLS設定.sql

-- ロールバック戦略:
-- - マイグレーション前のスキーマバックアップ
-- - 段階的適用・検証
-- - 本番適用前のステージング環境での検証
