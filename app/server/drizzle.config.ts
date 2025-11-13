/**
 * Drizzle Kit設定ファイル
 *
 * マイグレーション生成、データベース接続、スキーマ管理に関する設定
 */

import { defineConfig } from 'drizzle-kit';
const baseSchema = process.env.BASE_SCHEMA || 'public';

export default defineConfig({
  // スキーマファイルの場所
  schema: './src/infrastructure/database/schema.ts',

  // マイグレーションファイルの出力先
  // スキーマごとに別フォルダ
  out: `./src/infrastructure/database/migrations/${baseSchema}`,

  // データベース情報
  dialect: 'postgresql',

  // データベース接続設定
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
    // CI環境とローカル開発環境ではSSLを無効化、本番環境では有効化
    ssl: process.env.NODE_ENV === 'production' ? true : false,
  },

    // migration ログテーブルもスキーマごとに分ける
  migrations: {
    table: '__drizzle_migrations__',
    schema: baseSchema, // preview.__drizzle_migrations__, production.__drizzle_migrations__ みたいに分かれる
  },

  // デバッグ設定
  verbose: true,
  strict: true,
});

