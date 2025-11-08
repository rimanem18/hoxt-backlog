/**
 * このファイルは自動生成されました
 *
 * 生成元: scripts/generate-schemas.ts
 *
 * ⚠️ 警告: このファイルを手動で編集しないでください ⚠️
 * Drizzleスキーマを変更した場合は、以下のコマンドで再生成してください:
 *   bun run generate:schemas
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { tasks } from '@/infrastructure/database/schema';

/**
 * TaskテーブルのSelectスキーマ（DB読み取り型）
 *
 * Drizzle ORMのtasksテーブルから自動生成された型安全なスキーマ。
 * データベースから取得したデータの検証に使用する。
 */
export const selectTaskSchema = createSelectSchema(tasks);

/**
 * TaskテーブルのInsertスキーマ（DB書き込み型）
 *
 * Drizzle ORMのtasksテーブルから自動生成された型安全なスキーマ。
 * データベースへの挿入データの検証に使用する。
 */
export const insertTaskSchema = createInsertSchema(tasks);

/**
 * 型定義のエクスポート
 */
export type SelectTask = z.infer<typeof selectTaskSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
