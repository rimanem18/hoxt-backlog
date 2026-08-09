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
import { projects } from '@/shared/database/schema';

/**
 * ProjectテーブルのSelectスキーマ（DB読み取り型）
 *
 * Drizzle ORMのprojectsテーブルから自動生成された型安全なスキーマ。
 * データベースから取得したデータの検証に使用する。
 */
export const selectProjectSchema = createSelectSchema(projects);

/**
 * ProjectテーブルのInsertスキーマ（DB書き込み型）
 *
 * Drizzle ORMのprojectsテーブルから自動生成された型安全なスキーマ。
 * データベースへの挿入データの検証に使用する。
 */
export const insertProjectSchema = createInsertSchema(projects);

/**
 * 型定義のエクスポート
 */
export type SelectProject = z.infer<typeof selectProjectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;

/**
 * Project作成用のカスタムバリデーションスキーマ
 *
 * API リクエストのバリデーションに使用する
 */
export const createProjectSchema = z.object({
    name: z.string().min(1, { message: '名前を入力してください' }).max(100, { message: '名前は100文字以内で入力してください' }),
});

export type CreateProject = z.infer<typeof createProjectSchema>;
