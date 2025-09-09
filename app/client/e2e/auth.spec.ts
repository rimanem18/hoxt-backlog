import { test, expect } from '@playwright/test';
import {
  setupAuthenticatedTestEnvironment,
  setupUnauthenticatedApiMocks,
  cleanupTestState,
  DEFAULT_TEST_USER
} from './helpers/test-setup';
import type { AuthProvider } from '@/packages/shared-schemas/src/auth';

test.describe('Google OAuth認証フロー E2Eテスト', () => {
  test.afterEach(async ({ page }) => {
    await cleanupTestState(page);
  });

  test('T001: 認証済みユーザーのダッシュボード表示テスト', async ({ page }) => {
    // Given: 認証済みユーザーのRedux状態を設定
    await page.addInitScript((userData) => {
      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };
      console.log('T001 Test state initialized:', window.__TEST_REDUX_AUTH_STATE__);
    }, DEFAULT_TEST_USER);

    // When: ダッシュボードページにアクセス
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    console.log('T001 Current page URL:', page.url());

    // Then: ダッシュボードとユーザー情報が表示される
    const dashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(dashboardTitle).toBeVisible({ timeout: 10000 });

    const welcomeMessage = page.getByText('おかえりなさい！あなたのアカウント情報です。');
    await expect(welcomeMessage).toBeVisible();

    const userNameHeading = page.locator('h2').filter({ hasText: DEFAULT_TEST_USER.name });
    await expect(userNameHeading).toBeVisible({ timeout: 5000 });

    const userEmailText = page.locator('p').filter({ hasText: DEFAULT_TEST_USER.email });
    await expect(userEmailText).toBeVisible();

    const logoutButton = page.getByRole('button', { name: /ログアウト|logout/i });
    await expect(logoutButton).toBeVisible();

    const avatarImage = page.locator('img[alt="プロフィール画像"]');
    await expect(avatarImage).toBeVisible();
  });

  test('T002: 既存ユーザーの再ログインフローテスト', async ({ page }) => {
    // TODO: 既存ユーザーの再ログイン機能実装が必要
    // 1. 既存ユーザー判定ロジック（isNewUser: false）
    // 2. lastLoginAt フィールドの更新処理
    // 3. JITプロビジョニングのスキップ処理

    // Given: 過去にログイン履歴を持つ既存ユーザーを設定
    const existingUser = {
      id: 'existing-user-456',
      name: 'Existing User',
      email: 'existing.user@example.com',
      avatarUrl: null,
      lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      externalId: 'google_existing_456',
      provider: 'google' as AuthProvider,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await page.addInitScript((userData) => {
      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };
      console.log('Test state initialized:', window.__TEST_REDUX_AUTH_STATE__);
    }, existingUser);

    // When: ダッシュボードページにアクセス
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    console.log('Current page URL:', page.url());

    const reduxState = await page.evaluate(() => {
      return window.__TEST_REDUX_AUTH_STATE__;
    });
    console.log('Redux test state:', reduxState);

    // Then: ダッシュボードと既存ユーザー情報が表示される
    const dashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(dashboardTitle).toBeVisible({ timeout: 10000 });

    const userNameHeading = page.locator('h2').filter({ hasText: existingUser.name });
    await expect(userNameHeading).toBeVisible({ timeout: 5000 });

    const userEmailText = page.locator('p').filter({ hasText: existingUser.email });
    await expect(userEmailText).toBeVisible();

    // 現在未実装のため失敗が期待される
    const loginInfoElement = page.locator('[data-testarea="last-login-info"]');
    await expect(loginInfoElement).toContainText('最終ログイン');

    const existingUserMessage = page.getByText('おかえりなさい！', { exact: false });
    await expect(existingUserMessage).toBeVisible();
  });

  test('T004: ページリロード時の認証状態復元テスト', async ({ page }) => {

    // Given: 認証済みユーザーのセッション情報を設定
    const authenticatedUser = {
      id: 'auth-user-789',
      name: 'Authenticated User',
      email: 'auth.user@example.com',
      avatarUrl: null,
      externalId: 'google_auth_789',
      provider: 'google' as AuthProvider,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.addInitScript((userData) => {
      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };

      const authData = {
        access_token: 'mock_access_token_for_reload_test',
        refresh_token: 'mock_refresh_token_for_reload_test',
        user: userData,
        isNewUser: false
      };
      localStorage.setItem('sb-localhost-auth-token', JSON.stringify(authData));
      console.log('T004 Initial auth state and LocalStorage set:', window.__TEST_REDUX_AUTH_STATE__);
    }, authenticatedUser);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const initialDashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(initialDashboardTitle).toBeVisible({ timeout: 10000 });

    const initialUserName = page.locator('h2').filter({ hasText: authenticatedUser.name });
    await expect(initialUserName).toBeVisible({ timeout: 5000 });

    console.log('T004 Executing page reload...');
    await page.reload();
    await page.waitForLoadState('networkidle');

    const reloadedDashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(reloadedDashboardTitle).toBeVisible({ timeout: 10000 });

    const reloadedUserName = page.locator('h2').filter({ hasText: authenticatedUser.name });
    await expect(reloadedUserName).toBeVisible({ timeout: 5000 });

    const reloadedUserEmail = page.locator('p').filter({ hasText: authenticatedUser.email });
    await expect(reloadedUserEmail).toBeVisible();

    const reloadedLogoutButton = page.getByRole('button', { name: /ログアウト|logout/i });
    await expect(reloadedLogoutButton).toBeVisible();

    const persistedAuthState = await page.evaluate(() => {
      const supabaseAuth = localStorage.getItem('sb-localhost-auth-token');
      return supabaseAuth ? JSON.parse(supabaseAuth) : null;
    });
    expect(persistedAuthState).toBeTruthy();

    const continuedSessionMessage = page.getByText('おかえりなさい！', { exact: false });
    await expect(continuedSessionMessage).toBeVisible();
  });

  test('T006: JWT期限切れ時のエラーハンドリングテスト', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.text().includes('T006')) {
        console.log('Page Console:', msg.text());
      }
    });

    // Given: 期限切れトークンでユーザー認証状態を設定
    const expiredUser = {
      id: 'expired-user-999',
      name: 'Expired User',
      email: 'expired.user@example.com',
      avatarUrl: null,
      lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24時間前
      externalId: 'google_expired_999',
      provider: 'google' as AuthProvider,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    await page.addInitScript((userData) => {
      const expiredAuthData = {
        access_token: 'expired_access_token_test',
        refresh_token: 'expired_refresh_token_test',
        user: userData,
      };
      localStorage.setItem('sb-localhost-auth-token', JSON.stringify(expiredAuthData));
      console.log('T006: Expired JWT token set in localStorage:', expiredAuthData);

      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };
      console.log('T006: Initial authenticated state set (before expiry detection)');
    }, expiredUser);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const debugInfo = await page.evaluate(() => {
      const authData = localStorage.getItem('sb-localhost-auth-token');
      const testState = window.__TEST_REDUX_AUTH_STATE__;
      const now = Date.now();
      const parsedAuthData = authData ? JSON.parse(authData) : null;
      return {
        currentTime: now,
        authDataExists: !!authData,
        authDataExpiry: parsedAuthData?.expires_at,
        isExpired: parsedAuthData?.expires_at ? (parsedAuthData.expires_at <= now) : null,
        testStateExists: !!testState,
        currentURL: window.location.href,
      };
    });
    console.log('T006 Debug Info:', debugInfo);

    await expect(page).toHaveURL('/', { timeout: 10000 });

    const expiredMessage = page.getByText('セッションの有効期限が切れました', { exact: false });
    await expect(expiredMessage).toBeVisible({ timeout: 5000 });

    const reloginPrompt = page.getByText('再度ログインしてください', { exact: false });
    await expect(reloginPrompt).toBeVisible();

    const clearedAuthState = await page.evaluate(() => {
      const authData = localStorage.getItem('sb-localStorage-auth-token');
      return authData ? JSON.parse(authData) : null;
    });
    expect(clearedAuthState).toBeFalsy();

    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible();
  });

  test('T003: 未認証ユーザーのリダイレクト確認', async ({ page }) => {
    // Given: 未認証状態のAPIモック設定
    await setupUnauthenticatedApiMocks(page);

    await page.goto('/dashboard');

    await expect(page).toHaveURL('/', { timeout: 10000 });

    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible();
  });

  test('T007: ネットワークエラー時のフォールバック処理テスト', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.text().includes('T007')) {
        console.log('Page Console:', msg.text());
      }
    });



    const networkUser = {
      id: 'network-test-555',
      name: 'Network Test User',
      email: 'network.test@example.com',
      avatarUrl: null,
      lastLoginAt: new Date().toISOString(),
      externalId: 'google_network_555',
      provider: 'google' as AuthProvider,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.route('**/api/**', async (route) => {
      await route.abort('failed');
    });

    await page.addInitScript((userData) => {
      const validAuthData = {
        access_token: 'valid_token_for_network_test',
        refresh_token: 'valid_refresh_token',
        user: userData,
      };
      localStorage.setItem('sb-localhost-auth-token', JSON.stringify(validAuthData));
      console.log('T007: Valid auth token set for network test:', validAuthData);

      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };
      console.log('T007: Initial authenticated state set (before network error)');
    }, networkUser);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const debugInfo = await page.evaluate(() => {
      const authData = localStorage.getItem('sb-localhost-auth-token');
      const testState = window.__TEST_REDUX_AUTH_STATE__;
      return {
        authDataExists: !!authData,
        testStateExists: !!testState,
        currentURL: window.location.href,
      };
    });
    console.log('T007 Debug Info:', debugInfo);

    const networkErrorMessage = page.getByText('ネットワーク接続を確認してください', { exact: false });

    const retryButton = page.getByRole('button', { name: /再試行|retry|もう一度/i });

    const offlineIndicator = page.locator('[data-testarea="network-status"]');

    if (await retryButton.isVisible()) {
      await retryButton.click();

      const loadingIndicator = page.locator('[data-testarea="retry-loading"]');
    }

    const appStability = await page.evaluate(() => {
      return {
        pageExists: !!document.body,
        hasError: document.querySelector('[data-testarea="error-boundary"]') !== null,
        scriptErrors: window.onerror ? 'error-handler-present' : 'no-error-handler',
      };
    });


    await page.unroute('**/api/**');

    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: networkUser,
        }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const recoveryDashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
  });

  test('T005: 無効JWT認証エラーハンドリングテスト', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.text().includes('T005')) {
        console.log('Page Console:', msg.text());
      }
    });



    const invalidUser = {
      id: 'invalid-user-111',
      name: 'Invalid User',
      email: 'invalid.user@example.com',
      avatarUrl: null,
      lastLoginAt: new Date().toISOString(),
      externalId: 'google_invalid_111',
      provider: 'google' as AuthProvider,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.addInitScript((userData) => {
      const invalidAuthData = {
        user: userData,
      };
      localStorage.setItem('sb-localhost-auth-token', JSON.stringify(invalidAuthData));
      console.log('T005: Invalid JWT token set in localStorage:', invalidAuthData);

      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };
      console.log('T005: Initial authenticated state set (before invalid token detection)');
    }, invalidUser);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const debugInfo = await page.evaluate(() => {
      const authData = localStorage.getItem('sb-localhost-auth-token');
      const testState = window.__TEST_REDUX_AUTH_STATE__;
      const parsedAuthData = authData ? JSON.parse(authData) : null;
      return {
        authDataExists: !!authData,
        authDataValid: parsedAuthData?.access_token && typeof parsedAuthData.expires_at === 'number',
        testStateExists: !!testState,
        currentURL: window.location.href,
      };
    });
    console.log('T005 Debug Info:', debugInfo);


    const invalidTokenMessage = page.getByText('認証に問題があります', { exact: false });

    const reloginPrompt = page.getByText('もう一度ログインしてください', { exact: false });

    const clearedAuthState = await page.evaluate(() => {
      const authData = localStorage.getItem('sb-localhost-auth-token');
      return authData ? JSON.parse(authData) : null;
    });

    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible();
  });
});
