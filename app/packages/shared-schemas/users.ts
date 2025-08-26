/**
 * ユーザー関連のZodスキーマ定義
 *
 * Drizzleスキーマから生成したベーススキーマを元に、
 * API契約（Data Transfer Object）を定義する
 */

import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// TODO: Drizzleスキーマのimportを実装
// packagesディレクトリのバインド設定が必要
// import { users } from '../../server/src/infrastructure/database/schema';

/**
 * 一時的な実装: 手動でZodスキーマを定義
 *
 * 将来的にはDrizzleスキーマから自動生成に移行
 */

/**
 * 認証プロバイダー種別
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

/**
 * ユーザー基本スキーマ（DB完全版）
 */
export const userBaseSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string().min(1),
  provider: authProviderSchema,
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().nullable(),
});

/**
 * API: ユーザー作成リクエスト
 * JITプロビジョニング時に使用
 */
export const createUserRequestSchema = userBaseSchema.pick({
  externalId: true,
  provider: true,
  email: true,
  name: true,
  avatarUrl: true,
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

/**
 * API: ユーザー更新リクエスト
 * 部分更新対応
 */
export const updateUserRequestSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  lastLoginAt: z.date().optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

/**
 * API: ユーザー情報レスポンス
 * 公開用（機密情報を除外）
 */
export const userResponseSchema = userBaseSchema.pick({
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
  lastLoginAt: true,
});

export type UserResponse = z.infer<typeof userResponseSchema>;

/**
 * API: ユーザープロフィール取得レスポンス
 * GET /api/user/profile エンドポイントのレスポンス形式
 */
export const getUserProfileResponseSchema = z.object({
  success: z.literal(true),
  data: userBaseSchema.omit({ updatedAt: true }).extend({
    createdAt: z.string().datetime(),
    lastLoginAt: z.string().datetime().nullable(),
  }),
});

export type GetUserProfileResponse = z.infer<typeof getUserProfileResponseSchema>;

/**
 * API: 認証レスポンス
 * 認証成功時のレスポンス形式
 */
export const authResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: userResponseSchema,
    isNewUser: z.boolean(),
  }),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/**
 * API: 共通エラーレスポンス
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
