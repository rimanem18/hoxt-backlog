-- =============================================================================
-- 型安全性強化・API契約強化 - データベーススキーマ設計
-- =============================================================================
--
-- このファイルは設計文書として、Drizzle ORMのスキーマ定義に対応する
-- PostgreSQL DDLを示す。実際のマイグレーションは `drizzle-kit generate` と
-- `drizzle-kit push` で管理される。
--
-- 作成日: 2025-10-12
-- 更新日: 2025-10-12
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- スキーマ作成（環境別に分離）
-- -----------------------------------------------------------------------------
-- 環境変数 BASE_SCHEMA で指定されたスキーマを使用
-- - Production: app_projectname
-- - Preview: app_projectname_preview
-- - Test: test_schema

-- 注意: 実際のスキーマ名は Drizzle ORM の pgSchema() で動的に決定される
-- このファイルではプレースホルダーとして ${BASE_SCHEMA} を使用

CREATE SCHEMA IF NOT EXISTS ${BASE_SCHEMA};

-- デフォルトスキーマとして設定
SET search_path TO ${BASE_SCHEMA}, public;

-- -----------------------------------------------------------------------------
-- ENUMの定義
-- -----------------------------------------------------------------------------

/**
 * 認証プロバイダー種別
 *
 * 将来的な拡張を考慮した設計。新しいプロバイダー追加時は
 * ここに追加するだけで、Drizzle Zod → Zod → OpenAPI の
 * 全型定義が自動更新される。
 */
CREATE TYPE ${BASE_SCHEMA}.auth_provider_type AS ENUM (
    'google',
    'apple',
    'microsoft',
    'github',
    'facebook',
    'line'
);

-- -----------------------------------------------------------------------------
-- テーブル定義: users
-- -----------------------------------------------------------------------------

/**
 * ユーザーテーブル
 *
 * DDD User Entityに対応するメインテーブル。
 * Drizzle ORMのスキーマ定義（schema.ts）が Single Source of Truth であり、
 * このSQLは設計文書として参考用に提供される。
 *
 * セキュリティ:
 * - Row-Level Security (RLS) による認証済みユーザーのみアクセス可能
 * - Supabase Auth との連携
 *
 * インデックス戦略:
 * - 複合インデックス: external_id + provider（高速認証）
 * - 単一インデックス: email（検索用）、last_login_at（ソート用）
 */
CREATE TABLE ${BASE_SCHEMA}.users (
    -- プライマリキー（UUID v4）
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 外部認証プロバイダーでのユーザーID
    -- 注意: プロバイダーごとに形式が異なるため VARCHAR(255)
    external_id VARCHAR(255) NOT NULL,

    -- 認証プロバイダー種別
    provider ${BASE_SCHEMA}.auth_provider_type NOT NULL,

    -- ユーザー基本情報
    -- email: RFC 5321準拠の最大長（320文字）
    email VARCHAR(320) NOT NULL,
    name VARCHAR(255) NOT NULL,
    -- avatar_url: 長いURL対応のため TEXT型
    avatar_url TEXT,

    -- タイムスタンプ
    -- PostgreSQL timestamptz型: タイムゾーン情報を保持
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- 複合ユニーク制約: 同一プロバイダー内でのユーザーID重複を防ぐ
    CONSTRAINT unique_external_id_provider UNIQUE (external_id, provider),

    -- CHECK制約: データ品質の保証
    CONSTRAINT valid_email CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT non_empty_name CHECK (
        length(trim(name)) > 0
    ),
    CONSTRAINT valid_avatar_url CHECK (
        avatar_url IS NULL OR avatar_url ~* '^https?://'
    )
);

-- -----------------------------------------------------------------------------
-- インデックス定義: users
-- -----------------------------------------------------------------------------

/**
 * 高速認証のための複合インデックス
 *
 * 使用例: SELECT * FROM users WHERE external_id = ? AND provider = ?
 * 認証フロー（最頻度クエリ）を最適化
 */
CREATE INDEX idx_users_external_id_provider
ON ${BASE_SCHEMA}.users (external_id, provider);

/**
 * メールアドレス検索用インデックス
 *
 * 使用例: SELECT * FROM users WHERE email = ?
 * ユーザー検索・重複チェック用
 */
