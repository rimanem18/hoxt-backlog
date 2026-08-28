import { expect, test } from '@playwright/test';
import { openRealProjectDetailPage } from './helpers/navigation';
import { createProject, inviteViewer } from './helpers/real-backend-client';
import { openRealAuthenticatedPage } from './helpers/real-auth';

test.describe('viewer招待の取り消し〜再招待による復元 E2Eテスト', () => {
  test('特定projectへの招待を取り消すと、そのprojectのみ閲覧不可になり他projectは維持される。取り消し済みへの再招待で復元する', async ({
    browser,
    baseURL,
  }) => {
    // Given: あるメールアドレスがproject A, Bに招待されている
    const ownerEmail = `owner-${crypto.randomUUID()}@example.com`;
    const { page, context, session } = await openRealAuthenticatedPage(
      browser,
      baseURL ?? '',
      { email: ownerEmail },
    );
    const projectA = await createProject(session.accessToken, {
      name: `E2E取り消しテストA ${crypto.randomUUID()}`,
    });
    const projectB = await createProject(session.accessToken, {
      name: `E2E取り消しテストB ${crypto.randomUUID()}`,
    });
    const viewerEmail = `viewer-${crypto.randomUUID()}@example.com`;
    await inviteViewer(session.accessToken, projectA.id, viewerEmail);
    await inviteViewer(session.accessToken, projectB.id, viewerEmail);

    // When: project作成者がprojectAへの招待のみを取り消す（AC-08）
    await openRealProjectDetailPage(page, projectA.id);
    await expect(page.getByText(viewerEmail)).toBeVisible({ timeout: 15000 });
    await page
      .getByRole('button', { name: `${viewerEmail}への招待を取り消す` })
      .click();
    await page.getByRole('button', { name: '取り消す' }).click();

    // Then: projectAの招待済み一覧からそのメールアドレスが消える
    await expect(page.getByText(viewerEmail)).toHaveCount(0, {
      timeout: 15000,
    });

    // Then: projectBの招待は取り消しの影響を受けず維持される
    await openRealProjectDetailPage(page, projectB.id);
    await expect(page.getByText(viewerEmail)).toBeVisible({ timeout: 15000 });

    // When: 取り消し済みの組み合わせ（projectA×同じemail）へ再招待する（AC-13）
    await openRealProjectDetailPage(page, projectA.id);
    await page.getByLabel('招待するメールアドレス').fill(viewerEmail);
    await page.getByRole('button', { name: '招待する' }).click();

    // Then: 取り消し前の招待関係が復活し、通常の招待として一覧に表示される
    await expect(page.getByText(viewerEmail)).toBeVisible({ timeout: 15000 });

    await context.close();
  });
});
