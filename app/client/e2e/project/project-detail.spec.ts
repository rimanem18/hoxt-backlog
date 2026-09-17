import { expect } from '@playwright/test';
import { test } from '../shared/helpers/auth-session';
import { buildMockProject, DEFAULT_PROJECT_ID } from '../todo/helpers/task-setup';
import {
  getRecentProjectsLink,
  openProjectDetailPage,
  OTHER_USER_PROJECT_ID,
} from './helpers/project-setup';

test.describe('プロジェクト詳細・編集 E2Eテスト', () => {
  test('詳細画面でプロジェクト名を編集して保存すると、見出しが更新後の名称になる', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 編集前プロジェクトの詳細画面を表示している
    const page = await createAuthenticatedPage();
    await openProjectDetailPage(page, DEFAULT_PROJECT_ID, {
      initialProjects: [buildMockProject({ name: '編集前プロジェクト' })],
    });

    // When: 編集モーダルを開き、プロジェクト名を変更して保存する
    await page.getByRole('button', { name: '編集' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('プロジェクト名').fill('編集後プロジェクト');
    await dialog.getByRole('button', { name: '保存' }).click();

    // Then: モーダルが閉じ、詳細画面の見出しが更新後の名称になる
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole('heading', { level: 1, name: '編集後プロジェクト' }),
    ).toBeVisible();
  });

  test('詳細画面からタスクを追加すると、プロジェクト選択なしでタスク一覧に表示される', async ({
    createAuthenticatedPage,
  }) => {
    // Given: プロジェクト詳細画面を表示している（配下タスクは0件）
    const page = await createAuthenticatedPage();
    await openProjectDetailPage(page, DEFAULT_PROJECT_ID, {
      initialProjects: [buildMockProject()],
      initialTasks: [],
    });

    // When: プロジェクト選択を行わずタスクを追加する
    await page
      .getByLabel('タスクのタイトル')
      .fill('詳細画面から追加したタスク');
    await page.getByRole('button', { name: '追加' }).click();

    // Then: プロジェクト選択セレクトは存在せず、タスクが一覧に表示される
    await expect(page.getByLabel('プロジェクト')).toHaveCount(0);
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: '詳細画面から追加したタスク',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'プロジェクトを選択してください' }),
    ).toHaveCount(0);
  });

  test('他ユーザーのプロジェクトを開くと、見つからない旨のみが表示されタスク一覧のエラーは表示されない', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 自分のプロジェクト一覧には含まれないIDが存在する
    const page = await createAuthenticatedPage();

    // When: そのIDの詳細画面を開く
    await openProjectDetailPage(page, OTHER_USER_PROJECT_ID, {
      initialProjects: [],
    });

    // Then: 「プロジェクトが見つかりません」のみが表示され、タスク一覧のエラーは表示されない
    await expect(page.getByText('プロジェクトが見つかりません')).toBeVisible();
    await expect(page.getByText('エラーが発生しました')).toHaveCount(0);
  });

  test('別プロジェクトへ遷移すると絞り込み条件がリセットされる', async ({
    createAuthenticatedPage,
  }) => {
    // Given: プロジェクトA詳細画面で優先度フィルタを「高」に設定している
    const page = await createAuthenticatedPage();
    const projectB = buildMockProject({
      id: '55555555-5555-4555-8555-555555555555',
      name: 'プロジェクトB',
    });
    await openProjectDetailPage(page, DEFAULT_PROJECT_ID, {
      initialProjects: [buildMockProject({ name: 'プロジェクトA' }), projectB],
    });
    await page.getByLabel('優先度フィルタ').selectOption('high');
    await expect(page.getByLabel('優先度フィルタ')).toHaveValue('high');

    // When: サイドバーの「最近のプロジェクト」からプロジェクトBへ遷移する
    await getRecentProjectsLink(page, 'プロジェクトB').click();

    // Then: プロジェクトB詳細画面に遷移し、優先度フィルタが初期状態に戻る
    await expect(
      page.getByRole('heading', { level: 1, name: 'プロジェクトB' }),
    ).toBeVisible();
    await expect(page.getByLabel('優先度フィルタ')).toHaveValue('all');
  });
});
