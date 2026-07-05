import { expect, test } from '@playwright/test';
import { cleanupTestState } from '../auth/helpers/test-setup';
import { mockPasswordResetRequestSuccess } from './helpers/mock-email-auth';

test.describe('メールパスワード認証 E2Eテスト - パスワードリセット', () => {
  test.afterEach(async ({ page }) => {
    await cleanupTestState(page);
  });

  test('パスワードリセットを要求すると、送信完了メッセージが表示される', async ({
    page,
  }) => {
    // Given: パスワードリセットメール送信成功のモック
    await mockPasswordResetRequestSuccess(page);

    // When: /auth/forgot-password でメールアドレスを入力して送信
    await page.goto('/auth/forgot-password');
    await page.getByLabel('メールアドレス').fill('confirmed.user@example.com');
    await page.getByRole('button', { name: '送信' }).click();

    // Then: 送信完了メッセージが表示される（REQ-104）
    await expect(
      page.getByText('パスワードリセットメールを送信しました'),
    ).toBeVisible();
  });

  test('無効なリセットリンクでアクセスすると、リンク無効メッセージが表示される', async ({
    page,
  }) => {
    // Given & When: 期限切れリンクの error_code 付き URL に直接アクセス
    await page.goto(
      '/auth/reset-password?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    );

    // Then: リンクが無効か期限切れである旨のメッセージが表示される（REQ-305, AC-03）
    await expect(
      page.getByRole('alert').filter({ hasText: 'リンクが無効' }),
    ).toContainText('リンクが無効か期限切れです');

    // And: 再度パスワードリセットを要求するリンクが正しい遷移先を指す
    await expect(
      page.getByRole('link', { name: '再度パスワードリセットを要求する' }),
    ).toHaveAttribute('href', '/auth/forgot-password');
  });
});
