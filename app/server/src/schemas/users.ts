/**
 * このファイルは自動生成されました
 *
 * 生成日時: 2025-11-04T09:23:15.136Z
 * 生成元: scripts/generate-schemas.ts
 *
 * ⚠️ 警告: このファイルを手動で編集しないでください ⚠️
 * Drizzleスキーマを変更した場合は、以下のコマンドで再生成してください:
 *   bun run generate:schemas
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { authProviderType, users } from '@/infrastructure/database/schema';

/**
 * UserテーブルのSelectスキーマ（DB読み取り型）
 *
 * Drizzle ORMのusersテーブルから自動生成された型安全なスキーマ。
 * データベースから取得したデータの検証に使用する。
 */
export const selectUserSchema = createSelectSchema(users);

/**
 * UserテーブルのInsertスキーマ（DB書き込み型）
 *
 * Drizzle ORMのusersテーブルから自動生成された型安全なスキーマ。
 * データベースへの挿入データの検証に使用する。
 */
export const insertUserSchema = createInsertSchema(users);

/**
 * 型定義のエクスポート
 */
export type SelectUser = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

/**
 * authProviderSchema（enumから自動生成）
 */
export const authProviderSchema = z.enum([
  'google',
  'apple',
  'microsoft',
  'github',
  'facebook',
  'line',
]);

export type AuthProvider = z.infer<typeof authProviderSchema>;
