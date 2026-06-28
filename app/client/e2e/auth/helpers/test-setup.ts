import type { Page } from '@playwright/test';
import type { AuthProvider } from '@/packages/shared-schemas/src/auth';

export interface TestUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  lastLoginAt?: string;
  externalId: string;
  provider: AuthProvider;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_TEST_USER: TestUser = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test.user@example.com',
  avatarUrl: null,
  lastLoginAt: new Date().toISOString(),
  externalId: 'google_123456789',
  provider: 'google' as AuthProvider,
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function setupAuthenticatedApiMocks(
  page: Page,
  user: TestUser = DEFAULT_TEST_USER,
): Promise<void> {
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

export async function setupUnauthenticatedApiMocks(page: Page): Promise<void> {
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
 * storageState API での認証セッション設定に移行予定。
 * addInitScript でナビゲーション前に localStorage をセットする。
 */
export async function setMockAuthSession(
  page: Page,
  user: TestUser = DEFAULT_TEST_USER,
): Promise<void> {
  const storageKey = getSupabaseStorageKey();
  const session = {
    access_token:
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.mock_e2e_sig',
    refresh_token: 'mock_refresh_token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      externalId: user.externalId,
      provider: user.provider,
      avatarUrl: user.avatarUrl ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      user_metadata: {
        name: user.name,
        avatar_url: user.avatarUrl ?? undefined,
      },
    },
  };

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: storageKey, value: JSON.stringify(session) },
  );
}

export async function cleanupTestState(page: Page): Promise<void> {
  try {
    await page.unrouteAll();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    // クリーンアップ失敗は無視（テスト間の独立性を保つため）
  }
}

/**
 * Supabase LocalStorage キーを生成する。
 * 実装コードの authValidation.ts と同じロジックでキーを導出する。
 */
export function getSupabaseStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) return 'sb-localhost-auth-token';

  const projectRef = url.match(
    /https:\/\/(.+?)\.(?:supabase\.(?:co|net)|[^/]+)/,
  )?.[1];

  return projectRef ? `sb-${projectRef}-auth-token` : 'sb-localhost-auth-token';
}
