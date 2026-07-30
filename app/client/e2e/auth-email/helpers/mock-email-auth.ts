import type { Page } from '@playwright/test';

const MOCK_ACCESS_TOKEN =
  // nosemgrep: generic.secrets.security.detected-jwt-token.detected-jwt-token -- E2Eモック用の固定ダミートークンで実際の署名鍵は含まない
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlbWFpbC10ZXN0LXVzZXIifQ.mock_e2e_sig';

export interface MockSignInUser {
  id: string;
  email: string;
}

const DEFAULT_SIGN_IN_USER: MockSignInUser = {
  id: 'email-test-user-001',
  email: 'confirmed.user@example.com',
};

/**
 * Supabase の POST /auth/v1/token?grant_type=password をモックし、
 * サインイン成功レスポンスを返す。
 */
export async function mockSupabaseSignInSuccess(
  page: Page,
  user: MockSignInUser = DEFAULT_SIGN_IN_USER,
): Promise<void> {
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: MOCK_ACCESS_TOKEN,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'mock_refresh_token',
        user: {
          id: user.id,
          email: user.email,
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
      }),
    });
  });
}

/**
 * Supabase の POST /auth/v1/token?grant_type=password をモックし、
 * GoTrue のエラーレスポンス（error_code + msg）を返す。
 */
export async function mockSupabaseSignInError(
  page: Page,
  errorCode: string,
  message: string,
): Promise<void> {
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error_code: errorCode, msg: message }),
    });
  });
}

/**
 * バックエンドの POST /api/auth/verify（JIT プロビジョニング）をモックする。
 */
export async function mockVerifySession(
  page: Page,
  user: MockSignInUser = DEFAULT_SIGN_IN_USER,
): Promise<void> {
  await page.route('**/api/auth/verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          isNewUser: false,
          user: {
            id: user.id,
            email: user.email,
            name: 'Email Test User',
            externalId: user.id,
            provider: 'email',
            avatarUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          },
        },
      }),
    });
  });
}

/**
 * バックエンドの POST /api/auth/email/signup をモックし、
 * 確認メール送信成功（201）レスポンスを返す。
 */
export async function mockEmailSignupSuccess(page: Page): Promise<void> {
  await page.route('**/api/auth/email/signup', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { status: 'pending_confirmation' },
      }),
    });
  });
}

/**
 * バックエンドの POST /api/auth/email/signup をモックし、
 * 409 衝突エラー（Google 登録済み等）レスポンスを返す。
 */
export async function mockEmailSignupConflict(
  page: Page,
  code: 'EMAIL_ALREADY_REGISTERED_GOOGLE' | 'EMAIL_ALREADY_REGISTERED',
  message: string,
): Promise<void> {
  await page.route('**/api/auth/email/signup', async (route) => {
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { code, message } }),
    });
  });
}

/**
 * バックエンドの POST /api/auth/email/signup をモックし、
 * リクエストボディの email を正規化した値が期待値と一致する場合のみ
 * 409 衝突エラーを返す（フロントエンドが入力値をそのまま送信し、
 * 表記揺れの同一性判定をバックエンドに委譲していることを検証する）。
 */
export async function mockEmailSignupConflictForNormalizedEmail(
  page: Page,
  expectedNormalizedEmail: string,
  code: 'EMAIL_ALREADY_REGISTERED_GOOGLE' | 'EMAIL_ALREADY_REGISTERED',
  message: string,
): Promise<void> {
  await page.route('**/api/auth/email/signup', async (route) => {
    const { email } = route.request().postDataJSON() as { email: string };

    if (email.toLowerCase() !== expectedNormalizedEmail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'UNEXPECTED_TEST_EMAIL',
            message: `想定外のメールアドレスが送信されました: ${email}`,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { code, message } }),
    });
  });
}

/**
 * Supabase の POST /auth/v1/recover（パスワードリセットメール送信）をモックする。
 * SDKがredirectToをredirect_toクエリパラメータとして付与するため、
 * 末尾に**を付けてクエリ文字列付きURLにもマッチさせる。
 */
export async function mockPasswordResetRequestSuccess(
  page: Page,
): Promise<void> {
  await page.route('**/auth/v1/recover**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}
