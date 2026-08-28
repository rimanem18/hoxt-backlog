import { Hono } from 'hono';
import { TestInvitationStore } from '@/viewer/infrastructure/TestInvitationStore';
import { TestOnlyViewerAccessTokenIssuer } from '@/viewer/infrastructure/TestOnlyViewerAccessTokenIssuer';
import { ViewerDIContainer } from '@/viewer/infrastructure/ViewerDIContainer';

/**
 * テスト専用viewerルート
 *
 * E2Eから、招待メールの送信内容（生トークンを含むアクセスURL）や、
 * 任意のexpiresAtを指定したトークン発行を行うための経路。
 * `isTestEndpointsEnabled()`がtrueの場合のみ`entrypoints/index.ts`で登録される。
 * 本番環境では絶対にマウントされない。
 */
const viewerTest = new Hono();

viewerTest.get('/__test__/invitations', (c) => {
  const recipient = c.req.query('recipient');
  if (!recipient) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'recipientクエリパラメータが必要です',
        },
      },
      400,
    );
  }

  const record =
    TestInvitationStore.getInstance().findLatestByRecipient(recipient);
  if (!record) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '記録された送信内容が見つかりません',
        },
      },
      404,
    );
  }

  return c.json({ success: true, data: record });
});

viewerTest.post('/__test__/viewer-tokens', async (c) => {
  const body = await c.req.json();

  const issuer = new TestOnlyViewerAccessTokenIssuer(
    ViewerDIContainer.getViewerAccessTokenRepository(),
    ViewerDIContainer.getTokenHasher(),
  );
  const result = await issuer.issue(body.email, new Date(body.expiresAt));

  return c.json({ success: true, data: { rawToken: result.rawToken } }, 201);
});

export default viewerTest;
