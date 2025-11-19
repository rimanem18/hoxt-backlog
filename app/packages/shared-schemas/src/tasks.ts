/**
 * タスク管理API契約スキーマ
 *
 * このファイルはフロントエンドとバックエンドで共有されるAPI契約を定義します。
 * DB実装スキーマ（app/server/src/schemas/tasks.ts）とは別物として管理されます。
 */

import { z } from 'zod';
import { uuidSchema, apiResponseSchema } from './common';

// ===== Enumスキーマ =====

export const taskPrioritySchema = z.enum(['high', 'medium', 'low']).openapi('TaskPriority', {
  description: 'タスクの優先度',
});

export const taskStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'in_review',
  'completed',
]).openapi('TaskStatus', {
  description: 'タスクのステータス',
});

export const taskSortSchema = z.enum([
  'created_at_desc',
  'created_at_asc',
  'priority_desc',
]).openapi('TaskSort', {
  description: 'タスクのソート順',
});

// ===== 基本Taskスキーマ =====

export const taskSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  title: z.string().min(1).max(100),
  description: z.string().nullable(),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi('Task', {
  description: 'タスク情報',
});

// ===== パラメータスキーマ =====

export const getTaskParamsSchema = z.object({
  id: uuidSchema.openapi({
    param: {
      name: 'id',
      in: 'path',
    },
    example: '550e8400-e29b-41d4-a716-446655440000',
  }),
}).openapi('GetTaskParams');

// ===== クエリパラメータスキーマ =====

export const listTasksQuerySchema = z.object({
  priority: taskPrioritySchema.optional().openapi({
    param: {
      name: 'priority',
      in: 'query',
    },
    example: 'high',
  }),
  status: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.split(',').every(s =>
        taskStatusSchema.options.includes(s.trim() as typeof taskStatusSchema.options[number])
      ),
      'ステータスは有効な値のカンマ区切りである必要があります'
    )
    .openapi({
      param: {
        name: 'status',
        in: 'query',
      },
      description: 'ステータス（カンマ区切りで複数選択可能）',
      example: 'in_progress,in_review',
    }),
  sort: taskSortSchema.default('created_at_desc').openapi({
    param: {
      name: 'sort',
      in: 'query',
    },
    example: 'priority_desc',
  }),
}).openapi('ListTasksQuery');

// ===== リクエストボディスキーマ =====

export const createTaskBodySchema = z.object({
  title: z.string()
    .min(1, 'タイトルを入力してください')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().nullable().optional(),
  priority: taskPrioritySchema.default('medium'),
}).openapi('CreateTaskBody');

export const updateTaskBodySchema = z.object({
  title: z.string()
    .min(1, 'タイトルを入力してください')
    .max(100, 'タイトルは100文字以内で入力してください')
    .optional(),
  description: z.string().nullable().optional(),
  priority: taskPrioritySchema.optional(),
}).openapi('UpdateTaskBody');

export const changeTaskStatusBodySchema = z.object({
  status: taskStatusSchema,
}).openapi('ChangeTaskStatusBody');

// ===== レスポンススキーマ =====

export const getTaskResponseSchema = apiResponseSchema(taskSchema)
  .openapi('GetTaskResponse');

export const listTasksResponseSchema = apiResponseSchema(z.array(taskSchema))
  .openapi('ListTasksResponse');

export const createTaskResponseSchema = apiResponseSchema(taskSchema)
  .openapi('CreateTaskResponse');

export const updateTaskResponseSchema = apiResponseSchema(taskSchema)
  .openapi('UpdateTaskResponse');

export const changeTaskStatusResponseSchema = apiResponseSchema(taskSchema)
  .openapi('ChangeTaskStatusResponse');

// ===== 型エクスポート =====

export type Task = z.infer<typeof taskSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskSort = z.infer<typeof taskSortSchema>;

export type GetTaskParams = z.infer<typeof getTaskParamsSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type ChangeTaskStatusBody = z.infer<typeof changeTaskStatusBodySchema>;

export type GetTaskResponse = z.infer<typeof getTaskResponseSchema>;
export type ListTasksResponse = z.infer<typeof listTasksResponseSchema>;
export type CreateTaskResponse = z.infer<typeof createTaskResponseSchema>;
export type UpdateTaskResponse = z.infer<typeof updateTaskResponseSchema>;
export type ChangeTaskStatusResponse = z.infer<typeof changeTaskStatusResponseSchema>;
