import { expect, type Page } from '@playwright/test';
import {
  cleanupTestState,
  setupAuthenticatedApiMocks,
  setupUnauthenticatedApiMocks,
  test,
} from '../shared/helpers/auth-session';
import { expectDashboard } from '../shared/helpers/dashboard';

async function expectHomeScreen(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'アカウントでログイン' }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL('/');
}

test.describe('認証フロー E2Eテスト', () => {
  test('ログイン済のユーザーは、ダッシュボードへリダイレクトする', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 有効なセッションを保持しているユーザー
    const page = await createAuthenticatedPage();
    await setupAuthenticatedApiMocks(page);

    // When: ホーム画面にアクセス
    await page.goto('/');

    // Then: 自動的にダッシュボードへリダイレクトされる
    await expectDashboard(page);
  });

  test('ダッシュボードが表示されているときにページをリロードすると、認証状態が復元されてダッシュボードが引き続き表示される', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 有効なセッションを保持しダッシュボードを表示中
    const page = await createAuthenticatedPage();
    await setupAuthenticatedApiMocks(page);
    await page.goto('/dashboard');
    await expectDashboard(page);

    // When: ページをリロード
    await page.reload();

    // Then: 認証状態が復元され、引き続きダッシュボードが表示される
    await expectDashboard(page);
  });

  test('JWT期限切れ時、リロードしてもダッシュボードではなくホーム画面にとどまる', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 期限切れのセッションを保持している
    const page = await createAuthenticatedPage({
      expiresAt: Math.floor(Date.now() / 1000) - 3600,
    });
    await setupAuthenticatedApiMocks(page);

    await page.goto('/dashboard');
    await expectHomeScreen(page);

    // When: ページをリロード
    await page.reload();

    // Then: ダッシュボードには入れず、ホーム画面にとどまり続ける
    await expectHomeScreen(page);
  });

  test('未認証ユーザーが認証保護されたダッシュボードに直接アクセスしても、ホーム画面にリダイレクトされる', async ({
    page,
  }) => {
    try {
      // Given: 未認証状態（セッションなし）
      await setupUnauthenticatedApiMocks(page);

      // When: 保護されたダッシュボードへ直接アクセス
      await page.goto('/dashboard');

      // Then: ホーム画面にリダイレクトされる
      await expectHomeScreen(page);
    } finally {
      // このテストのみ既定のpageフィクスチャを直接使うため、明示的にクリーンアップする。
      // 他のテストはcreateAuthenticatedPageが生成したcontextをfixture側で自動closeする。
      await cleanupTestState(page);
    }
  });

  test('無効JWT認証のとき、リロードで不正トークンの復元を試みると、未認証のまま', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 不正な形式（3パートでない）のトークンを保持している
    // setupAuthenticatedApiMocksを使い、万一トークンが正当と誤認された場合に
    // API側は成功応答となるようにして、クライアント側のJWT形式検証のみで
    // 未認証にとどまることを検証する
    const page = await createAuthenticatedPage({
      accessToken: 'invalid-token',
    });
    await setupAuthenticatedApiMocks(page);

    await page.goto('/dashboard');
    await expectHomeScreen(page);

    // When: ページをリロード
    await page.reload();

    // Then: 認証は復元されず、ログイン画面のまま
    await expectHomeScreen(page);
  });
});
