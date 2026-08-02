import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import type { Project } from '@/packages/shared-schemas/src/projects';
import ProjectList from '../components/ProjectList';
import { ProjectServicesProvider } from '../lib/ProjectServicesContext';

const mockProjects: Project[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    userId: 'user-1',
    name: 'プロジェクトA',
    description: '説明A',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    userId: 'user-1',
    name: 'プロジェクトB',
    description: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
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
      services={{ useProjects, useProjectMutations: mock() }}
    >
      <ProjectList />
    </ProjectServicesProvider>,
  );
}

describe('ProjectList', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('project一覧が表示される', () => {
    // Given: 2件のprojectを返すモック
    renderWithProviders(() => ({
      data: mockProjects,
      isLoading: false,
      error: null,
    }));

    // When & Then: project名と説明文が表示される
    expect(
      screen.getByRole('heading', { name: 'プロジェクトA' }),
    ).toBeDefined();
    expect(screen.getByText('説明A')).toBeDefined();
    expect(
      screen.getByRole('heading', { name: 'プロジェクトB' }),
    ).toBeDefined();
  });

  test('project詳細へのリンクが表示される', () => {
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

  test('project0件時は空状態と作成導線が表示される', () => {
    // Given: 空配列を返すモック
    renderWithProviders(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    // When & Then: 空状態メッセージが表示される
    expect(screen.getByText(/まだプロジェクトがありません/)).toBeDefined();
  });
});
