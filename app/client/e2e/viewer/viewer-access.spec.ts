import { type Browser, expect, test } from '@playwright/test';
import { setupRealBackendPassthrough } from './helpers/browser-passthrough';
import {
  extractTokenFromAccessUrl,
  getLatestInvitation,
  issueViewerAccessToken,
} from './helpers/mail-capture';
import {
  createProject,
  createTask,
  inviteViewer,
  revokeViewer,
} from './helpers/real-backend-client';
import { openRealAuthenticatedPage } from './helpers/real-auth';

async function openViewerPage(
  browser: Browser,
  baseURL: string | undefined,
  token: string,
) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await setupRealBackendPassthrough(page);
  await page.goto(`/viewer/${token}`);
  return { page, context };
}

test.describe('viewerトークンアクセスによる横断閲覧 E2Eテスト', () => {
  test('複数projectのtaskがprojectごとにグルーピングされ、必要な項目とともに表示される', async ({
    browser,
    baseURL,
  }) => {
    // Given: viewerが2つのprojectに招待されており、それぞれにtaskが存在する（AC-09）
    const ownerEmail = `owner-${crypto.randomUUID()}@example.com`;
    const { session, context: ownerContext } = await openRealAuthenticatedPage(
      browser,
      baseURL ?? '',
      { email: ownerEmail },
    );
    const projectAlpha = await createProject(session.accessToken, {
      name: `E2E横断閲覧テストAlpha ${crypto.randomUUID()}`,
    });
    const projectBeta = await createProject(session.accessToken, {
      name: `E2E横断閲覧テストBeta ${crypto.randomUUID()}`,
    });
    await createTask(session.accessToken, {
      title: 'Alphaのタスク',
      description: 'Alphaのタスクの説明',
      priority: 'high',
      projectId: projectAlpha.id,
    });
    await createTask(session.accessToken, {
      title: 'Betaのタスク',
      description: 'Betaのタスクの説明',
      priority: 'low',
      projectId: projectBeta.id,
    });

    const viewerEmail = `viewer-${crypto.randomUUID()}@example.com`;
    await inviteViewer(session.accessToken, projectAlpha.id, viewerEmail);
    await inviteViewer(session.accessToken, projectBeta.id, viewerEmail);
    const invitation = await getLatestInvitation(viewerEmail);
    const rawToken = extractTokenFromAccessUrl(invitation.accessUrl);

    // When: viewerがアクセストークン付きリンクにアクセスする
    const { page: viewerPage, context: viewerContext } = await openViewerPage(
      browser,
      baseURL,
      rawToken,
    );

    // Then: ログインなしで、両方のprojectがグルーピングされ、taskの内容が表示される
    await expect(
      viewerPage.getByRole('heading', { name: projectAlpha.name }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      viewerPage.getByRole('heading', { name: projectBeta.name }),
    ).toBeVisible();
    await expect(
      viewerPage.getByRole('heading', { name: 'Alphaのタスク' }),
    ).toBeVisible();
    await expect(viewerPage.getByText('Alphaのタスクの説明')).toBeVisible();
    await expect(
      viewerPage.getByRole('heading', { name: 'Betaのタスク' }),
    ).toBeVisible();
    await expect(viewerPage.getByText('Betaのタスクの説明')).toBeVisible();
    await expect(viewerPage.getByText('未着手')).toHaveCount(2);

    await ownerContext.close();
    await viewerContext.close();
  });
});

test.describe('viewerトークンアクセスの異常系・境界値 E2Eテスト', () => {
  test('存在しないトークンでアクセスするとエラー表示になり、再発行導線は表示されない', async ({
    browser,
    baseURL,
  }) => {
    // Given & When: 存在しないトークンでアクセスする（AC-10の一部）
    const { page, context } = await openViewerPage(
      browser,
      baseURL,
      'nonexistent-token-0000000000000000000000000000000000000000000000000000',
    );

    // Then: アクセスが拒否され、エラーが表示される。再発行を促す導線はない（REQ-306）
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('link', { name: /再発行/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /再発行/ }),
    ).toHaveCount(0);

    await context.close();
  });

  test('招待が全て取り消された状態でアクセスすると、エラーにならず空状態が表示される', async ({
    browser,
    baseURL,
  }) => {
    // Given: viewerが有効なアクセストークンを持っているが、招待されているprojectがすべて取り消されている（AC-11）
    const ownerEmail = `owner-${crypto.randomUUID()}@example.com`;
    const { session, context: ownerContext } = await openRealAuthenticatedPage(
      browser,
      baseURL ?? '',
      { email: ownerEmail },
    );
    const project = await createProject(session.accessToken, {
      name: `E2E空状態テスト ${crypto.randomUUID()}`,
    });
    const viewerEmail = `viewer-${crypto.randomUUID()}@example.com`;
    const invited = await inviteViewer(
      session.accessToken,
      project.id,
      viewerEmail,
    );
    const viewerId = invited.data?.id;
    if (!viewerId) {
      throw new Error('前提となる招待の作成に失敗しました');
    }
    await revokeViewer(session.accessToken, project.id, viewerId);
    const invitation = await getLatestInvitation(viewerEmail);
    const rawToken = extractTokenFromAccessUrl(invitation.accessUrl);

    // When: 有効なトークンでアクセスする
    const { page, context } = await openViewerPage(browser, baseURL, rawToken);

    // Then: アクセス自体は拒否されず、空状態が表示される
    await expect(page.getByText('閲覧できるprojectがありません')).toBeVisible(
      { timeout: 15000 },
    );

    await ownerContext.close();
    await context.close();
  });

  test('発行から30日を超えた期限切れトークンでアクセスが拒否される', async ({
    browser,
    baseURL,
  }) => {
    // Given: 30日を超えて期限切れのアクセストークンが用意されている（AC-10の境界値）
    const viewerEmail = `viewer-${crypto.randomUUID()}@example.com`;
    const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rawToken = await issueViewerAccessToken(viewerEmail, expiredAt);

    // When: 期限切れトークンでアクセスする
    const { page, context } = await openViewerPage(browser, baseURL, rawToken);

    // Then: アクセスが拒否される
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });

    await context.close();
  });
});
