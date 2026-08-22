import { Hono } from 'hono';
import { AuthenticationDomainService } from '@/user/domain/services/AuthenticationDomainService';
import { AuthDIContainer } from '@/user/infrastructure/AuthDIContainer';
import { issueTestAccessToken } from '@/user/infrastructure/TestBypassAuthProvider';

/**
 * テスト専用ユーザー認証ルート
 *
 * E2Eから、project作成者としての実バックエンド呼び出しに使う疑似アクセストークンを
 * 発行するための経路。`isTestEndpointsEnabled()`がtrueの場合のみ
 * `entrypoints/index.ts`で登録される。本番環境では絶対にマウントされない。
 */
const authTest = new Hono();

authTest.post('/__test__/auth-sessions', async (c) => {
  const body = await c.req.json();
  const email = body.email;
  if (!email || typeof email !== 'string') {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'emailは必須です',
        },
      },
      400,
    );
  }
  const name = (body.name as string | undefined) ?? 'E2E Test User';

  const domainService = new AuthenticationDomainService(
    AuthDIContainer.getUserRepository(),
  );
  const { user } = await domainService.authenticateUser({
    id: `e2e_${crypto.randomUUID()}`,
    provider: 'email',
    email,
    name,
  });

  const accessToken = issueTestAccessToken({
    sub: user.externalId,
    email: user.email,
    provider: user.provider,
  });

  return c.json({ success: true, data: { accessToken, userId: user.id } }, 201);
});

export default authTest;
