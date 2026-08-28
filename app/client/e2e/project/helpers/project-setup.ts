import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from '@hoxt-backlog/shared-schemas/projects';
import { setupAuthenticatedApiMocks } from '../../shared/helpers/auth-session';
import type { SetupTaskApiMocksOptions } from '../../todo/helpers/task-setup';
import { buildMockProject, setupTaskApiMocks } from '../../todo/helpers/task-setup';

/** 自分のプロジェクト一覧に含まれない、他ユーザー所有プロジェクトのID */
export const OTHER_USER_PROJECT_ID = '44444444-4444-4444-8444-444444444444';

const PROJECT_ID_PATH = /^\/api\/projects\/([^/]+)$/;

function projectNotFoundResponse() {
  return {
    status: 404 as const,
    contentType: 'application/json',
    body: JSON.stringify({
      success: false,
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'プロジェクトが見つかりません',
      },
    }),
  };
}

export interface SetupProjectCrudApiMocksOptions {
  initialProjects?: Project[];
}

/**
 * `/api/projects` への一覧取得・詳細取得・作成・更新リクエストをインターセプトするモック。
 * 変更成功時はクロージャ内のプロジェクト配列へ反映し、以降のGETに反映する。
 */
export async function setupProjectCrudApiMocks(
  page: Page,
  options?: SetupProjectCrudApiMocksOptions,
): Promise<void> {
  const projects: Project[] = [...(options?.initialProjects ?? [])];

  await page.route('**/api/projects**', async (route) => {
    const request = route.request();
    const method = request.method();
    const idMatch = new URL(request.url()).pathname.match(PROJECT_ID_PATH);

    if (method === 'GET' && !idMatch) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: projects }),
      });
      return;
    }

    if (method === 'GET' && idMatch) {
      const project = projects.find((p) => p.id === idMatch[1]);
      if (!project) {
        await route.fulfill(projectNotFoundResponse());
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: project }),
      });
      return;
    }

    if (method === 'POST') {
      const requestBody = request.postDataJSON() as CreateProjectInput;
      const newProject = buildMockProject({
        id: crypto.randomUUID(),
        name: requestBody.name,
        description: requestBody.description ?? null,
      });
      projects.push(newProject);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: newProject }),
      });
      return;
    }

    if (method === 'PUT' && idMatch) {
      const projectIndex = projects.findIndex((p) => p.id === idMatch[1]);
      if (projectIndex === -1) {
        await route.fulfill(projectNotFoundResponse());
        return;
      }

      const requestBody = request.postDataJSON() as Partial<UpdateProjectInput>;
      const updatedProject: Project = {
        ...projects[projectIndex],
        ...requestBody,
        updatedAt: new Date().toISOString(),
      };
      projects[projectIndex] = updatedProject;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: updatedProject }),
      });
      return;
    }

    await route.continue();
  });
}

export interface OpenProjectsPageOptions {
  initialProjects?: Project[];
}

/**
 * 認証・プロジェクトAPIモックを登録した上でプロジェクト一覧画面を開き、表示完了を待つ。
 * 各テストのGiven部分（認証済みページ生成〜一覧画面表示待機）の重複を集約する。
 * 一覧項目のリンクは通常のaタグでフルページ遷移するため、遷移先の詳細画面が
 * 発行するタスクAPIも未モックのまま実ネットワークへ漏れないようここで登録しておく。
 */
export async function openProjectsPage(
  page: Page,
  options?: OpenProjectsPageOptions,
): Promise<void> {
  await setupAuthenticatedApiMocks(page);
  await setupProjectCrudApiMocks(page, {
    initialProjects: options?.initialProjects,
  });
  await setupTaskApiMocks(page, { initialTasks: [] });
  await page.goto('/dashboard/projects');
  await expect(
    page.getByRole('heading', { level: 1, name: 'プロジェクト' }),
  ).toBeVisible({ timeout: 15000 });
}

/**
 * プロジェクト一覧内のプロジェクト名リンクを特定するロケータを返す。
 * サイドバーの「最近のプロジェクト」にも同名リンクが表示されるため、
 * 一覧側のカード（h3見出しを内包するリンク）に絞り込む。
 */
export function getProjectListLink(page: Page, name: string): Locator {
  return page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { level: 3, name }) });
}

export interface OpenProjectDetailPageOptions {
  initialProjects?: Project[];
  initialTasks?: SetupTaskApiMocksOptions['initialTasks'];
}

/**
 * 認証・プロジェクトAPIモック・タスクAPIモックを登録した上でプロジェクト詳細画面を開き、
 * 表示完了（成功時の詳細表示・404時のエラー表示のいずれか）を待つ。
 * 各テストのGiven部分（認証済みページ生成〜詳細画面表示待機）の重複を集約する。
 */
export async function openProjectDetailPage(
  page: Page,
  projectId: string,
  options?: OpenProjectDetailPageOptions,
): Promise<void> {
  await setupAuthenticatedApiMocks(page);
  await setupProjectCrudApiMocks(page, {
    initialProjects: options?.initialProjects,
  });
  await setupTaskApiMocks(page, { initialTasks: options?.initialTasks ?? [] });
  await page.goto(`/dashboard/projects/${projectId}`);
  // 成功・404いずれの場合も「読み込み中...」表示がすべて消えた時点で表示完了とみなす
  // （プロジェクト詳細・タスク一覧・最近のプロジェクトの各ローディング表示が対象）
  await expect(page.getByText('読み込み中...')).toHaveCount(0, {
    timeout: 15000,
  });
}
