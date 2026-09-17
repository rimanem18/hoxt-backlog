import { expect } from '@playwright/test';
import { test } from '../shared/helpers/auth-session';
import { buildMockProject } from '../todo/helpers/task-setup';
import {
  expectClientSideNavigation,
  getRecentProjectsLink,
  openProjectsPage,
} from './helpers/project-setup';

test.describe('最近のプロジェクト導線 E2Eテスト', () => {
  test('最近のプロジェクトからクリックすると、フルリロードなしでプロジェクト詳細へ遷移する', async ({
    createAuthenticatedPage,
  }) => {
    // Given: ダッシュボードに最近のプロジェクトが1件表示されている
    const page = await createAuthenticatedPage();
    const project = buildMockProject({ name: '最近のプロジェクトA' });
    await openProjectsPage(page, { initialProjects: [project] });

    // When: 最近のプロジェクトのリンクをクリックする
    // Then: フルページ遷移が発生せずプロジェクト詳細画面へ遷移する
    await expectClientSideNavigation(
      page,
      getRecentProjectsLink(page, '最近のプロジェクトA'),
      /\/dashboard\/projects\/.+/,
    );

    // Then: プロジェクト詳細画面が表示される
    await expect(
      page.getByRole('heading', { level: 1, name: '最近のプロジェクトA' }),
    ).toBeVisible();
  });
});
