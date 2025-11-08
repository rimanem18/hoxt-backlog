/**
 * Drizzle Kit設定ファイル
 *
 * マイグレーション生成、データベース接続、スキーマ管理に関する設定
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // スキーマファイルの場所
  schema: './src/infrastructure/database/schema.ts',

  // マイグレーションファイルの出力先
  out: './src/infrastructure/database/migrations',

  // データベース情報
  dialect: 'postgresql',

  // データベース接続設定
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
    // CI環境とローカル開発環境ではSSLを無効化、本番環境では有効化
    ssl: process.env.NODE_ENV === 'production' ? true : false,
  },

  // スキーマフィルタ
  schemaFilter: [process.env.BASE_SCHEMA || 'public'],

  // デバッグ設定
  verbose: true,
  strict: true,
});
