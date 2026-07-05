import { expect, test } from '@playwright/test';
import { cleanupTestState } from '../auth/helpers/test-setup';
import {
  mockEmailSignupConflict,
  mockEmailSignupConflictForNormalizedEmail,
  mockEmailSignupSuccess,
} from './helpers/mock-email-auth';

const GOOGLE_CONFLICT_MESSAGE =
  'このメールアドレスは Google アカウントで登録済みです。' +
  'Google ログインのままご利用いただけます。' +
  'パスワードでのログインを追加したい場合は、' +
  'Google でログインのうえ設定画面から設定できます。';

test.describe('メールパスワード認証 E2Eテスト - サインアップ衝突', () => {
  test.afterEach(async ({ page }) => {
    await cleanupTestState(page);
  });

  test('Google 認証済みメールアドレスでサインアップすると、Google 案内メッセージが表示される', async ({
    page,
  }) => {
    // Given: Google 登録済みメールアドレスとの衝突を返すモック
    await mockEmailSignupConflict(
      page,
      'EMAIL_ALREADY_REGISTERED_GOOGLE',
      GOOGLE_CONFLICT_MESSAGE,
    );

    // When: Google 認証済みメールアドレスでサインアップを試行
    await page.goto('/signup');
    await page.getByLabel('メールアドレス').fill('google.user@example.com');
    await page.getByLabel('パスワード').fill('Passw0rd!');
    await page.getByRole('button', { name: 'アカウントを作成' }).click();

    // Then: REQ-302 の案内文が表示される（AC-05）
    await expect(
      page.getByRole('alert').filter({ hasText: 'Google' }),
    ).toHaveText(GOOGLE_CONFLICT_MESSAGE);
  });

  test('メール表記揺れ（大文字小文字違い）でも同一ユーザーとして衝突案内が表示される', async ({
    page,
  }) => {
    // Given: 送信された email を正規化した値が一致する場合のみ衝突を返すモック
    // （フロントエンドが入力値を加工せずに送信することを検証する）
    await mockEmailSignupConflictForNormalizedEmail(
      page,
      'user@example.com',
      'EMAIL_ALREADY_REGISTERED_GOOGLE',
      GOOGLE_CONFLICT_MESSAGE,
    );

    // When: 大文字小文字を混在させたメールアドレスでサインアップを試行
    await page.goto('/signup');
    await page.getByLabel('メールアドレス').fill('User@EXAMPLE.com');
    await page.getByLabel('パスワード').fill('Passw0rd!');
    await page.getByRole('button', { name: 'アカウントを作成' }).click();

    // Then: 表記揺れでも同一ユーザーとして衝突案内が表示される（AC-05 境界値）
    await expect(
      page.getByRole('alert').filter({ hasText: 'Google' }),
    ).toHaveText(GOOGLE_CONFLICT_MESSAGE);
  });

  test('メール形式が不正な場合、バリデーションエラーが表示される', async ({
    page,
  }) => {
    // Given: サインアップ成功モック（呼ばれないことを確認するため設置）
    await mockEmailSignupSuccess(page);

    // When: メール形式不正な値でサインアップを試行
    await page.goto('/signup');
    await page.getByLabel('メールアドレス').fill('not-an-email');
    await page.getByLabel('パスワード').fill('Passw0rd!');
    await page.getByRole('button', { name: 'アカウントを作成' }).click();

    // Then: 形式不正である旨のバリデーションエラーが表示される（REQ-304）
    await expect(
      page.getByRole('alert').filter({ hasText: 'メールアドレスの形式' }),
    ).toHaveText('メールアドレスの形式が正しくありません');
  });
});
