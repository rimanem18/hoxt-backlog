import { expect, type Page } from '@playwright/test';
import { test } from '../shared/helpers/auth-session';
import { buildMockTask, openDashboardWithTasks } from './helpers/task-setup';

/**
 * 編集モーダルを開いてタイトルを入力する。
 * `fill`直後の値反映を待つことで、コントロール入力の状態更新前に
 * 保存/キャンセルボタンを押してしまう競合を防ぐ。
 */
async function openTaskEditModalAndFillTitle(
  page: Page,
  title: string,
): Promise<void> {
  await page.getByRole('button', { name: 'タスクを編集' }).click();
  const titleInput = page.getByLabel('タイトル', { exact: true });
  await titleInput.fill(title);
  await expect(titleInput).toHaveValue(title);
}

test.describe('タスク編集・削除・ステータス変更 E2Eテスト', () => {
  test('編集を保存すると一覧のタイトルが更新されモーダルが閉じる', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 既存タスクが1件表示されている
    const page = await createAuthenticatedPage();
    await openDashboardWithTasks(page, {
      initialTasks: [buildMockTask({ title: '編集前タスク' })],
    });

    // When: 編集モーダルでタイトルを変更して保存する
    await openTaskEditModalAndFillTitle(page, '編集後タスク');
    await page.getByRole('button', { name: '保存' }).click();

    // Then: 一覧のタイトルが更新され、モーダルが閉じる
    await expect(
      page.getByRole('heading', { level: 3, name: '編集後タスク' }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('タイトルを空にして保存するとバリデーションエラーが表示される', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 既存タスクが1件表示されている
    const page = await createAuthenticatedPage();
    await openDashboardWithTasks(page, {
      initialTasks: [buildMockTask({ title: '既存タスク' })],
    });

    // When: タイトルを空にして保存する
    await openTaskEditModalAndFillTitle(page, '');
    await page.getByRole('button', { name: '保存' }).click();

    // Then: バリデーションエラーが表示され、モーダルは開いたまま
    await expect(
      page.getByRole('alert').filter({ hasText: 'タイトルを入力してください' }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('編集APIが失敗するとエラーメッセージが表示されモーダルが開いたまま', async ({
    createAuthenticatedPage,
  }) => {
    // Given: タスク更新APIが失敗するダッシュボード
    const page = await createAuthenticatedPage();
    await openDashboardWithTasks(page, {
      initialTasks: [buildMockTask({ title: '更新に失敗するタスク' })],
      failUpdate: true,
    });

    // When: タイトルを変更して保存する
    await openTaskEditModalAndFillTitle(page, '更新後タイトル');
    await page.getByRole('button', { name: '保存' }).click();

    // Then: エラーメッセージが表示され、モーダルは開いたまま
    await expect(
      page.getByRole('alert').filter({ hasText: 'タスク更新に失敗しました' }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('キャンセルすると変更が破棄されモーダルが閉じる', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 既存タスクが1件表示されている
    const page = await createAuthenticatedPage();
    await openDashboardWithTasks(page, {
      initialTasks: [buildMockTask({ title: '変更しないタスク' })],
    });

    // When: タイトルを変更した後、キャンセルする
    await openTaskEditModalAndFillTitle(page, '変更後タイトル');
    await page.getByRole('button', { name: 'キャンセル' }).click();

    // Then: モーダルが閉じ、一覧のタイトルは変更されない
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(
      page.getByRole('heading', { level: 3, name: '変更しないタスク' }),
    ).toBeVisible();
  });

  test('タスクを削除すると一覧から消える', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 既存タスクが1件表示されている
    const page = await createAuthenticatedPage();
    await openDashboardWithTasks(page, {
      initialTasks: [buildMockTask({ title: '消えるタスク' })],
    });

    // When: 削除ボタンをクリックする
    await page.getByRole('button', { name: 'タスクを削除' }).click();

    // Then: 一覧からタスクが消える
    await expect(
      page.getByRole('heading', { level: 3, name: '消えるタスク' }),
    ).toBeHidden();
    await expect(page.getByText('タスクがありません')).toBeVisible();
  });

  test('ステータスを変更するとバッジと選択値が更新される', async ({
    createAuthenticatedPage,
  }) => {
    // Given: 未着手ステータスのタスクが1件表示されている
    const page = await createAuthenticatedPage();
    await openDashboardWithTasks(page, {
      initialTasks: [
        buildMockTask({ title: '進行させるタスク', status: 'not_started' }),
      ],
    });

    // When: ステータスを進行中に変更する
    await page.getByLabel('ステータスを変更').selectOption('in_progress');

    // Then: 選択値とバッジ表示が進行中に更新される
    await expect(page.getByLabel('ステータスを変更')).toHaveValue(
      'in_progress',
    );
    // select/optionの候補文言と区別するため、バッジ要素(span)のみに絞り込む
    await expect(
      page.locator('span').filter({ hasText: /^進行中$/ }),
    ).toBeVisible();
  });
});
