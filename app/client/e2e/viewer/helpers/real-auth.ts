import type { Browser, BrowserContext, Page } from '@playwright/test';
import type { AuthProvider } from '@hoxt-backlog/shared-schemas/auth';
import {
  buildMockAuthStorageState,
  setupAuthenticatedApiMocks,
  type TestUser,
} from '../../shared/helpers/auth-session';
import { setupRealBackendPassthrough } from './browser-passthrough';
import { SERVER_BASE_URL } from './constants';

export interface RealTestSession {
  accessToken: string;
  userId: string;
}

/**
 * project作成者としての疑似セッションを実バックエンドへ発行する。
 * テスト専用エンドポイント（`isTestEndpointsEnabled()`時のみ有効）を使う。
 */
export async function issueRealAuthSession(
  email: string,
  name?: string,
): Promise<RealTestSession> {
  const res = await fetch(`${SERVER_BASE_URL}/api/__test__/auth-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });

  if (!res.ok) {
    throw new Error(
      `E2E認証セッションの発行に失敗しました: ${res.status} ${await res.text()}`,
    );
  }

  const body = (await res.json()) as { data: RealTestSession };
  return body.data;
}

export interface OpenRealAuthenticatedPageResult {
  page: Page;
  context: BrowserContext;
  session: RealTestSession;
}

/**
 * 実バックエンドの疑似セッションで認証済みのページを開く。
 * AuthGuardのセッション確認（`/api/v1/*`）はモックし、project/viewer等の実際の
 * ドメインAPI呼び出しはpage.routeでserverコンテナへ中継する。
 */
export async function openRealAuthenticatedPage(
  browser: Browser,
  baseURL: string,
  options: { email: string; name?: string },
): Promise<OpenRealAuthenticatedPageResult> {
  const session = await issueRealAuthSession(options.email, options.name);

  const testUser: TestUser = {
    id: session.userId,
    name: options.name ?? 'E2E Test User',
    email: options.email,
    avatarUrl: null,
    externalId: session.userId,
    provider: 'email' as AuthProvider,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const storageState = buildMockAuthStorageState(baseURL, testUser, {
    accessToken: session.accessToken,
  });

  const context = await browser.newContext({ baseURL, storageState });
  const page = await context.newPage();
  await setupAuthenticatedApiMocks(page, testUser);
  await setupRealBackendPassthrough(page);

  return { page, context, session };
}
