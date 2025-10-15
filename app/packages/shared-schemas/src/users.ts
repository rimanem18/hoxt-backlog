/**
 * ユーザーAPI契約スキーマ
 *
 * ユーザー管理関連のリクエスト・レスポンススキーマを定義
 * - GET /users/{id}: ユーザー情報取得
 * - GET /users: ユーザー一覧取得
 * - PUT /users/{id}: ユーザー情報更新
 */

import { z } from 'zod';
import { uuidSchema, urlSchema, apiResponseSchema } from './common';
import { userSchema, authProviderSchema } from './auth';

/**
 * ユーザー取得パラメータスキーマ
 *
 * GET /users/{id} のパスパラメータ
 * @property id - ユーザーID（UUID v4）
 */
export const getUserParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * ユーザー取得レスポンススキーマ
 *
 * GET /users/{id} の成功レスポンス形式
 * { success: true, data: User }
 */
export const getUserResponseSchema = apiResponseSchema(userSchema);

/**
 * ユーザー一覧取得クエリパラメータスキーマ
 *
 * GET /users のクエリパラメータ
 * @property provider - 認証プロバイダーフィルター（オプション）
 * @property limit - 取得件数（デフォルト: 20、範囲: 1-100）
 * @property offset - オフセット（デフォルト: 0）
 */
export const listUsersQuerySchema = z.object({
  provider: authProviderSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * ユーザー一覧取得レスポンスデータスキーマ
 *
 * ユーザー一覧とページネーション情報を含む
 * @property users - ユーザー配列
 * @property total - 総件数
 * @property limit - 取得件数
 * @property offset - オフセット
 */
export const listUsersDataSchema = z.object({
  users: z.array(userSchema),
  total: z.number().int().min(0),
  limit: z.number().int().min(1).max(100),
  offset: z.number().int().min(0),
});

/**
 * ユーザー一覧取得レスポンススキーマ
 *
 * GET /users の成功レスポンス形式
 * { success: true, data: { users: User[], total, limit, offset } }
 */
export const listUsersResponseSchema = apiResponseSchema(listUsersDataSchema);

/**
 * ユーザー更新ボディスキーマ
 *
 * PUT /users/{id} のリクエストボディ
 * @property name - ユーザー名（オプション）
 * @property avatarUrl - アバターURL（オプション）
 */
export const updateUserBodySchema = z.object({
  name: z
    .string()
    .min(1, 'ユーザー名は1文字以上である必要があります')
    .optional(),
  avatarUrl: urlSchema.optional(),
});

/**
 * ユーザー更新レスポンススキーマ
 *
 * PUT /users/{id} の成功レスポンス形式
 * { success: true, data: User }
 */
export const updateUserResponseSchema = apiResponseSchema(userSchema);

/**
 * 型定義のエクスポート
 */
export type GetUserParams = z.infer<typeof getUserParamsSchema>;
export type GetUserResponse = z.infer<typeof getUserResponseSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type UpdateUserResponse = z.infer<typeof updateUserResponseSchema>;

/**
 * ユーザー情報スキーマの再エクスポート
 */
export { userSchema, type User, authProviderSchema, type AuthProvider } from './auth';
