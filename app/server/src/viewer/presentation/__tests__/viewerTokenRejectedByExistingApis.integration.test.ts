/**
 * viewerトークンによる既存編集系APIへのアクセス拒否確認
 *
 * Viewer-Access-Tokenヘッダのみを付与しAuthorizationヘッダを付与しない場合、
 * authMiddleware配下の既存task/project更新系APIが一切認証されないことを検証する。
 * REQ-002（viewerには編集操作を一切提供しない）を担保する。
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import type { OpenAPIHono } from '@hono/zod-openapi';
import {
  type MockUseCases as MockProjectUseCases,
  mockUseCases as mockProjectUseCases,
} from '@/project/presentation/__tests__/helpers';
import {
  type MockUseCases as MockTaskUseCases,
  mockUseCases as mockTaskUseCases,
} from '@/task/presentation/__tests__/helpers';

describe('viewerトークンによる既存編集系APIへのアクセス拒否', () => {
  let taskApp: OpenAPIHono;
  let projectApp: OpenAPIHono;
  let taskUseCases: MockTaskUseCases;
  let projectUseCases: MockProjectUseCases;

  beforeEach(async () => {
    taskUseCases = mockTaskUseCases();
    projectUseCases = mockProjectUseCases();

    const { createTaskRoutes } = await import('@/task/presentation/taskRoutes');
    taskApp = createTaskRoutes({
      createTaskUseCase: taskUseCases.createTaskUseCase,
      getTasksUseCase: taskUseCases.getTasksUseCase,
      getTaskByIdUseCase: taskUseCases.getTaskByIdUseCase,
      updateTaskUseCase: taskUseCases.updateTaskUseCase,
      deleteTaskUseCase: taskUseCases.deleteTaskUseCase,
      changeTaskStatusUseCase: taskUseCases.changeTaskStatusUseCase,
    });

    const { createProjectRoutes } = await import(
      '@/project/presentation/projectRoutes'
    );
    projectApp = createProjectRoutes({
      createProjectUseCase: projectUseCases.createProjectUseCase,
      getProjectsUseCase: projectUseCases.getProjectsUseCase,
      getProjectByIdUseCase: projectUseCases.getProjectByIdUseCase,
      updateProjectUseCase: projectUseCases.updateProjectUseCase,
    });
  });

  test('PATCH /tasks/{id}/statusはViewer-Access-Tokenのみでは401になる', async () => {
    // Given: Viewer-Access-TokenヘッダのみでAuthorizationヘッダなし
    // When: taskステータス変更エンドポイントへリクエスト
    const res = await taskApp.request(
      '/tasks/550e8400-e29b-41d4-a716-446655440000/status',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Viewer-Access-Token': 'some-viewer-token',
        },
        body: JSON.stringify({ status: 'completed' }),
      },
    );

    // Then: 401 Unauthorizedで認証されない
    expect(res.status).toBe(401);
  });

  test('PUT /tasks/{id}はViewer-Access-Tokenのみでは401になる', async () => {
    // When: task更新エンドポイントへViewer-Access-Tokenのみでリクエスト
    const res = await taskApp.request(
      '/tasks/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Viewer-Access-Token': 'some-viewer-token',
        },
        body: JSON.stringify({ title: '不正な更新' }),
      },
    );

    // Then: 401 Unauthorizedで認証されない
    expect(res.status).toBe(401);
  });

  test('POST /projectsはViewer-Access-Tokenのみでは401になる', async () => {
    // When: project作成エンドポイントへViewer-Access-Tokenのみでリクエスト
    const res = await projectApp.request('/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Viewer-Access-Token': 'some-viewer-token',
      },
      body: JSON.stringify({ name: '不正な作成' }),
    });

    // Then: 401 Unauthorizedで認証されない
    expect(res.status).toBe(401);
  });

  test('PUT /projects/{id}はViewer-Access-Tokenのみでは401になる', async () => {
    // When: project更新エンドポイントへViewer-Access-Tokenのみでリクエスト
    const res = await projectApp.request(
      '/projects/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Viewer-Access-Token': 'some-viewer-token',
        },
        body: JSON.stringify({ name: '不正な更新' }),
      },
    );

    // Then: 401 Unauthorizedで認証されない
    expect(res.status).toBe(401);
  });
});
