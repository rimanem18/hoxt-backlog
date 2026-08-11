import { expect } from '@playwright/test';
import { test } from '../shared/helpers/auth-session';
import { buildMockProject, DEFAULT_PROJECT_ID } from '../todo/helpers/task-setup';
import {
  getProjectListLink,
  openProjectsPage,
} from './helpers/project-setup';

test.describe('プロジェクト作成・一覧 E2Eテスト', () => {
  test('新規プロジェクトを作成すると、一覧に作成したプロジェクトが表示される', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 認証済みユーザーがプロジェクトなしの一覧画面を表示している
    const page = await createAuthenticatedPage();
    await openProjectsPage(page, { initialProjects: [] });

    // When: プロジェクト名・説明文を入力して作成する
    await page.getByLabel('プロジェクト名').fill('新規プロジェクトA');
    await page.getByLabel('説明文').fill('説明テキスト');
    await page.getByRole('button', { name: '作成' }).click();

    // Then: 作成したプロジェクトが一覧に表示され、フォームがリセットされる
    await expect(
      page.getByRole('heading', { level: 3, name: '新規プロジェクトA' }),
    ).toBeVisible();
    await expect(page.getByText('説明テキスト')).toBeVisible();
    await expect(page.getByLabel('プロジェクト名')).toHaveValue('');
  });

  test('プロジェクト一覧の項目をクリックすると、プロジェクト詳細画面へ遷移する', async ({
    createAuthenticatedPage,
  }) => {
    // Given: サーバー側に既存プロジェクトが1件存在する
    const page = await createAuthenticatedPage();
    await openProjectsPage(page, {
      initialProjects: [buildMockProject({ name: '既存プロジェクトX' })],
    });

    // When: プロジェクト一覧内のプロジェクト名リンクをクリックする
    await getProjectListLink(page, '既存プロジェクトX').click();

    // Then: プロジェクト詳細画面へ遷移し、詳細情報とタスク一覧が表示される
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/projects/${DEFAULT_PROJECT_ID}$`),
    );
    await expect(
      page.getByRole('heading', { level: 1, name: '既存プロジェクトX' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'タスク一覧' }),
    ).toBeVisible();
  });
});