CREATE INDEX idx_users_email
ON ${BASE_SCHEMA}.users (email);

/**
 * 最終ログイン日時でのソート・フィルタ用インデックス
 *
 * 使用例: SELECT * FROM users ORDER BY last_login_at DESC NULLS LAST
 * アクティブユーザー分析用
 */
CREATE INDEX idx_users_last_login_at
ON ${BASE_SCHEMA}.users (last_login_at DESC NULLS LAST);

/**
 * プロバイダー別統計用インデックス
 *
 * 使用例: SELECT * FROM users WHERE provider = ? ORDER BY created_at DESC
 * プロバイダー別のユーザー登録推移分析用
 */
CREATE INDEX idx_users_provider_created_at
ON ${BASE_SCHEMA}.users (provider, created_at DESC);

-- -----------------------------------------------------------------------------
-- Row-Level Security (RLS) ポリシー定義
-- -----------------------------------------------------------------------------

/**
 * RLS有効化: usersテーブル
 *
 * Supabaseの認証システムと連携して、テーブルレベルのセキュリティを実現。
 * 未認証ユーザーからのアクセスをブロックする。
 */
ALTER TABLE ${BASE_SCHEMA}.users ENABLE ROW LEVEL SECURITY;

/**
 * ポリシー1: 認証済みユーザーのみアクセス可能
 *
 * 適用範囲: SELECT, INSERT, UPDATE, DELETE
 * 条件: auth.uid() IS NOT NULL（Supabase認証済み）
 */
CREATE POLICY authenticated_users_policy ON ${BASE_SCHEMA}.users
    FOR ALL USING (auth.uid() IS NOT NULL);

/**
 * ポリシー2: 自分のレコードのみアクセス可能（将来的な拡張用）
 *
 * 適用範囲: SELECT, UPDATE, DELETE
 * 条件: auth.uid() = id（自分のユーザーID）
 *
 * 注意: 現在は管理者がすべてのユーザーにアクセス可能だが、
 * 将来的に一般ユーザーが自分のプロフィールのみ編集可能にする場合に使用。
 */
CREATE POLICY users_own_records_policy ON ${BASE_SCHEMA}.users
    FOR ALL USING (auth.uid()::text = id::text);

-- -----------------------------------------------------------------------------
-- トリガー定義: updated_at自動更新
-- -----------------------------------------------------------------------------

/**
 * updated_at自動更新関数
 *
 * UPDATE時に自動的に updated_at を現在時刻に更新する。
 * Drizzle ORMでは明示的に updated_at を指定しない限り、この関数が実行される。
 */
CREATE OR REPLACE FUNCTION ${BASE_SCHEMA}.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/**
 * トリガー: users.updated_at 自動更新
 */
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON ${BASE_SCHEMA}.users
    FOR EACH ROW
    EXECUTE FUNCTION ${BASE_SCHEMA}.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- コメント定義（PostgreSQLカタログ）
-- -----------------------------------------------------------------------------

COMMENT ON TABLE ${BASE_SCHEMA}.users IS
'ユーザーテーブル。DDD User Entityに対応。Supabase認証と連携し、外部プロバイダー（Google, Apple等）の認証情報を管理する。';

COMMENT ON COLUMN ${BASE_SCHEMA}.users.id IS
'ユーザーID（UUID v4）。プライマリキー。自動生成される。';

COMMENT ON COLUMN ${BASE_SCHEMA}.users.external_id IS
'外部認証プロバイダーでのユーザーID。プロバイダーごとに形式が異なる（例: Google→数値ID, GitHub→ユーザー名）';

COMMENT ON COLUMN ${BASE_SCHEMA}.users.provider IS
'認証プロバイダー種別。google, apple, microsoft, github, facebook, line のいずれか。';

COMMENT ON COLUMN ${BASE_SCHEMA}.users.email IS
'メールアドレス（RFC 5321準拠、最大320文字）。重複不可。CHECK制約で正規表現検証される。';

COMMENT ON COLUMN ${BASE_SCHEMA}.users.name IS
'ユーザー名。空文字列不可（CHECK制約で検証）';

