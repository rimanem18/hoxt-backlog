/**
 * メールサインアップAPIのOpenAPIルート定義（スキーマのみ）
 *
 * Why: OpenAPI仕様生成時にデータベース接続を不要にするため、
 * createRoute定義のみを分離し、ハンドラ実装（DIコンテナ呼び出し）を含まない。
 */

import { createRoute, z } from '@hono/zod-openapi';
import {
  apiErrorResponseSchema,
  apiResponseSchema,
  emailSchema,
} from '@/packages/shared-schemas/src/common';

/**
 * パスワードバリデーションスキーマ
 *
 * Supabase Auth ポリシーに合わせ、8文字以上・大文字・小文字・記号を必須とする。
 */
const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上である必要があります')
  .regex(
    /(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])/,
    'パスワードは大文字・小文字・記号をそれぞれ1文字以上含む必要があります',
  );

/**
 * POST /auth/email/signup リクエストスキーマ
 */
export const emailSignupRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const emailSignupSuccessSchema = apiResponseSchema(
  z.object({
    pendingEmailConfirmation: z.literal(true),
  }),
);

/**
 * POST /auth/email/signup のOpenAPIルート定義
 *
 * メールアドレスとパスワードで新規ユーザーを登録し、確認メールを送信する。
 */
export const emailSignupRoute = createRoute({
  method: 'post',
  path: '/auth/email/signup',
  tags: ['認証'],
  summary: 'メールアドレス＋パスワードでのユーザー登録',
  description:
    'メールアドレスとパスワードで新規ユーザーを登録し、確認メールを送信する。' +
    '確認メールのリンクをクリックした後にサインインが可能になる。',
  request: {
    body: {
      content: {
        'application/json': {
          schema: emailSignupRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: emailSignupSuccessSchema,
        },
      },
      description: '登録成功（確認メール送信済み）',
    },
    400: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'バリデーションエラー',
    },
    409: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'メールアドレス重複（Google登録済みまたはemail登録済み）',
    },
    500: {
      content: {
        'application/json': {
          schema: apiErrorResponseSchema,
        },
      },
      description: 'サーバーエラー',
    },
  },
});
