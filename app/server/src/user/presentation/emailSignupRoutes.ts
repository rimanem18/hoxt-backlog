import { OpenAPIHono } from '@hono/zod-openapi';
import { formatZodError } from '@/shared/utils/zodErrorFormatter';
import type { IEmailSignupUseCase } from '@/user/application/IEmailSignupUseCase';
import { EmailAlreadyRegisteredError } from '@/user/domain/errors/EmailAlreadyRegisteredError';
import { EmailAlreadyRegisteredGoogleError } from '@/user/domain/errors/EmailAlreadyRegisteredGoogleError';
import { SignupFailedError } from '@/user/domain/errors/SignupFailedError';
import { AuthDIContainer } from '@/user/infrastructure/AuthDIContainer';
import { emailSignupRoute } from './emailSignupRoutes.schema';

/** REQ-302: Google 登録済みメールアドレスへの案内文 */
const GOOGLE_CONFLICT_MESSAGE =
  'このメールアドレスは Google アカウントで登録済みです。' +
  'Google ログインのままご利用いただけます。' +
  'パスワードでのログインを追加したい場合は、' +
  'Google でログインのうえ設定画面から設定できます。';

/**
 * メールサインアップAPIルート定義
 *
 * テストではファクトリ関数にモック UseCase を渡すことで DI 可能。
 *
 * @example
 * ```typescript
 * import emailSignup from './emailSignupRoutes';
 * app.route('/api', emailSignup);
 * ```
 */
export function createEmailSignupRouter(
  getUseCase: () => IEmailSignupUseCase = () =>
    AuthDIContainer.getEmailSignupUseCase(),
): OpenAPIHono {
  const emailSignup = new OpenAPIHono({
    /**
     * Zodバリデーションエラーのカスタムハンドラ
     *
     * バリデーションエラーをapiErrorResponseSchema形式に変換し、
     * フィールド単位の詳細エラー情報を返却する。
     */
    defaultHook: (result, c) => {
      if (result.success) {
        return;
      }

      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'バリデーションエラー',
            details: formatZodError(result.error.issues),
          },
        },
        400,
      );
    },
  });

  emailSignup.openapi(emailSignupRoute, async (c) => {
    const { email, password } = c.req.valid('json');

    try {
      const useCase = getUseCase();
      const result = await useCase.execute({ email, password });
      return c.json({ success: true as const, data: result }, 201);
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredGoogleError) {
        return c.json(
          {
            success: false,
            error: {
              code: 'EMAIL_ALREADY_REGISTERED_GOOGLE',
              message: GOOGLE_CONFLICT_MESSAGE,
            },
          },
          409,
        );
      }

      if (error instanceof EmailAlreadyRegisteredError) {
        return c.json(
          {
            success: false,
            error: {
              code: 'EMAIL_ALREADY_REGISTERED',
              message:
                'このメールアドレスはすでに登録されています。サインインをお試しください。',
            },
          },
          409,
        );
      }

      if (error instanceof SignupFailedError) {
        console.error('[EmailSignup] signup failed:', {
          timestamp: new Date().toISOString(),
          causeMessage: error.causeMessage,
        });
        return c.json(
          {
            success: false,
            error: {
              code: 'SIGNUP_FAILED',
              message: 'サインアップに失敗しました。',
            },
          },
          500,
        );
      }

      console.error('[SECURITY] Unexpected error in email signup endpoint:', {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: '/api/auth/email/signup',
      });

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: '一時的にサービスが利用できません。',
          },
        },
        500,
      );
    }
  });

  return emailSignup;
}

export default createEmailSignupRouter();
