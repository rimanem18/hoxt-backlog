import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { Project } from '@hoxt-backlog/shared-schemas/projects';
import { cleanup, render, screen } from '@testing-library/react';
import RecentProjects from '../components/RecentProjects';
import { ProjectServicesProvider } from '../lib/ProjectServicesContext';

const mockProjects: Project[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    userId: 'user-1',
    name: 'プロジェクトA',
    description: '説明A',
    createdAt: '2026-01-04T00:00:00.000Z',
    updatedAt: '2026-01-04T00:00:00.000Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    userId: 'user-1',
    name: 'プロジェクトB',
    description: null,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    userId: 'user-1',
    name: 'プロジェクトC',
    description: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    userId: 'user-1',
    name: 'プロジェクトD',
    description: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function renderWithProviders(
  useProjects: () => {
    data: Project[] | undefined;
    isLoading: boolean;
    error: Error | null;
  },
) {
  return render(
    <ProjectServicesProvider
      services={{
        useProjects,
        useProjectMutations: mock(),
        useProject: mock(),
      }}
    >
      <RecentProjects />
    </ProjectServicesProvider>,
  );
}

describe('RecentProjects', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('見出し「最近のプロジェクト」が表示される', () => {
    // Given: 1件のprojectを返すモック
    renderWithProviders(() => ({
      data: [mockProjects[0]],
      isLoading: false,
      error: null,
    }));

    // When & Then: 見出しが表示される
    expect(
      screen.getByRole('heading', { name: '最近のプロジェクト' }),
    ).toBeDefined();
  });

  test('最近のプロジェクトが最大3件表示される', () => {
    // Given: 4件のprojectを返すモック（サーバー側でcreatedAt降順ソート済み）
    renderWithProviders(() => ({
      data: mockProjects,
      isLoading: false,
      error: null,
    }));

    // When & Then: 先頭3件のみ表示され、4件目は表示されない
    expect(screen.getByRole('link', { name: /プロジェクトA/ })).toBeDefined();
    expect(screen.getByRole('link', { name: /プロジェクトB/ })).toBeDefined();
    expect(screen.getByRole('link', { name: /プロジェクトC/ })).toBeDefined();
    expect(screen.queryByText('プロジェクトD')).toBeNull();
  });

  test('各項目からproject詳細へ遷移できる', () => {
    // Given: 1件のprojectを返すモック
    renderWithProviders(() => ({
      data: [mockProjects[0]],
      isLoading: false,
      error: null,
    }));

    // When & Then: project詳細へのリンクが表示される
    const link = screen.getByRole('link', { name: /プロジェクトA/ });
    expect(link.getAttribute('href')).toBe(
      '/dashboard/projects/550e8400-e29b-41d4-a716-446655440001',
    );
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

  test('エラー時はエラーメッセージが表示される', () => {
    // Given: エラー状態のモック
    renderWithProviders(() => ({
      data: undefined,
      isLoading: false,
      error: new Error('取得失敗'),
    }));

    // When & Then: エラーメッセージが表示される
    expect(screen.getByText('エラーが発生しました')).toBeDefined();
  });

  test('project0件時は空状態と一覧画面への導線が表示される', () => {
    // Given: 空配列を返すモック
    renderWithProviders(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    // When & Then: 空状態メッセージとプロジェクト一覧への導線が表示される
    expect(screen.getByText(/まだプロジェクトがありません/)).toBeDefined();
    const link = screen.getByRole('link', { name: /プロジェクト/ });
    expect(link.getAttribute('href')).toBe('/dashboard/projects');
  });
});
