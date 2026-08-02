import type { Page } from '@playwright/test';
import type {
  ChangeTaskStatusBody,
  Task,
  UpdateTaskBody,
} from '@/packages/shared-schemas/src/tasks';
import { setupAuthenticatedApiMocks } from '../../shared/helpers/auth-session';
import { expectDashboard } from '../../shared/helpers/dashboard';

const DEFAULT_USER_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID_PATH = /^\/api\/tasks\/([^/]+)(?:\/status)?$/;

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
    projectId: null,
    ...overrides,
  };
}

export interface SetupTaskApiMocksOptions {
  initialTasks?: Task[];
  failCreate?: boolean;
  failUpdate?: boolean;
}

function notFoundResponse() {
  return {
    status: 404 as const,
    contentType: 'application/json',
    body: JSON.stringify({
      success: false,
      error: { message: 'タスクが見つかりません' },
    }),
  };
}

/**
 * `/api/tasks` への一覧取得・作成・更新・削除・ステータス変更リクエストをインターセプトするモック。
 * 変更成功時はクロージャ内のタスク配列へ反映し、以降のGETに反映する。
 */
export async function setupTaskApiMocks(
  page: Page,
  options?: SetupTaskApiMocksOptions,
): Promise<void> {
  const tasks: Task[] = [...(options?.initialTasks ?? [])];

  await page.route('**/api/tasks**', async (route) => {
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

    const idMatch = new URL(request.url()).pathname.match(TASK_ID_PATH);
    if (!idMatch) {
      await route.continue();
      return;
    }

    const taskId = idMatch[1];
    const taskIndex = tasks.findIndex((t) => t.id === taskId);

    if (method === 'PUT') {
      if (options?.failUpdate) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'タスク更新に失敗しました' },
          }),
        });
        return;
      }

      if (taskIndex === -1) {
        await route.fulfill(notFoundResponse());
        return;
      }

      const requestBody = request.postDataJSON() as Partial<UpdateTaskBody>;
      const updatedTask: Task = {
        ...tasks[taskIndex],
        ...requestBody,
        updatedAt: new Date().toISOString(),
      };
      tasks[taskIndex] = updatedTask;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: updatedTask }),
      });
      return;
    }

    if (method === 'DELETE') {
      if (taskIndex === -1) {
        await route.fulfill(notFoundResponse());
        return;
      }
      tasks.splice(taskIndex, 1);

      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'PATCH') {
      if (taskIndex === -1) {
        await route.fulfill(notFoundResponse());
        return;
      }

      const requestBody = request.postDataJSON() as ChangeTaskStatusBody;
      const updatedTask: Task = {
        ...tasks[taskIndex],
        status: requestBody.status,
        updatedAt: new Date().toISOString(),
      };
      tasks[taskIndex] = updatedTask;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: updatedTask }),
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
