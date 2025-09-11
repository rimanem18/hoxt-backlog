/**
 * E2Eテスト用の安全なセットアップユーティリティ
 * 
 * セキュリティを重視したテスト環境設定とAPIモック管理を提供
 */

import type { Page } from '@playwright/test';
import type { AuthProvider } from '@/packages/shared-schemas/src/auth';

/**
 * テスト用ユーザーデータの型定義
 */
export interface TestUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  lastLoginAt?: string;
  /** 【Refactor追加】: User型との互換性のために必要なフィールド */
  externalId: string;
  provider: AuthProvider; // 正しいAuthProvider型を使用
  createdAt: string;
  updatedAt: string;
}

/**
 * デフォルトのテストユーザーデータ
 */
export const DEFAULT_TEST_USER: TestUser = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test.user@example.com',
  avatarUrl: null,
  lastLoginAt: new Date().toISOString(),
  /** 【Refactor追加】: User型互換性のための必須フィールド */
  externalId: 'google_123456789',
  provider: 'google' as AuthProvider, // 型安全なキャスト
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日前
  updatedAt: new Date().toISOString(),
};;;

/**
 * 認証済み状態のAPIモックを設定
 * 
 * @param page - Playwrightのページオブジェクト
 * @param user - テスト用ユーザーデータ
 */
export async function setupAuthenticatedApiMocks(
  page: Page, 
  user: TestUser = DEFAULT_TEST_USER
): Promise<void> {
  // ユーザー情報取得APIのモック
  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: user,
      }),
    });
  });

  // 認証状態確認APIのモック
  await page.route('**/api/v1/auth/verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          isAuthenticated: true,
          user,
        },
      }),
    });
  });
}

/**
 * 未認証状態のAPIモックを設定
 * 
 * @param page - Playwrightのページオブジェクト
 */
export async function setupUnauthenticatedApiMocks(page: Page): Promise<void> {
  // 認証状態確認APIのモック（未認証）
  await page.route('**/api/v1/auth/verify', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'Unauthorized',
      }),
    });
  });

  // ユーザー情報取得APIのモック（未認証）
  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'Unauthorized',
      }),
    });
  });
}

/**
 * Supabase認証トークンをLocalStorageに設定
 * 
 * @param page - Playwrightのページオブジェクト
 * @param user - テスト用ユーザーデータ
 */
export async function setMockAuthSession(
  page: Page,
  user: TestUser = DEFAULT_TEST_USER
): Promise<void> {
  // ページが読み込まれてからLocalStorageにアクセス
  await page.goto('/');
  
  await page.evaluate((userData) => {
    try {
      const mockSession = {
        access_token: 'mock_jwt_token_for_e2e_test',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: userData.id,
          email: userData.email,
          user_metadata: {
            name: userData.name,
          },
        },
      };

      // Supabaseが使用するLocalStorageキー
      localStorage.setItem(
        'sb-localhost-auth-token',
        JSON.stringify(mockSession)
      );
    } catch (error) {
      console.warn('LocalStorage設定に失敗:', error);
    }
  }, user);
}

/**
 * テスト状態をクリーンアップ
 * 
 * @param page - Playwrightのページオブジェクト
 */
export async function cleanupTestState(page: Page): Promise<void> {
  try {
    // モックルートをクリア
    await page.unrouteAll();
    
    // LocalStorageをクリア
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        console.warn('ストレージクリアに失敗:', error);
      }
    });
  } catch (error) {
    console.warn('テスト状態クリーンアップに失敗:', error);
  }
}

/**
 * Reduxストアに認証状態を直接設定
 * 
 * @param page - Playwrightのページオブジェクト
 * @param user - テスト用ユーザーデータ
 */
export async function setReduxAuthState(
  page: Page,
  user: TestUser = DEFAULT_TEST_USER
): Promise<void> {
  await page.evaluate((userData) => {
    try {
      // Reduxストアに認証成功アクションを直接ディスパッチ
      // グローバルウィンドウオブジェクトに一時的にストアを設定
      if (typeof window !== 'undefined') {
        // @ts-ignore - テスト専用のグローバル設定
        window.__TEST_REDUX_AUTH_STATE__ = {
          isAuthenticated: true,
          user: userData,
          isLoading: false,
          error: null,
        };
      }
    } catch (error) {
      console.warn('Redux状態設定に失敗:', error);
    }
  }, user);
}

/**
 * 認証済みユーザー用の完全なテスト環境セットアップ
 * 
 * @param page - Playwrightのページオブジェクト  
 * @param user - テスト用ユーザーデータ
 */
export async function setupAuthenticatedTestEnvironment(
  page: Page,
  user: TestUser = DEFAULT_TEST_USER
): Promise<void> {
  await setupAuthenticatedApiMocks(page, user);
  await setMockAuthSession(page, user);
  await setReduxAuthState(page, user);
}