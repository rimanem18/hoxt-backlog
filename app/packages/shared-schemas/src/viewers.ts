/**
 * viewer招待API契約スキーマ
 *
 * このファイルはフロントエンドとバックエンドで共有されるAPI契約を定義します。
 */

import { z } from 'zod';
import { apiResponseSchema } from './common';

// ===== 基本ProjectViewerスキーマ =====

export const projectViewerSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  email: z.email(),
  status: z.enum(['active', 'revoked']),
  invitedAt: z.iso.datetime(),
  revokedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi('ProjectViewer', {
  description: 'プロジェクト閲覧者招待情報',
});

// ===== リクエストボディスキーマ =====

export const inviteViewerSchema = z.object({
  email: z.email('有効なメールアドレス形式である必要があります'),
}).openapi('InviteViewerBody');

// ===== レスポンススキーマ =====

export const inviteViewerResponseSchema = apiResponseSchema(
  projectViewerSchema,
).openapi('InviteViewerResponse');

// ===== 型エクスポート =====

export type ProjectViewer = z.infer<typeof projectViewerSchema>;
export type InviteViewerInput = z.infer<typeof inviteViewerSchema>;
export type InviteViewerResponse = z.infer<typeof inviteViewerResponseSchema>;
