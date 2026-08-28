import { expect, test } from '@playwright/test';
import { extractTokenFromAccessUrl, getLatestInvitation } from './helpers/mail-capture';
import { openRealProjectDetailPage } from './helpers/navigation';
import {
  createProject,
  inviteViewer,
  listViewers,
  revokeViewer,
} from './helpers/real-backend-client';
import { openRealAuthenticatedPage } from './helpers/real-auth';

test.describe('viewer招待〜メール送信〜一覧確認 E2Eテスト', () => {
  test('新規メールアドレスへの招待が成功し、招待済み一覧と送信メールに反映される', async ({
    browser,
    baseURL,
  }) => {
    // Given: project作成者が自分のprojectを1件持っている
    const ownerEmail = `owner-${crypto.randomUUID()}@example.com`;
    const { page, context, session } = await openRealAuthenticatedPage(
      browser,
      baseURL ?? '',
      { email: ownerEmail },
    );
    const project = await createProject(session.accessToken, {
      name: `E2E招待テスト ${crypto.randomUUID()}`,
    });

    // When: project詳細画面から新規メールアドレスへviewer招待を実行する
    const viewerEmail = `viewer-${crypto.randomUUID()}@example.com`;
    await openRealProjectDetailPage(page, project.id);
    await page.getByLabel('招待するメールアドレス').fill(viewerEmail);
    await page.getByRole('button', { name: '招待する' }).click();

    // Then: 招待済み閲覧者一覧に反映される（AC-01, AC-07）
    await expect(page.getByText(viewerEmail)).toBeVisible({
      timeout: 15000,
    });

    // Then: 招待メールが送信され、アクセスURLに生トークンが含まれる
    const invitation = await getLatestInvitation(viewerEmail);
    expect(invitation.projectName).toBe(project.name);
    const rawToken = extractTokenFromAccessUrl(invitation.accessUrl);
    expect(rawToken.length).toBeGreaterThan(0);

    await context.close();
  });
});

test.describe('viewer招待の異常系 E2Eテスト', () => {
  test('自分自身のメールアドレスへの招待が拒否される', async ({
    browser,
    baseURL,
  }) => {
    // Given: project作成者が自分のprojectを1件持っている
    const ownerEmail = `owner-${crypto.randomUUID()}@example.com`;
    const { page, context, session } = await openRealAuthenticatedPage(
      browser,
      baseURL ?? '',
      { email: ownerEmail },
    );
    const project = await createProject(session.accessToken, {
      name: `E2E自己招待テスト ${crypto.randomUUID()}`,
    });

    // When: 自分自身のメールアドレスをviewer招待しようとする（AC-04）
    await openRealProjectDetailPage(page, project.id);
    await page.getByLabel('招待するメールアドレス').fill(ownerEmail);
    await page.getByRole('button', { name: '招待する' }).click();

    // Then: 招待は成立せず、エラーが表示される
    await expect(
      page.getByRole('alert').filter({ hasText: /.+/ }),
    ).toBeVisible({ timeout: 15000 });
    const viewers = await listViewers(session.accessToken, project.id);
    expect(viewers).toHaveLength(0);

    await context.close();
  });

  test('無効な形式のメールアドレスでの招待が拒否される', async ({
    browser,
    baseURL,
  }) => {
    // Given: project作成者が自分のprojectを1件持っている
    const ownerEmail = `owner-${crypto.randomUUID()}@example.com`;
    const { page, context, session } = await openRealAuthenticatedPage(
      browser,
      baseURL ?? '',
      { email: ownerEmail },
    );
    const project = await createProject(session.accessToken, {
      name: `E2E不正メール形式テスト ${crypto.randomUUID()}`,
    });

    // When: 無効な形式の文字列をメールアドレスとして招待を実行する（AC-06）
    await openRealProjectDetailPage(page, project.id);
    await page.getByLabel('招待するメールアドレス').fill('not-an-email');
    await page.getByRole('button', { name: '招待する' }).click();

    // Then: 招待は成立せず、エラーが表示される
    await expect(
      page.getByRole('alert').filter({ hasText: /.+/ }),
    ).toBeVisible({ timeout: 15000 });
    const viewers = await listViewers(session.accessToken, project.id);
    expect(viewers).toHaveLength(0);

    await context.close();
  });

  test('他ユーザーのprojectへの招待・一覧確認・取り消しがいずれも拒否される', async ({
    browser,
    baseURL,
  }) => {
    // Given: ユーザーAとユーザーBがそれぞれ自分のprojectを作成済みである
    const ownerAEmail = `owner-a-${crypto.randomUUID()}@example.com`;
    const ownerBEmail = `owner-b-${crypto.randomUUID()}@example.com`;
    const sessionA = await openRealAuthenticatedPage(browser, baseURL ?? '', {
      email: ownerAEmail,
    });
    const sessionB = await openRealAuthenticatedPage(browser, baseURL ?? '', {
      email: ownerBEmail,
    });
    const projectB = await createProject(sessionB.session.accessToken, {
      name: `E2E他ユーザーprojectテスト ${crypto.randomUUID()}`,
    });
    const invitedByOwnerB = await inviteViewer(
      sessionB.session.accessToken,
      projectB.id,
      `viewer-${crypto.randomUUID()}@example.com`,
    );
    const viewerId = invitedByOwnerB.data?.id;
    if (!viewerId) {
      throw new Error('前提となる招待の作成に失敗しました');
    }

    // When & Then: ユーザーAがユーザーBのprojectを開こうとすると見つからない（AC-12）
    await openRealProjectDetailPage(sessionA.page, projectB.id);
    await expect(
      sessionA.page.getByText('プロジェクトが見つかりません'),
    ).toBeVisible();

    // When & Then: ユーザーAがユーザーBのprojectへ直接APIで操作しても拒否される
    const inviteResult = await inviteViewer(
      sessionA.session.accessToken,
      projectB.id,
      'someone@example.com',
    );
    expect(inviteResult.status).toBe(404);

    await expect(
      listViewers(sessionA.session.accessToken, projectB.id),
    ).rejects.toThrow();

    const revokeResult = await revokeViewer(
      sessionA.session.accessToken,
      projectB.id,
      viewerId,
    );
    expect(revokeResult.status).toBe(404);

    await sessionA.context.close();
    await sessionB.context.close();
  });
});
