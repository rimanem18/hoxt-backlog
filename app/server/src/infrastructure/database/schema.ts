/**
 * Drizzle ORMスキーマ定義
 *
 * データベーススキーマをDrizzle形式で定義し、型安全性とZod統合を実現
 * 既存のdatabase-schema.sqlの仕様に完全準拠
 */

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * PostgreSQLスキーマの取得
 *
 * 外部から渡されたBASE_SCHEMAをそのまま使用
 * - Production: app_projectname
 * - Preview: app_projectname_preview
 * 環境別の分離は外部（Terraform/GitHub Actions等）で制御される
 * drizzle-kit制約: 'public'を明示的に指定できないため、デフォルトは空文字（自動的にpublicになる）
 */
const schemaName = process.env.BASE_SCHEMA || '';
const schema = schemaName ? pgSchema(schemaName) : pgSchema();

/**
 * 認証プロバイダー種別のenum定義
 * 将来的な拡張を考慮した設計
 * スキーマ内に定義することで環境分離を実現
 */
export const authProviderType = schema.enum('auth_provider_type', [
  'google',
  'apple',
  'microsoft',
  'github',
  'facebook',
  'line',
]);

/**
 * ユーザーテーブル
 * DDD User Entityに対応するメインテーブル
 */
export const users = schema.table(
  'users',
  {
    // プライマリキー（UUID v4）
    id: uuid('id').primaryKey().defaultRandom(),

    // 外部認証プロバイダーでのユーザーID
    externalId: varchar('external_id', { length: 255 }).notNull(),

    // 認証プロバイダー種別
    provider: authProviderType('provider').notNull(),

    // ユーザー基本情報
    email: varchar('email', { length: 320 }).notNull(), // RFC 5321準拠の最大長
    name: varchar('name', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'), // 長いURL対応

    // タイムスタンプ
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => {
    return {
      // 複合ユニーク制約: external_id + provider
      uniqueExternalIdProvider: uniqueIndex('unique_external_id_provider').on(
        table.externalId,
        table.provider,
      ),

      // 高速認証のための複合インデックス
      externalIdProviderIndex: index('idx_users_external_id_provider').on(
        table.externalId,
        table.provider,
      ),

      // メールアドレス検索用インデックス
      emailIndex: index('idx_users_email').on(table.email),

      // 最終ログイン日時でのソート・フィルタ用インデックス
      lastLoginAtIndex: index('idx_users_last_login_at').on(
        table.lastLoginAt.desc().nullsLast(),
      ),

      // プロバイダー別統計用インデックス
      providerCreatedAtIndex: index('idx_users_provider_created_at').on(
        table.provider,
        table.createdAt.desc(),
      ),

      // CHECK制約
      validEmail: check(
        'valid_email',
        sql`${table.email} ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`,
      ),
      nonEmptyName: check(
        'non_empty_name',
        sql`length(trim(${table.name})) > 0`,
      ),
      validAvatarUrl: check(
        'valid_avatar_url',
        sql`${table.avatarUrl} IS NULL OR ${table.avatarUrl} ~* '^https?://'`,
      ),
    };
  },
);

/**
 * usersテーブルの型定義
 * Drizzleから自動推論される型
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * 認証プロバイダー型の型定義
 * enum値の型安全性を確保
 */
export type AuthProvider = (typeof authProviderType.enumValues)[number];

/**
 * Row-Level Security (RLS) ポリシー定義
 *
 * Supabaseの認証システムと連携してテーブルレベルのセキュリティを実現
 */
export const rlsPolicies = {
  /**
   * usersテーブル用RLSポリシー
   * 認証済みユーザーのみアクセス可能
   */
  enableUsersRLS: sql`
    -- usersテーブルのRLSを有効化
    ALTER TABLE ${users} ENABLE ROW LEVEL SECURITY;
    
    -- 認証済みユーザーのみアクセス可能なポリシー
    CREATE POLICY "authenticated_users_policy" ON ${users}
      FOR ALL USING (auth.uid() IS NOT NULL);
    
    -- 自分のレコードのみアクセス可能なポリシー（将来的な拡張用）
    CREATE POLICY "users_own_records_policy" ON ${users}
      FOR ALL USING (auth.uid()::text = id::text);
  `,

  /**
   * RLSポリシーの無効化（開発・テスト用）
   */
  disableUsersRLS: sql`
    -- usersテーブルのポリシーを削除
    DROP POLICY IF EXISTS "authenticated_users_policy" ON ${users};
    DROP POLICY IF EXISTS "users_own_records_policy" ON ${users};
    
    -- RLSを無効化
    ALTER TABLE ${users} DISABLE ROW LEVEL SECURITY;
  `,
};
