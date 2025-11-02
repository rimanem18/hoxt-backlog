/**
 * 認証API契約スキーマ
 *
 * POST /auth/callback のリクエスト・レスポンススキーマ定義。
 * DB実装時はserver/src/schemas/の対応スキーマを参照。
 */

import { z } from 'zod';
import { emailSchema, urlSchema, apiResponseSchema } from './common';

/**
 * 認証プロバイダー種別
 *
 * DBスキーマ（auth_provider_type enum）と同期必須。
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
 * POST /auth/callback リクエストスキーマ
 *
 * Supabase認証後のユーザー情報。
 */
export const authCallbackRequestSchema = z.object({
  externalId: z
    .string()
    .min(1, 'externalIdは1文字以上である必要があります'),
  provider: authProviderSchema,
  email: emailSchema,
  name: z.string().min(1, 'ユーザー名は1文字以上である必要があります'),
  avatarUrl: urlSchema.nullable().optional(),
});

/**
 * ユーザー情報スキーマ（API契約）
 *
 * 認証レスポンスに含まれるユーザー情報。
 * DB実装時はserver/src/schemas/users.tsのselectUserSchemaを使用。
 */
export const userSchema = z.object({
  id: z.uuid(),
  externalId: z.string(),
  provider: authProviderSchema,
  email: emailSchema,
  name: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable().optional(),
});

export type User = z.infer<typeof userSchema>;

/**
 * POST /auth/callback レスポンススキーマ
 *
 * 成功時の形式: { success: true, data: User }
 */
export const authCallbackResponseSchema = apiResponseSchema(userSchema);

export type AuthCallbackRequest = z.infer<typeof authCallbackRequestSchema>;
export type AuthCallbackResponse = z.infer<typeof authCallbackResponseSchema>;

/** AuthenticateUserUseCase 入力型（既存コード互換） */
export interface AuthenticateUserUseCaseInput {
  jwt: string;
}

/** AuthenticateUserUseCase 出力型（既存コード互換） */
export interface AuthenticateUserUseCaseOutput {
  user: User;
  isNewUser: boolean;
}

/** 認証成功レスポンス型（既存コード互換） */
export interface AuthResponse {
  success: boolean;
  data: AuthenticateUserUseCaseOutput;
}

export type { ErrorResponse } from './common';
