/**
 * プロジェクト管理API契約スキーマ
 *
 * このファイルはフロントエンドとバックエンドで共有されるAPI契約を定義します。
 * DB実装スキーマ（app/server/src/schemas/projects.ts）とは別物として管理されます。
 */

import { z } from 'zod';
import { apiResponseSchema } from './common';

// ===== 基本Projectスキーマ =====

export const projectSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi('Project', {
  description: 'プロジェクト情報',
});

// ===== リクエストボディスキーマ =====

export const createProjectSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'プロジェクト名を入力してください')
    .max(100, 'プロジェクト名は100文字以内で入力してください'),
  description: z.string().optional(),
}).openapi('CreateProjectBody');

// ===== レスポンススキーマ =====

export const createProjectResponseSchema = apiResponseSchema(projectSchema)
  .openapi('CreateProjectResponse');

// ===== 型エクスポート =====

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateProjectResponse = z.infer<typeof createProjectResponseSchema>;
