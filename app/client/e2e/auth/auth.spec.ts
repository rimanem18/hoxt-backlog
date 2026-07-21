import { expect, type Page, test } from '@playwright/test';
import {
  cleanupTestState,
  setMockAuthSession,
  setupAuthenticatedApiMocks,
  setupUnauthenticatedApiMocks,
} from './helpers/test-setup';

async function expectHomeScreen(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'アカウントでログイン' }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL('/');
}

async function expectDashboard(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'ダッシュボード' }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('認証フロー E2Eテスト', () => {
  test.afterEach(async ({ page }) => {
    await cleanupTestState(page);
  });

  test('ログイン済のユーザーは、ダッシュボードへリダイレクトする', async ({
    page,
  }) => {
    // Given: 有効なセッションを保持しているユーザー
    await setMockAuthSession(page);
    await setupAuthenticatedApiMocks(page);

    // When: ホーム画面にアクセス
    await page.goto('/');

    // Then: 自動的にダッシュボードへリダイレクトされる
    await expectDashboard(page);
  });

  test('ダッシュボードが表示されているときにページをリロードすると、認証状態が復元されてダッシュボードが引き続き表示される', async ({
    page,
  }) => {
    // Given: 有効なセッションを保持しダッシュボードを表示中
    await setMockAuthSession(page);
    await setupAuthenticatedApiMocks(page);
    await page.goto('/dashboard');
    await expectDashboard(page);

    // When: ページをリロード
    await page.reload();

    // Then: 認証状態が復元され、引き続きダッシュボードが表示される
    await expectDashboard(page);
  });

  test('JWT期限切れ時、リロードしてもダッシュボードではなくホーム画面にとどまる', async ({
    page,
  }) => {
    // Given: 期限切れのセッションを保持している
    await setMockAuthSession(page, undefined, {
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
    // Given: 未認証状態（セッションなし）
    await setupUnauthenticatedApiMocks(page);

    // When: 保護されたダッシュボードへ直接アクセス
    await page.goto('/dashboard');

    // Then: ホーム画面にリダイレクトされる
    await expectHomeScreen(page);
  });

  test('無効JWT認証のとき、リロードで不正トークンの復元を試みると、未認証のまま', async ({
    page,
  }) => {
    // Given: 不正な形式（3パートでない）のトークンを保持している
    // setupAuthenticatedApiMocksを使い、万一トークンが正当と誤認された場合に
    // API側は成功応答となるようにして、クライアント側のJWT形式検証のみで
    // 未認証にとどまることを検証する
    await setMockAuthSession(page, undefined, {
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