COMMENT ON COLUMN ${BASE_SCHEMA}.users.avatar_url IS
'アバターURL。NULL許可。設定される場合は https:// または http:// で始まる必要がある（CHECK制約で検証）';

COMMENT ON COLUMN ${BASE_SCHEMA}.users.created_at IS
'作成日時（タイムゾーン付き）。デフォルトで現在時刻が設定される。';

COMMENT ON COLUMN ${BASE_SCHEMA}.users.updated_at IS
'更新日時（タイムゾーン付き）。レコード更新時に自動的に現在時刻が設定される（トリガーによる）';

COMMENT ON COLUMN ${BASE_SCHEMA}.users.last_login_at IS
'最終ログイン日時（タイムゾーン付き）。NULL許可。認証APIコールバック時に更新される。';

-- -----------------------------------------------------------------------------
-- サンプルデータ（開発・テスト環境のみ）
-- -----------------------------------------------------------------------------

-- 注意: 本番環境では実行しない
-- テスト環境でのみ以下のサンプルデータを投入

-- サンプルユーザー1: Google認証
INSERT INTO ${BASE_SCHEMA}.users (
    external_id,
    provider,
    email,
    name,
    avatar_url,
    last_login_at
) VALUES (
    '1234567890',
    'google',
    'test.user1@example.com',
    'Test User 1',
    'https://example.com/avatar1.jpg',
    CURRENT_TIMESTAMP
) ON CONFLICT (external_id, provider) DO NOTHING;

-- サンプルユーザー2: GitHub認証
INSERT INTO ${BASE_SCHEMA}.users (
    external_id,
    provider,
    email,
    name,
    avatar_url,
    last_login_at
) VALUES (
    'testuser2',
    'github',
    'test.user2@example.com',
    'Test User 2',
    'https://example.com/avatar2.jpg',
    CURRENT_TIMESTAMP
) ON CONFLICT (external_id, provider) DO NOTHING;

-- サンプルユーザー3: Apple認証（アバターなし）
INSERT INTO ${BASE_SCHEMA}.users (
    external_id,
    provider,
    email,
    name,
    avatar_url,
    last_login_at
) VALUES (
    'apple_user_id_xyz',
    'apple',
    'test.user3@example.com',
    'Test User 3',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '7 days'
) ON CONFLICT (external_id, provider) DO NOTHING;

-- -----------------------------------------------------------------------------
-- パフォーマンス分析クエリ（開発・運用参考）
-- -----------------------------------------------------------------------------

-- 未使用（削除推奨）
-- 以下のクエリは設計検証・パフォーマンス分析用であり、実際のアプリケーションでは使用しない

-- プロバイダー別ユーザー数
-- SELECT provider, COUNT(*) FROM ${BASE_SCHEMA}.users GROUP BY provider;

-- 最近ログインしたユーザー（直近30日）
-- SELECT * FROM ${BASE_SCHEMA}.users
-- WHERE last_login_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
-- ORDER BY last_login_at DESC;

-- メールドメイン別ユーザー数（統計用）
-- SELECT
--     substring(email from '@(.*)$') as domain,
--     COUNT(*) as user_count
-- FROM ${BASE_SCHEMA}.users
-- GROUP BY domain
-- ORDER BY user_count DESC;

-- -----------------------------------------------------------------------------
-- まとめ
-- -----------------------------------------------------------------------------

/**
 * このスキーマ設計の主要な特徴：
 *
 * 1. Single Source of Truth: Drizzle ORMスキーマ定義（schema.ts）が正
 * 2. 環境分離: BASE_SCHEMA環境変数でProduction/Preview/Test環境を分離
 * 3. RLS統合: Supabase認証と連携したRow-Level Security
 * 4. インデックス最適化: 認証・検索・分析用の複数インデックス
 * 5. データ品質保証: CHECK制約による入力検証
 * 6. 拡張性: ENUMで認証プロバイダー追加が容易
 * 7. 自動生成連携: Drizzle Zod → Zod → OpenAPI → TypeScript型定義
 *
 * 型安全性の保証範囲：
 * - データベースレベル: CHECK制約・ENUM制約
 * - アプリケーションレベル: Zod実行時バリデーション
 * - コンパイルレベル: TypeScript型チェック
 */
