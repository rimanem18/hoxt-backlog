import type { Page } from '@playwright/test';
import type { Task } from '@/packages/shared-schemas/src/tasks';
import { setupAuthenticatedApiMocks } from '../../shared/helpers/auth-session';
import { expectDashboard } from '../../shared/helpers/dashboard';

const DEFAULT_USER_ID = '22222222-2222-4222-8222-222222222222';

/**
 * テスト用タスクオブジェクトを生成するファクトリ関数。
 * overridesで個別フィールドを上書きできる。
 * idはコール毎に一意な値を生成する（複数タスク生成時のReact key重複を防止するため）。
 */
export function buildMockTask(overrides?: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    userId: DEFAULT_USER_ID,
    title: 'デフォルトタスク',
    description: null,
    priority: 'medium',
    status: 'not_started',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export interface SetupTaskApiMocksOptions {
  initialTasks?: Task[];
  failCreate?: boolean;
}

/**
 * `/api/tasks` への一覧取得・作成リクエストをインターセプトするモック。
 * 作成成功時はクロージャ内のタスク配列へ反映し、以降のGETに反映する。
 */
export async function setupTaskApiMocks(
  page: Page,
  options?: SetupTaskApiMocksOptions,
): Promise<void> {
  const tasks: Task[] = [...(options?.initialTasks ?? [])];

  await page.route('**/api/tasks*', async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: tasks }),
      });
      return;
    }

    if (method === 'POST') {
      if (options?.failCreate) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'タスク作成に失敗しました' },
          }),
        });
        return;
      }

      const requestBody = request.postDataJSON() as {
        title: string;
        priority: Task['priority'];
      };
      const newTask = buildMockTask({
        title: requestBody.title,
        priority: requestBody.priority,
      });
      tasks.push(newTask);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: newTask }),
      });
      return;
    }

    await route.continue();
  });
}

/**
 * 認証・タスクAPIモックを登録した上でダッシュボードを開き、表示完了を待つ。
 * 各テストのGiven部分（認証済みページ生成〜ダッシュボード表示待機）の重複を集約する。
 */
export async function openDashboardWithTasks(
  page: Page,
  options?: SetupTaskApiMocksOptions,
): Promise<void> {
  await setupAuthenticatedApiMocks(page);
  await setupTaskApiMocks(page, options);
  await page.goto('/dashboard');
  await expectDashboard(page);
}
