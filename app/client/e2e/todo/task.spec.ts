import { expect } from '@playwright/test';
import { test } from '../shared/helpers/auth-session';
import { buildMockTask, openDashboardWithTasks } from './helpers/task-setup';

test.describe('タスク作成・一覧 E2Eテスト', () => {
  test('新規タスクを作成すると、一覧に作成したタスクが表示される', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 認証済みユーザーがタスクなしのダッシュボードを表示している
    const page = await createAuthenticatedPage();
    await openDashboardWithTasks(page, { initialTasks: [] });

    // When: タイトルと優先度を入力してタスクを追加する
    await page.getByLabel('タスクのタイトル').fill('牛乳を買う');
    await page.getByLabel('優先度', { exact: true }).selectOption('high');
    await page.getByRole('button', { name: '追加' }).click();

    // Then: 作成したタスクが一覧に表示され、フォームがリセットされる
    await expect(
      page.getByRole('heading', { level: 3, name: '牛乳を買う' }),
    ).toBeVisible();
    await expect(page.getByLabel('タスクのタイトル')).toHaveValue('');
  });

  test('既存タスクがある状態でダッシュボードを開くと、一覧にAPIから取得したタスクが表示される', async ({
    createAuthenticatedPage,
  }) => {
    // Given: サーバー側に既存タスクが1件存在する
    const page = await createAuthenticatedPage();
    await openDashboardWithTasks(page, {
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
    // Given: タスク作成APIが失敗するダッシュボード
    const page = await createAuthenticatedPage();
    await openDashboardWithTasks(page, { initialTasks: [], failCreate: true });

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
