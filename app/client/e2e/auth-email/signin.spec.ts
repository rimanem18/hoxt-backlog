import { expect, test } from '@playwright/test';
import {
  cleanupTestState,
  setupAuthenticatedApiMocks,
} from '../shared/helpers/auth-session';
import { expectDashboard } from '../shared/helpers/dashboard';
import {
  mockSupabaseSignInError,
  mockSupabaseSignInSuccess,
  mockVerifySession,
} from './helpers/mock-email-auth';

test.describe('メールパスワード認証 E2Eテスト - サインイン', () => {
  test.afterEach(async ({ page }) => {
    await cleanupTestState(page);
  });

  test('確認済みアカウントでサインインすると、ダッシュボードに遷移する', async ({
    page,
  }) => {
    // Given: 確認済みアカウントでのサインインが成功するモック
    await mockSupabaseSignInSuccess(page);
    await mockVerifySession(page);
    await setupAuthenticatedApiMocks(page);

    // When: ログイン画面からメールアドレスとパスワードを入力してサインイン
    await page.goto('/');
    await page.getByLabel('メールアドレス').fill('confirmed.user@example.com');
    await page.getByLabel('パスワード').fill('Passw0rd!');
    await page.getByRole('button', { name: 'サインイン' }).click();

    // Then: ダッシュボードに遷移し、コンテンツが表示される
    await expectDashboard(page);
  });

  test('誤ったパスワードでサインインすると、原因を区別しないエラーメッセージが表示される', async ({
    page,
  }) => {
    // Given: 資格情報不一致（invalid_grant）を返すモック
    await mockSupabaseSignInError(
      page,
      'invalid_grant',
      'Invalid login credentials',
    );

    // When: 誤ったパスワードでサインインを試行
    await page.goto('/');
    await page.getByLabel('メールアドレス').fill('confirmed.user@example.com');
    await page.getByLabel('パスワード').fill('WrongPassword1!');
    await page.getByRole('button', { name: 'サインイン' }).click();

    // Then: 原因を区別しない汎用エラーメッセージが表示される（NFR-101）
    await expect(
      page.getByRole('alert').filter({ hasText: 'メールアドレス' }),
    ).toHaveText('メールアドレスまたはパスワードが間違っています');
  });

  test('存在しないメールアドレスでサインインすると、パスワード不一致時と同一のエラーメッセージが表示される', async ({
    page,
  }) => {
    // Given: ユーザー不存在時も invalid_grant を返すモック（列挙攻撃対策）
    await mockSupabaseSignInError(
      page,
      'invalid_grant',
      'Invalid login credentials',
    );

    // When: 存在しないメールアドレスでサインインを試行
    await page.goto('/');
    await page.getByLabel('メールアドレス').fill('unknown.user@example.com');
    await page.getByLabel('パスワード').fill('Passw0rd!');
    await page.getByRole('button', { name: 'サインイン' }).click();

    // Then: パスワード不一致時と同一のエラーメッセージが表示される（REQ-301）
    await expect(
      page.getByRole('alert').filter({ hasText: 'メールアドレス' }),
    ).toHaveText('メールアドレスまたはパスワードが間違っています');
  });

  test('未確認アカウントでサインインすると、メールアドレス確認要求メッセージが表示される', async ({
    page,
  }) => {
    // Given: 未確認アカウント（email_not_confirmed）を返すモック
    await mockSupabaseSignInError(
      page,
      'email_not_confirmed',
      'Email not confirmed',
    );

    // When: 未確認アカウントでサインインを試行
    await page.goto('/');
    await page.getByLabel('メールアドレス').fill('unconfirmed.user@example.com');
    await page.getByLabel('パスワード').fill('Passw0rd!');
    await page.getByRole('button', { name: 'サインイン' }).click();

    // Then: メールアドレス確認が必要である旨のメッセージが表示される（REQ-303）
    await expect(
      page.getByRole('alert').filter({ hasText: 'メールアドレスの確認' }),
    ).toContainText('メールアドレスの確認が必要です');
  });
});
