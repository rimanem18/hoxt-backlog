/**
 * 共通型定義
 *
 * API契約で使用される共通的なZodスキーマと型定義を提供
 * - 基本データ型（UUID、メール、URL）
 * - APIレスポンス構造（成功・エラー）
 */

import { extendZodWithOpenApi } from '@hono/zod-openapi';
import { z } from 'zod';

// ZodスキーマをOpenAPI対応に拡張
extendZodWithOpenApi(z);

/**
 * 共通UUID型
 *
 * UUID v4形式の文字列型定義
 * 使用例: ユーザーID、リソースIDなど
 */
export const uuidSchema = z.string().uuid('有効なUUID v4形式である必要があります');

/**
 * 共通メールアドレス型
 *
 * RFC 5321準拠のメールアドレス型定義
 */
export const emailSchema = z.string().email('有効なメールアドレス形式である必要があります');

/**
 * 共通URL型
 *
 * HTTP/HTTPS形式のURL型定義
 * 使用例: アバターURL、外部リンクなど
 */
export const urlSchema = z.string().url('有効なURL形式である必要があります');

/**
 * 共通APIレスポンス構造（ジェネリック）
 *
 * 全てのAPIエンドポイントで使用される標準レスポンス構造
 * 成功時のレスポンスフォーマット
 *
 * @param dataSchema - レスポンスデータのZodスキーマ
 * @returns APIレスポンススキーマ
 *
 * @example
 * ```typescript
 * const getUserResponseSchema = apiResponseSchema(userSchema);
 * // { success: true, data: User }
 * ```
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

/**
 * 共通APIエラーレスポンス構造
 *
 * エラー時のAPIレスポンス形式
 * HTTPステータスコードとともに使用される
 *
 * @example
 * ```typescript
 * // 400 Bad Request
 * {
 *   success: false,
 *   error: {
 *     code: 'VALIDATION_ERROR',
 *     message: 'バリデーションエラー',
 *     details: { name: 'ユーザー名は1文字以上である必要があります' }
 *   }
 * }
 * ```
 */
export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    /** エラーコード（VALIDATION_ERROR、UNAUTHORIZED等） */
    code: z.string(),
    /** ユーザー向けエラーメッセージ */
    message: z.string(),
    /** フィールド単位のエラー詳細（オプション）またはスタックトレース */
    details: z.union([z.record(z.any(), z.string()), z.string()]).optional(),
  }),
});

/**
 * 型定義のエクスポート
 */
export type ApiResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

/**
 * 既存コードとの互換性のためのエクスポート
 */
export type ErrorResponse = ApiErrorResponse;

/**
 * APIエラー情報型（既存コードとの互換性）
 */
export interface ApiError {
  /** エラーコード（INVALID_TOKEN・TOKEN_EXPIRED等） */
  code: string;
  /** ユーザー向けエラーメッセージ */
  message: string;
  /** 開発者向け詳細情報（オプション） */
  details?: string | Record<string, string>;
}

/**
 * GET /api/user/profile レスポンス型（既存コードとの互換性）
 * ユーザープロフィール取得APIの専用レスポンス形式
 */
export interface GetUserProfileResponse<T = unknown> {
  /** 成功フラグ */
  success: boolean;
  /** レスポンスデータ（成功時のみ） */
  data?: T;
  /** エラー情報（失敗時のみ） */
  error?: ApiError;
}
