import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { ViewerAccessibleProject } from '@hoxt-backlog/shared-schemas/viewers';
import { cleanup, render, screen } from '@testing-library/react';
import { ViewerTaskBoardContent } from '../components/ViewerTaskBoard';
import { ViewerServicesProvider } from '../lib/ViewerServicesContext';

const mockProjects: ViewerAccessibleProject[] = [
  {
    projectId: '770e8400-e29b-41d4-a716-446655440001',
    projectName: 'project A',
    ownerName: '山田太郎',
    tasks: [
      {
        id: '880e8400-e29b-41d4-a716-446655440001',
        title: 'task A1',
        description: 'desc A1',
        status: 'not_started',
        priority: 'high',
      },
    ],
  },
  {
    projectId: '770e8400-e29b-41d4-a716-446655440002',
    projectName: 'project B',
    ownerName: null,
    tasks: [
      {
        id: '880e8400-e29b-41d4-a716-446655440002',
        title: 'task B1',
        description: null,
        status: 'completed',
        priority: 'low',
      },
    ],
  },
];

const viewerEmail = 'viewer@example.com';

function renderWithProviders(
  useViewerAccessibleProjects: () => {
    data:
      | { viewerEmail: string; projects: ViewerAccessibleProject[] }
      | undefined;
    isLoading: boolean;
    error: Error | null;
  },
) {
  return render(
    <ViewerServicesProvider services={{ useViewerAccessibleProjects }}>
      <ViewerTaskBoardContent />
    </ViewerServicesProvider>,
  );
}

describe('ViewerTaskBoardContent', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('複数projectのtaskがprojectごとにグルーピングされて表示される', () => {
    // Given: 2件のprojectとtaskを返すモック
    renderWithProviders(() => ({
      data: { viewerEmail, projects: mockProjects },
      isLoading: false,
      error: null,
    }));

    // When & Then: 各projectのtaskタイトルが表示される
    expect(screen.getByText('project A')).toBeDefined();
    expect(screen.getByText('task A1')).toBeDefined();
    expect(screen.getByText('project B')).toBeDefined();
    expect(screen.getByText('task B1')).toBeDefined();
  });

  test('閲覧者自身のメールアドレスが表示される', () => {
    // Given: viewerEmailを含むモック
    renderWithProviders(() => ({
      data: { viewerEmail, projects: mockProjects },
      isLoading: false,
      error: null,
    }));

    // When & Then: 「〜として閲覧しています。」が表示される
    expect(
      screen.getByText('viewer@example.com として閲覧しています。'),
    ).toBeDefined();
  });

  test('オーナー名があるprojectには「○○さんのタスク」が表示される', () => {
    // Given: ownerNameが設定されたprojectとnullのprojectを含むモック
    renderWithProviders(() => ({
      data: { viewerEmail, projects: mockProjects },
      isLoading: false,
      error: null,
    }));

    // When & Then: ownerNameを持つprojectのみ見出しが表示される
    expect(screen.getByText('山田太郎さんのタスク')).toBeDefined();
    expect(screen.getAllByText(/さんのタスク/)).toHaveLength(1);
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

  test('招待0件時は空状態が表示される', () => {
    // Given: 空配列を返すモック
    renderWithProviders(() => ({
      data: { viewerEmail, projects: [] },
      isLoading: false,
      error: null,
    }));

    // When & Then: 空状態メッセージが表示される
    expect(screen.getByText('閲覧できるprojectがありません')).toBeDefined();
  });

  test('招待0件時でも閲覧者自身のメールアドレスは表示される', () => {
    // Given: 空配列を返すモック
    renderWithProviders(() => ({
      data: { viewerEmail, projects: [] },
      isLoading: false,
      error: null,
    }));

    // When & Then: 空状態でも「〜として閲覧しています。」が表示される
    expect(
      screen.getByText('viewer@example.com として閲覧しています。'),
    ).toBeDefined();
  });

  test('無効なトークンの場合はエラーメッセージが表示され再発行導線は表示されない', () => {
    // Given: エラー状態のモック（無効なトークン）
    renderWithProviders(() => ({
      data: undefined,
      isLoading: false,
      error: new Error('無効なViewer-Access-Tokenです'),
    }));

    // When & Then: エラーメッセージが表示される
    expect(screen.getByText('無効なViewer-Access-Tokenです')).toBeDefined();

    // Then: 再発行を促す導線（リンク・ボタン）は表示されない
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
