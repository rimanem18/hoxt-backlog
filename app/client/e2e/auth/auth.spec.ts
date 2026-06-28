import { expect, test } from '@playwright/test';
import {
  DEFAULT_TEST_USER,
  cleanupTestState,
  getSupabaseStorageKey,
  setMockAuthSession,
  setupAuthenticatedApiMocks,
  setupUnauthenticatedApiMocks,
} from './helpers/test-setup';

test.describe('認証フロー E2Eテスト', () => {
  test.afterEach(async ({ page }) => {
    await cleanupTestState(page);
  });

  test('ログインすると、ダッシュボードに遷移する', async ({ page }) => {
    // ここにテストを記述
  });

  test('ログイン済のユーザーは、ダッシュボードへリダイレクトする', async ({ page }) => {
    // ここにテストを記述
  });

  test('ダッシュボードが表示されているときにページをリロードすると、認証状態が復元されてダッシュボードが引き続き表示される', async ({ page }) => {
    // ここにテストを記述
  });

  test('JWT期限切れ時、リロードしてもダッシュボードではなくホーム画面にとどまる', async ({ page }) => {
    // ここにテストを記述
  });

  test('未認証ユーザーが認証保護されたダッシュボードに直接アクセスしても、ホーム画面にリダイレクト', async ({ page }) => {
    // ここにテストを記述
  });

  test('無効JWT認証のとき、リロードで不正トークンの復元を試みると、未認証のまま', async ({ page }) => {
    // ここにテストを記述
  });
});
