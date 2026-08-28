import type {
  CreateProjectInput,
  Project,
} from '@hoxt-backlog/shared-schemas/projects';
import type { Task, TaskPriority } from '@hoxt-backlog/shared-schemas/tasks';
import type { ProjectViewer } from '@hoxt-backlog/shared-schemas/viewers';
import { SERVER_BASE_URL } from './constants';

async function apiFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${SERVER_BASE_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `API呼び出しに失敗しました (${path}): ${res.status} ${JSON.stringify(body)}`,
    );
  }
  return body.data as T;
}

/** project作成者としてprojectを実バックエンドへ直接作成する（Given用のデータ準備）。 */
export async function createProject(
  accessToken: string,
  input: CreateProjectInput,
): Promise<Project> {
  return apiFetch<Project>('/projects', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  projectId: string;
}

/** projectに紐づくtaskを実バックエンドへ直接作成する（Given用のデータ準備）。 */
export async function createTask(
  accessToken: string,
  input: CreateTaskInput,
): Promise<Task> {
  return apiFetch<Task>('/tasks', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface InviteViewerResult {
  status: number;
  data?: ProjectViewer;
  error?: { code: string; message: string };
}

/** viewer招待APIを直接呼び出す。異常系検証のためレスポンスをそのまま返す。 */
export async function inviteViewer(
  accessToken: string,
  projectId: string,
  email: string,
): Promise<InviteViewerResult> {
  const res = await fetch(
    `${SERVER_BASE_URL}/api/projects/${projectId}/viewers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email }),
    },
  );
  const body = await res.json();
  return { status: res.status, data: body.data, error: body.error };
}

/** 招待済みviewer一覧を取得する（Then検証用）。 */
export async function listViewers(
  accessToken: string,
  projectId: string,
): Promise<ProjectViewer[]> {
  return apiFetch<ProjectViewer[]>(`/projects/${projectId}/viewers`, accessToken);
}

/** viewer招待を取り消す（Given用のデータ準備・When操作の直接実行に使う）。 */
export async function revokeViewer(
  accessToken: string,
  projectId: string,
  viewerId: string,
): Promise<{ status: number }> {
  const res = await fetch(
    `${SERVER_BASE_URL}/api/projects/${projectId}/viewers/${viewerId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return { status: res.status };
}
