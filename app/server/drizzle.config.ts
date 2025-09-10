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
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
  },

  // デバッグ設定
  verbose: true,
  strict: true,
});
