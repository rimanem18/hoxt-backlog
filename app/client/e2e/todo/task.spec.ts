import { expect } from '@playwright/test';
import { test } from '../shared/helpers/auth-session';
import { openProjectDetailPage } from '../project/helpers/project-setup';
import { buildMockProject, buildMockTask, DEFAULT_PROJECT_ID } from './helpers/task-setup';

test.describe('タスク作成・一覧 E2Eテスト', () => {
  test('新規タスクを作成すると、一覧に作成したタスクが表示される', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 認証済みユーザーがタスクなしのプロジェクト詳細画面を表示している
    const page = await createAuthenticatedPage();
    await openProjectDetailPage(page, DEFAULT_PROJECT_ID, {
      initialProjects: [buildMockProject()],
      initialTasks: [],
    });

    // When: タイトル・優先度を入力してタスクを追加する
    await page.getByLabel('タスクのタイトル').fill('牛乳を買う');
    await page.getByLabel('優先度', { exact: true }).selectOption('high');
    await page.getByRole('button', { name: '追加' }).click();

    // Then: 作成したタスクが一覧に表示され、フォームがリセットされる
    await expect(
      page.getByRole('heading', { level: 3, name: '牛乳を買う' }),
    ).toBeVisible();
    await expect(page.getByLabel('タスクのタイトル')).toHaveValue('');
  });

  test('既存タスクがある状態でプロジェクト詳細を開くと、一覧にAPIから取得したタスクが表示される', async ({
    createAuthenticatedPage,
  }) => {
    // Given: サーバー側に既存タスクが1件存在する
    const page = await createAuthenticatedPage();

    // When: そのプロジェクトの詳細画面を開く
    await openProjectDetailPage(page, DEFAULT_PROJECT_ID, {
      initialProjects: [buildMockProject()],
      initialTasks: [buildMockTask({ title: '既存タスクA', priority: 'medium' })],
    });

    // Then: 既存タスクが一覧に表示される
    await expect(
      page.getByRole('heading', { level: 3, name: '既存タスクA' }),
    ).toBeVisible();
  });

  test('タスク作成に失敗すると、エラーメッセージと再試行ボタンが表示される', async ({
    createAuthenticatedPage,
  }) => {
    // Given: タスク作成APIが失敗するプロジェクト詳細画面
    const page = await createAuthenticatedPage();
    await openProjectDetailPage(page, DEFAULT_PROJECT_ID, {
      initialProjects: [buildMockProject()],
      initialTasks: [],
      failCreate: true,
    });

    // When: タイトルを入力してタスクを追加する
    await page.getByLabel('タスクのタイトル').fill('失敗するタスク');
    await page.getByRole('button', { name: '追加' }).click();

    // Then: エラーメッセージと再試行ボタンが表示される
    await expect(
      page.getByRole('alert').filter({ hasText: 'タスク作成に失敗しました' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '再試行' })).toBeVisible();
  });
});
