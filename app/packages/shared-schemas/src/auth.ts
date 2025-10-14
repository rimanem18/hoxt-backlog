/**
 * 認証API契約スキーマ
 *
 * 認証関連のリクエスト・レスポンススキーマを定義
 * - POST /auth/callback: Supabase認証後のコールバック処理
 *
 * 注意: このファイルはAPI契約のみを定義します。
 * DBスキーマ（selectUserSchema等）は server/src/schemas/ で定義され、
 * 実装時にそちらを参照します。
 */

import { z } from 'zod';
import { emailSchema, urlSchema, apiResponseSchema } from './common';

/**
 * 認証プロバイダー種別
 *
 * サポートする認証プロバイダーの種別
 * 注意: この定義はDBスキーマ（auth_provider_type enum）と一致させる必要があります
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
 * 認証コールバックリクエストスキーマ
 *
 * POST /auth/callback のリクエストボディ
 * Supabase認証後のユーザー情報を受け取る
 *
 * @property externalId - 外部プロバイダーでのユーザーID
 * @property provider - 認証プロバイダー種別
 * @property email - メールアドレス
 * @property name - ユーザー名
 * @property avatarUrl - アバターURL（オプション）
 */
export const authCallbackRequestSchema = z.object({
  externalId: z
    .string()
    .min(1, 'externalIdは1文字以上である必要があります'),
  provider: authProviderSchema,
  email: emailSchema,
  name: z.string().min(1, 'ユーザー名は1文字以上である必要があります'),
  avatarUrl: urlSchema.optional(),
});

/**
 * ユーザー情報スキーマ（API契約用）
 *
 * 認証コールバックレスポンスに含まれるユーザー情報
 * 注意: 実装時はserver/src/schemas/users.tsのselectUserSchemaを使用
 */
export const userSchema = z.object({
  id: z.string().uuid(),
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
 * 認証コールバックレスポンススキーマ
 *
 * POST /auth/callback の成功レスポンス形式
 * { success: true, data: User }
 */
export const authCallbackResponseSchema = apiResponseSchema(userSchema);

/**
 * 型定義のエクスポート
 */
export type AuthCallbackRequest = z.infer<typeof authCallbackRequestSchema>;
export type AuthCallbackResponse = z.infer<typeof authCallbackResponseSchema>;

/**
 * 既存コードとの互換性のための型定義
 */

/**
 * AuthenticateUserUseCase の入力型（既存コードとの互換性）
 * JWT検証・ユーザー認証処理の入力パラメータ
 */
export interface AuthenticateUserUseCaseInput {
  /** Supabase Auth発行のJWTトークン */
  jwt: string;
}

/**
 * AuthenticateUserUseCase の出力型（既存コードとの互換性）
 * JWT検証・ユーザー認証処理の出力結果
 */
export interface AuthenticateUserUseCaseOutput {
  /** 認証済み・作成されたユーザー情報 */
  user: User;
  /** 新規作成ユーザーかどうかのフラグ */
  isNewUser: boolean;
}

/**
 * 認証成功レスポンス型（既存コードとの互換性）
 * 認証成功時のAPIレスポンス形式
 */
export interface AuthResponse {
  /** 成功フラグ */
  success: boolean;
  /** 認証済みユーザーデータ */
  data: AuthenticateUserUseCaseOutput;
}

/**
 * エラーレスポンス型（既存コードとの互換性）
 */
export type { ErrorResponse } from './common';
