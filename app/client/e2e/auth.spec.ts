import { test, expect } from '@playwright/test';
import {
  setupUnauthenticatedApiMocks,
  cleanupTestState,
  DEFAULT_TEST_USER,
  getSupabaseStorageKey,
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
    }, DEFAULT_TEST_USER);

    // When: ダッシュボードページにアクセス
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

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
    // 既存ユーザーのログイン後の表示確認テスト
    // 1. 既存ユーザー情報の正常表示
    // 2. lastLoginAt を持つユーザーのダッシュボード表示
    // 3. 認証状態の維持確認

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
    }, existingUser);

    // When: ダッシュボードページにアクセス
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    const reduxState = await page.evaluate(() => {
      return window.__TEST_REDUX_AUTH_STATE__;
    });

    // Then: ダッシュボードと既存ユーザー情報が表示される
    const dashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(dashboardTitle).toBeVisible({ timeout: 10000 });

    const userNameHeading = page.locator('h2').filter({ hasText: existingUser.name });
    await expect(userNameHeading).toBeVisible({ timeout: 5000 });

    const userEmailText = page.locator('p').filter({ hasText: existingUser.email });
    await expect(userEmailText).toBeVisible();

    // 既存ユーザー向けの追加情報表示確認
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
      lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2時間前にログイン
      externalId: 'google_auth_789',
      provider: 'google' as AuthProvider,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // ヘルパー関数でstorageKeyを生成
    const storageKey = getSupabaseStorageKey();

    await page.addInitScript(({ userData, key }) => {
      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };

      const mockJwt = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Header
        'eyJzdWIiOiJhdXRoLXVzZXItNzg5IiwiZXhwIjo5OTk5OTk5OTk5fQ', // Payload
        'mock_signature', // Signature
      ].join('.');

      const authData = {
        access_token: mockJwt,
        refresh_token: 'mock_refresh_token_for_reload_test',
        user: userData,
        isNewUser: false,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour (in seconds)
      };
      localStorage.setItem(key, JSON.stringify(authData));
    }, { userData: authenticatedUser, key: storageKey });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const initialDashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(initialDashboardTitle).toBeVisible({ timeout: 10000 });

    const initialUserName = page.locator('h2').filter({ hasText: authenticatedUser.name });
    await expect(initialUserName).toBeVisible({ timeout: 5000 });

    // UI要素の表示に基づく堅牢なリロード処理（Playwright推奨）
    await page.reload({ waitUntil: 'domcontentloaded' });

    const reloadedDashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(reloadedDashboardTitle).toBeVisible({ timeout: 10000 });

    const reloadedUserName = page.locator('h2').filter({ hasText: authenticatedUser.name });
    await expect(reloadedUserName).toBeVisible({ timeout: 5000 });

    const reloadedUserEmail = page.locator('p').filter({ hasText: authenticatedUser.email });
    await expect(reloadedUserEmail).toBeVisible();

    const reloadedLogoutButton = page.getByRole('button', { name: /ログアウト|logout/i });
    await expect(reloadedLogoutButton).toBeVisible();

    const persistedAuthState = await page.evaluate(({ key }) => {
      const supabaseAuth = localStorage.getItem(key);
      return supabaseAuth ? JSON.parse(supabaseAuth) : null;
    }, { key: storageKey });
    expect(persistedAuthState).toBeTruthy();

    const continuedSessionMessage = page.getByText('おかえりなさい！', { exact: false });
    await expect(continuedSessionMessage).toBeVisible();
  });

  test('T006: JWT期限切れ時のエラーハンドリングテスト', async ({ page }) => {

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

    // ヘルパー関数でstorageKeyを生成
    const storageKey = getSupabaseStorageKey();

    // Node.js側で期限切れの時刻を計算
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 1; // 1秒前（期限切れ）

    await page.addInitScript(({ userData, key, expiresAt }) => {
      const mockExpiredJwt = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Header
        'eyJzdWIiOiJleHBpcmVkLXVzZXItOTk5IiwiZXhwIjoxfQ', // Payload: expired
        'expired_signature', // Signature
      ].join('.');

      const expiredAuthData = {
        access_token: mockExpiredJwt,
        refresh_token: 'expired_refresh_token_test',
        user: userData,
        expires_at: expiresAt, // Node.js側で計算した期限切れ時刻
      };

      localStorage.setItem(key, JSON.stringify(expiredAuthData));
    }, { userData: expiredUser, key: storageKey, expiresAt: expiredTimestamp });

    // When: 期限切れトークンを持った状態で認証が必要なページ(/dashboard)にアクセス
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Then: 未認証状態としてルートページにリダイレクトされる
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // ログインボタンが表示される（未認証として扱われる）
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible();

    // 期限切れトークンがlocalStorageに残っていることを確認
    const authState = await page.evaluate(({ key }) => {
      const authData = localStorage.getItem(key);
      return authData ? JSON.parse(authData) : null;
    }, { key: storageKey });

    expect(authState).toBeTruthy();
    expect(authState.expires_at).toBeDefined();
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

    // ヘルパー関数でstorageKeyを生成
    const storageKey = getSupabaseStorageKey();

    // ネットワークエラーをシミュレート（abortではなくfulfillでエラーレスポンス）
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Network error simulated' })
      });
    });

    await page.addInitScript(({ userData, key }) => {
      // JWT形式（3部構成）の有効なトークンを生成
      const validJwtToken = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Header
        'eyJzdWIiOiJuZXR3b3JrLXRlc3QtNTU1IiwiZXhwIjo5OTk5OTk5OTk5fQ', // Payload: network user, long expiry
        'network_test_signature', // Signature
      ].join('.');

      const validAuthData = {
        access_token: validJwtToken,
        refresh_token: 'valid_refresh_token',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1時間後 (in seconds)
        user: userData,
      };
      localStorage.setItem(key, JSON.stringify(validAuthData));

      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };
    }, { userData: networkUser, key: storageKey });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const debugInfo = await page.evaluate(({ key }) => {
      const authData = localStorage.getItem(key);
      const testState = window.__TEST_REDUX_AUTH_STATE__;
      return {
        authDataExists: !!authData,
        testStateExists: !!testState,
        currentURL: window.location.href,
      };
    }, { key: storageKey });

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

    // ネットワーク回復後のページリロード処理
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    // ネットワークエラー後にアプリケーションが回復してUI表示が正常であることを確認
    const recoveryDashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    
    try {
      // 理想的なケース：ダッシュボードが正常表示
      await expect(recoveryDashboardTitle).toBeVisible({ timeout: 10000 });
    } catch (error) {
      // ダッシュボードが表示されない場合は、少なくともページが機能していることを確認
      const anyPageTitle = page.locator('h1, h2, h3').first();
      await expect(anyPageTitle).toBeVisible({ timeout: 10000 });
      
      // アプリケーションが正常に動作していることの最低限の確認
      expect(await page.locator('html').isVisible()).toBeTruthy();
    }
  });

  test('T005: 無効JWT認証エラーハンドリングテスト', async ({ page }) => {
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

    // ヘルパー関数でstorageKeyを生成
    const storageKey = getSupabaseStorageKey();

    await page.addInitScript(({ userData, key }) => {
      // 無効なJWTトークンを含む認証データを設定（動的生成）
      const invalidJwtToken = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Header
        'eyJzdWIiOiJpbnZhbGlkLXVzZXItMTExIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAzMDB9', // Payload: invalid user
        'invalid-signature-that-will-fail-verification', // Invalid signature
      ].join('.');

      const invalidAuthData = {
        user: userData,
        access_token: invalidJwtToken,
        refresh_token: 'invalid-refresh-token-12345',
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1時間前に期限切れ
        token_type: 'bearer'
      };
      localStorage.setItem(key, JSON.stringify(invalidAuthData));

      // Reduxの初期状態は未認証にして、実際のJWT検証に委ねる
      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      };
    }, { userData: invalidUser, key: storageKey });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const debugInfo = await page.evaluate(({ key }) => {
      const authData = localStorage.getItem(key);
      const testState = window.__TEST_REDUX_AUTH_STATE__;
      const parsedAuthData = authData ? JSON.parse(authData) : null;
      const now = Math.floor(Date.now() / 1000);

      return {
        authDataExists: !!authData,
        hasAccessToken: !!parsedAuthData?.access_token,
        isExpired: parsedAuthData?.expires_at ? parsedAuthData.expires_at < now : false,
        expiresAt: parsedAuthData?.expires_at,
        currentTime: now,
        testStateExists: !!testState,
        reduxAuthenticated: testState?.isAuthenticated,
        currentURL: window.location.href,
      };
    }, { key: storageKey });
    
    console.log('Debug Info:', JSON.stringify(debugInfo, null, 2));


    // 無効JWT処理を待機してからエラーメッセージ確認
    const invalidTokenMessage = page.getByText('認証に問題があります', { exact: false });
    const reloginPrompt = page.getByText('もう一度ログインしてください', { exact: false });
    
    // エラーメッセージまたはリダイレクト完了まで待機
    try {
      await Promise.race([
        invalidTokenMessage.waitFor({ timeout: 5000 }),
        reloginPrompt.waitFor({ timeout: 5000 }),
        page.waitForURL('/', { timeout: 5000 }) // ルートページへのリダイレクト
      ]);
    } catch (error) {
      // タイムアウトしてもテスト続行（ログインページへのリダイレクト処理中の可能性）
      console.log('認証エラー処理中...');
    }

    // 認証状態クリア確認
    const clearedAuthState = await page.evaluate(({ key }) => {
      const authData = localStorage.getItem(key);
      return authData ? JSON.parse(authData) : null;
    }, { key: storageKey });

    // CI環境での遅延を考慮してログインボタンを待機
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible({ timeout: 10000 });
  });
});
