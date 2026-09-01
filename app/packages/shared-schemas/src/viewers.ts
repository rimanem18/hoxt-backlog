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

export const listProjectViewersResponseSchema = apiResponseSchema(
  z.array(projectViewerSchema),
).openapi('ListProjectViewersResponse');

// ===== viewer横断閲覧スキーマ =====

export const viewerAccessibleTaskSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
}).openapi('ViewerAccessibleTask', {
  description: 'viewerが閲覧できるtask情報',
});

export const viewerAccessibleProjectSchema = z.object({
  projectId: z.uuid(),
  projectName: z.string(),
  ownerName: z.string().nullable(),
  tasks: z.array(viewerAccessibleTaskSchema),
}).openapi('ViewerAccessibleProject', {
  description: 'viewerが閲覧できるprojectとそのtask一覧',
});

export const getViewerTasksResponseSchema = apiResponseSchema(
  z.object({
    viewerEmail: z.email(),
    projects: z.array(viewerAccessibleProjectSchema),
  }),
).openapi('GetViewerTasksResponse');

// ===== 型エクスポート =====

export type ProjectViewer = z.infer<typeof projectViewerSchema>;
export type InviteViewerInput = z.infer<typeof inviteViewerSchema>;
export type InviteViewerResponse = z.infer<typeof inviteViewerResponseSchema>;
export type ListProjectViewersResponse = z.infer<
  typeof listProjectViewersResponseSchema
>;
export type ViewerAccessibleTask = z.infer<typeof viewerAccessibleTaskSchema>;
export type ViewerAccessibleProject = z.infer<
  typeof viewerAccessibleProjectSchema
>;
export type GetViewerTasksResponse = z.infer<
  typeof getViewerTasksResponseSchema
>;
