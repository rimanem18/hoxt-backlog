import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { Project } from '@hoxt-backlog/shared-schemas/projects';
import { cleanup, render, screen } from '@testing-library/react';
import ProjectDetail from '../components/ProjectDetail';
import { ProjectServicesProvider } from '../lib/ProjectServicesContext';

const mockProject: Project = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  userId: 'user-1',
  name: 'プロジェクトA',
  description: '説明A',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderWithProviders(
  useProject: () => {
    data: Project | undefined;
    isLoading: boolean;
    error: Error | null;
  },
  taskListSection: React.ReactNode = <div>タスクなし</div>,
) {
  return render(
    <ProjectServicesProvider
      services={{
        useProjects: mock(),
        useProjectMutations: mock(() => ({
          createProject: { mutate: mock(), isPending: false },
          updateProject: { mutate: mock(), isPending: false },
        })),
        useProject,
      }}
    >
      <ProjectDetail
        projectId={mockProject.id}
        taskListSection={taskListSection}
      />
    </ProjectServicesProvider>,
  );
}

describe('ProjectDetail', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('project情報とtask一覧が表示される', () => {
    // Given: project詳細取得成功のモック
    renderWithProviders(
      () => ({ data: mockProject, isLoading: false, error: null }),
      <div>タスクA</div>,
    );

    // When & Then: project名・説明文・task一覧が表示される
    expect(
      screen.getByRole('heading', { name: 'プロジェクトA' }),
    ).toBeDefined();
    expect(screen.getByText('説明A')).toBeDefined();
    expect(screen.getByText('タスクA')).toBeDefined();
  });

  test('編集ボタンが表示される', () => {
    // Given: project詳細取得成功のモック
    renderWithProviders(() => ({
      data: mockProject,
      isLoading: false,
      error: null,
    }));

    // When & Then: 編集ボタンが表示される
    expect(screen.getByRole('button', { name: '編集' })).toBeDefined();
  });

  test('ローディング中はローディング表示される', () => {
    // Given: ローディング状態のモック
    renderWithProviders(() => ({
      data: undefined,
      isLoading: true,
      error: null,
    }));

    // When & Then: ローディングテキストが表示される
    expect(screen.getByText('読み込み中...')).toBeDefined();
  });

  test('404エラー時は見つからない旨の表示になる', () => {
    // Given: 404エラーのモック
    renderWithProviders(() => ({
      data: undefined,
      isLoading: false,
      error: new Error('プロジェクトが見つかりません'),
    }));

    // When & Then: 見つからない旨のメッセージが表示される
    expect(screen.getByText('プロジェクトが見つかりません')).toBeDefined();
  });

  test('taskが0件の場合は渡されたtaskListSectionがそのまま表示される', () => {
    // Given: project詳細取得成功のモックと0件用のtaskListSection
    renderWithProviders(
      () => ({ data: mockProject, isLoading: false, error: null }),
      <div>タスクがありません</div>,
    );

    // When & Then: 0件時のtaskListSectionが表示される
    expect(screen.getByText('タスクがありません')).toBeDefined();
  });
});
