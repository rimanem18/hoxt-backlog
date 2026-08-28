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
import { projectViewers } from '@/shared/database/schema';

/**
 * ProjectViewerテーブルのSelectスキーマ（DB読み取り型）
 *
 * Drizzle ORMのproject_viewersテーブルから自動生成された型安全なスキーマ。
 * データベースから取得したデータの検証に使用する。
 */
export const selectProjectViewerSchema = createSelectSchema(projectViewers);

/**
 * ProjectViewerテーブルのInsertスキーマ（DB書き込み型）
 *
 * Drizzle ORMのproject_viewersテーブルから自動生成された型安全なスキーマ。
 * データベースへの挿入データの検証に使用する。
 */
export const insertProjectViewerSchema = createInsertSchema(projectViewers);

/**
 * 型定義のエクスポート
 */
export type SelectProjectViewer = z.infer<typeof selectProjectViewerSchema>;
export type InsertProjectViewer = z.infer<typeof insertProjectViewerSchema>;

/**
 * viewerStatusSchema（enumから自動生成）
 * viewer招待の状態
 */
export const viewerStatusSchema = z.enum([
  'active',
  'revoked',
]);

export type ViewerStatus = z.infer<typeof viewerStatusSchema>;
