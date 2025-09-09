import { test, expect } from '@playwright/test';
import { 
  cleanupTestState 
} from './helpers/test-setup';

test.describe('T008: Google OAuth認証失敗エラー表示 E2Eテスト', () => {
  test.afterEach(async ({ page }) => {
    // 各テスト実行後のクリーンアップでシステムを元の状態に戻す
    await cleanupTestState(page);
  });

  test('Google OAuth認証キャンセル時の適切なエラーメッセージ表示', async ({ page }) => {
    // Given: ユーザーがGoogle OAuth認証ポップアップでキャンセルを選択した状況
    // When: 認証キャンセルエラーが発生
    // Then: ユーザーフレンドリーなメッセージが表示され、再試行可能な状態が維持される

    // コンソールログを収集してデバッグに活用

    // Given: Google OAuth認証キャンセル状況をシミュレートするための設定

    // When: OAuth認証失敗ハンドラーでキャンセルエラーを処理

    // テスト用のクエリパラメータでOAuth認証キャンセルをシミュレート
    await page.goto('/?test_oauth_error=cancelled');
    await page.waitForLoadState('networkidle');

    // ログインボタンの存在確認
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible({ timeout: 10000 });

    // ログインボタンをクリックしてOAuth認証を開始
    await loginButton.click();

    // ポップアップイベントまたはエラーメッセージのいずれか先に発生する方を待機
    await Promise.race([
      page.waitForEvent('popup', { timeout: 2000 }).catch(() => null),
      page.waitForSelector('[data-testarea="auth-message"]', { timeout: 3000 }).catch(() => null),
    ]);

    // Then: キャンセル処理が適切に行われ、ユーザーに優しいUXが提供されることを確認

    // OAuth認証キャンセルメッセージの確認
    const cancelMessage = page.getByText('Googleログインがキャンセルされました', { exact: false });
    await expect(cancelMessage).toBeVisible({ timeout: 5000 });

    // エラー扱いではなく情報扱いであることを確認
    const messageContainer = page.locator('[data-testarea="auth-message"]');
    await expect(messageContainer).toHaveAttribute('data-error-type', 'cancelled');
    await expect(messageContainer).toHaveAttribute('data-error-severity', 'info');

    // ログイン画面に留まっていることを確認
    await expect(page.url()).toMatch(/^http:\/\/.*:\d+\/(\?.*)?$/);

    // 再試行が可能であることを確認
    const retryLoginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(retryLoginButton).toBeVisible();

    // エラーメッセージが表示されていないことを確認
    const errorMessage = page.locator('[data-testarea="error-message"]');
    await expect(errorMessage).not.toBeVisible();
  });

  test('Google OAuth接続エラー時の適切なエラー表示とリトライ機能', async ({ page }) => {
    // Given: Google OAuthサービスへの接続失敗状況をシミュレート

    // When: OAuth接続エラーが発生
    await page.goto('/?test_oauth_error=connection');
    await page.waitForLoadState('networkidle');

    // ログインボタンの存在確認
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible({ timeout: 10000 });

    await loginButton.click();

    await Promise.race([
      page.waitForEvent('popup', { timeout: 2000 }).catch(() => null),
      page.waitForSelector('[data-testarea="auth-error"]', { timeout: 3000 }).catch(() => null),
    ]);

    // Then: 接続エラーが適切に処理され、再試行機能が提供される
    const connectionErrorMessage = page.getByText('Googleとの接続に問題が発生しました', { exact: false });
    await expect(connectionErrorMessage).toBeVisible({ timeout: 10000 });

    const networkCheckMessage = page.getByText('ネットワーク接続を確認してください', { exact: false });
    await expect(networkCheckMessage).toBeVisible({ timeout: 5000 });

    const retryButton = page.getByRole('button', { name: /再試行|retry|もう一度/i });
    await expect(retryButton).toBeVisible({ timeout: 5000 });

    const errorContainer = page.locator('[data-testarea="auth-error"]');
    await expect(errorContainer).toHaveAttribute('data-error-type', 'connection');
    await expect(errorContainer).toHaveAttribute('data-error-severity', 'error');
    await expect(errorContainer).toHaveAttribute('role', 'alert');

    // 再試行ボタンクリック機能確認
    if (await retryButton.isVisible()) {
      await retryButton.click();

      const loadingIndicator = page.locator('[data-testarea="auth-loading"]');
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    }
  });

  test('Google OAuth設定エラー時の開発者向けエラーメッセージ', async ({ page }) => {
    // Given: Google OAuth設定不備をシミュレート

    // When: OAuth設定エラーが発生
    await page.goto('/?test_oauth_error=config');
    await page.waitForLoadState('networkidle');

    // ログインボタンの存在確認
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible({ timeout: 10000 });

    await loginButton.click();

    await Promise.race([
      page.waitForEvent('popup', { timeout: 2000 }).catch(() => null),
      page.waitForSelector('[data-testarea="config-error"]', { timeout: 3000 }).catch(() => null),
    ]);

    // Then: 設定エラーが検出され、開発者向けガイダンスが提供される
    const configErrorMessage = page.getByText('Google OAuth設定に問題があります', { exact: false });
    await expect(configErrorMessage).toBeVisible({ timeout: 10000 });


    // 設定修正まではリトライできないことを確認
    const retryButton = page.getByRole('button', { name: /再試行|retry/i });
    await expect(retryButton).not.toBeVisible();

    const configErrorContainer = page.locator('[data-testarea="config-error"]');
    await expect(configErrorContainer).toHaveAttribute('data-error-type', 'config');
    await expect(configErrorContainer).toHaveAttribute('data-error-severity', 'warning');
    await expect(configErrorContainer).toHaveAttribute('role', 'alert');
  });
});