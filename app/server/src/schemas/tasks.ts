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
import { z } from 'zod';
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

/**
 * taskPrioritySchema（enumから自動生成）
 * タスクの優先度
 */
export const taskPrioritySchema = z.enum(['high', 'medium', 'low']);

export type TaskPriority = z.infer<typeof taskPrioritySchema>;

/**
 * taskStatusSchema（enumから自動生成）
 * タスクのステータス
 */
export const taskStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'in_review',
  'completed',
]);

export type TaskStatus = z.infer<typeof taskStatusSchema>;
/**
 * Task作成用のカスタムバリデーションスキーマ
 *
 * API リクエストのバリデーションに使用する
 */
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'タイトルを入力してください' })
    .max(100, { message: 'タイトルは100文字以内で入力してください' }),
});

export type CreateTask = z.infer<typeof createTaskSchema>;
