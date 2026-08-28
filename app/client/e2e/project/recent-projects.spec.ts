import { expect } from '@playwright/test';
import { test } from '../shared/helpers/auth-session';
import { buildMockProject, openDashboardWithTasks } from '../todo/helpers/task-setup';
import { setupProjectCrudApiMocks } from './helpers/project-setup';

test.describe('最近のプロジェクト導線 E2Eテスト', () => {
  test('ダッシュボードの最近のプロジェクトからプロジェクト詳細へ遷移する', async ({
    createAuthenticatedPage,
  }) => {
    // Given: ダッシュボードに最近のプロジェクトが1件表示されている
    const page = await createAuthenticatedPage();
    const project = buildMockProject({ name: '最近のプロジェクトA' });
    await openDashboardWithTasks(page, {
      initialTasks: [],
      projects: [project],
    });
    // NOTE: openDashboardWithTasksが内部登録する一覧専用モック（GETのみ応答）では
    // 遷移先の詳細取得(GET /api/projects/{id})に応答できないため、後から登録した
    // ハンドラを優先するPlaywrightの仕様を利用してこのモックで上書きする
    await setupProjectCrudApiMocks(page, { initialProjects: [project] });

    // When: 最近のプロジェクトのリンクをクリックする
    await page.getByRole('link', { name: '最近のプロジェクトA' }).click();

    // Then: プロジェクト詳細画面へ遷移する
    await expect(page).toHaveURL(/\/dashboard\/projects\/.+/);
    await expect(
      page.getByRole('heading', { level: 1, name: '最近のプロジェクトA' }),
    ).toBeVisible();
  });
});
