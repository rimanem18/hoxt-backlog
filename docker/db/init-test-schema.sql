-- ============================================================================
-- MVP Google認証システム テスト用データベーススキーマ
--
-- 作成日: 2025-08-16
-- 目的: ローカルテスト環境用のスキーマ初期化
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
CREATE TYPE auth_provider_type AS ENUM (
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

-- ユーザーテーブル（テスト用はtest_接頭辞）
-- DDD User Entity に対応するメインテーブル
CREATE TABLE IF NOT EXISTS test_users (
    -- プライマリキー（UUID v4）
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 外部認証プロバイダーでのユーザーID
    -- Google の場合は sub claim、Apple の場合は user identifier など
    external_id VARCHAR(255) NOT NULL,

    -- 認証プロバイダー種別
    provider auth_provider_type NOT NULL,

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
CREATE INDEX IF NOT EXISTS idx_test_users_external_id_provider
ON test_users (external_id, provider);

-- メールアドレス検索用インデックス
-- 重複チェック・ユーザー検索用
CREATE INDEX IF NOT EXISTS idx_test_users_email
ON test_users (email);

-- 最終ログイン日時でのソート・フィルタ用インデックス
-- 分析・管理画面での使用を想定
CREATE INDEX IF NOT EXISTS idx_test_users_last_login_at
ON test_users (last_login_at DESC NULLS LAST);

-- プロバイダー別統計用インデックス
-- 管理画面・分析での使用を想定
CREATE INDEX IF NOT EXISTS idx_test_users_provider_created_at
ON test_users (provider, created_at DESC);

-- ============================================================================
-- Row Level Security (RLS)（行レベルセキュリティ）
-- ============================================================================

-- RLSを有効化（要件 NFR-103 対応）
ALTER TABLE test_users ENABLE ROW LEVEL SECURITY;

-- ユーザーが自分自身の情報のみアクセス可能なポリシー
-- テスト環境では簡略化
CREATE POLICY test_users_self_access ON test_users
    FOR ALL
    USING (true);  -- テスト環境では全アクセス許可

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

-- test_users テーブルの updated_at 自動更新トリガー
CREATE TRIGGER update_test_users_updated_at
    BEFORE UPDATE ON test_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Test Data（テスト用初期データ）
-- ============================================================================

-- テスト用のサンプルユーザー
INSERT INTO test_users (
    external_id,
    provider,
    email,
    name,
    avatar_url,
    last_login_at
) VALUES (
    'test_user_123456789',
    'google',
    'test@example.com',
    'テストユーザー',
    'https://example.com/avatar.jpg',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
) ON CONFLICT (external_id, provider) DO NOTHING;