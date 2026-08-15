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
import { viewerAccessTokens } from '@/shared/database/schema';

/**
 * ViewerAccessTokenテーブルのSelectスキーマ（DB読み取り型）
 *
 * Drizzle ORMのviewer_access_tokensテーブルから自動生成された型安全なスキーマ。
 * データベースから取得したデータの検証に使用する。
 */
export const selectViewerAccessTokenSchema = createSelectSchema(viewerAccessTokens);

/**
 * ViewerAccessTokenテーブルのInsertスキーマ（DB書き込み型）
 *
 * Drizzle ORMのviewer_access_tokensテーブルから自動生成された型安全なスキーマ。
 * データベースへの挿入データの検証に使用する。
 */
export const insertViewerAccessTokenSchema = createInsertSchema(viewerAccessTokens);

/**
 * 型定義のエクスポート
 */
export type SelectViewerAccessToken = z.infer<typeof selectViewerAccessTokenSchema>;
export type InsertViewerAccessToken = z.infer<typeof insertViewerAccessTokenSchema>;

