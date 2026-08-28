import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { ProjectViewer } from '@hoxt-backlog/shared-schemas/viewers';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewerList from '../components/ViewerList';
import { ViewerManagementServicesProvider } from '../lib/ViewerManagementServicesContext';

const mockProjectId = '770e8400-e29b-41d4-a716-446655440002';

const mockViewers: ProjectViewer[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    projectId: mockProjectId,
    email: 'a@example.com',
    status: 'active',
    invitedAt: '2026-01-01T00:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    projectId: mockProjectId,
    email: 'b@example.com',
    status: 'active',
    invitedAt: '2026-01-02T00:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

function renderWithProviders(
  useProjectViewers: () => {
    data: ProjectViewer[] | undefined;
    isLoading: boolean;
    error: Error | null;
  },
  useRevokeViewer: Parameters<
    typeof ViewerManagementServicesProvider
  >[0]['services']['useRevokeViewer'] = mock(() => ({
    mutate: mock(() => {}),
    isPending: false,
  })),
) {
  return render(
    <ViewerManagementServicesProvider
      services={{
        useInviteViewer: mock(),
        useProjectViewers,
        useRevokeViewer,
      }}
    >
      <ViewerList projectId={mockProjectId} />
    </ViewerManagementServicesProvider>,
  );
}

describe('ViewerList', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('viewer一覧が表示される', () => {
    // Given: 2件のviewerを返すモック
    renderWithProviders(() => ({
      data: mockViewers,
      isLoading: false,
      error: null,
    }));

    // When & Then: 各viewerのメールアドレスが表示される
    expect(screen.getByText('a@example.com')).toBeDefined();
    expect(screen.getByText('b@example.com')).toBeDefined();
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

  test('viewer0件時は空状態が表示される', () => {
    // Given: 空配列を返すモック
    renderWithProviders(() => ({
      data: [],
      isLoading: false,
      error: null,
    }));

    // When & Then: 空状態メッセージが表示される
    expect(screen.getByText('招待済みの閲覧者はいません')).toBeDefined();
  });

  test('取り消しボタンをクリックすると確認導線が表示される', async () => {
    // Given: 2件のviewerを返すモック
    const user = userEvent.setup();
    renderWithProviders(() => ({
      data: mockViewers,
      isLoading: false,
      error: null,
    }));

    // When: 1件目の取り消しボタンをクリック
    await user.click(
      screen.getByRole('button', {
        name: 'a@example.comへの招待を取り消す',
      }),
    );

    // Then: 確認メッセージと確定・キャンセルボタンが表示される
    expect(screen.getByText('取り消しますか？')).toBeDefined();
    expect(screen.getByRole('button', { name: '取り消す' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDefined();
  });

  test('確認後に取り消すボタンをクリックするとrevokeViewerが呼ばれる', async () => {
    // Given: 2件のviewerを返すモック
    const user = userEvent.setup();
    const mockMutate = mock(() => {});
    const mockUseRevokeViewer = mock(() => ({
      mutate: mockMutate,
      isPending: false,
    }));

    renderWithProviders(
      () => ({ data: mockViewers, isLoading: false, error: null }),
      mockUseRevokeViewer,
    );

    // When: 1件目の取り消しボタン→確定ボタンの順にクリック
    await user.click(
      screen.getByRole('button', {
        name: 'a@example.comへの招待を取り消す',
      }),
    );
    await user.click(screen.getByRole('button', { name: '取り消す' }));

    // Then: revokeViewer.mutateが正しい引数で呼ばれる
    expect(mockMutate).toHaveBeenCalledWith(
      { projectId: mockProjectId, viewerId: mockViewers[0].id },
      expect.any(Object),
    );
  });

  test('確認導線でキャンセルを押すと確認表示が閉じる', async () => {
    // Given: 2件のviewerを返すモック
    const user = userEvent.setup();
    renderWithProviders(() => ({
      data: mockViewers,
      isLoading: false,
      error: null,
    }));

    // When: 取り消しボタン→キャンセルボタンの順にクリック
    await user.click(
      screen.getByRole('button', {
        name: 'a@example.comへの招待を取り消す',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    // Then: 確認メッセージが消え、通常の取り消しボタンに戻る
    expect(screen.queryByText('取り消しますか？')).toBeNull();
    expect(
      screen.getByRole('button', {
        name: 'a@example.comへの招待を取り消す',
      }),
    ).toBeDefined();
  });

  test('取り消し処理中は確定・キャンセル・他のviewerの取り消しボタンが無効化される', async () => {
    // Given: 確認導線を開いた状態から、取り消し処理中（isPending: true）へ遷移する
    const user = userEvent.setup();
    const mockMutate = mock(() => {});
    const useProjectViewersMock = () => ({
      data: mockViewers,
      isLoading: false,
      error: null,
    });
    const useRevokeViewerNotPending = mock(() => ({
      mutate: mockMutate,
      isPending: false,
    }));
    const useRevokeViewerPending = mock(() => ({
      mutate: mockMutate,
      isPending: true,
    }));

    const { rerender } = render(
      <ViewerManagementServicesProvider
        services={{
          useInviteViewer: mock(),
          useProjectViewers: useProjectViewersMock,
          useRevokeViewer: useRevokeViewerNotPending,
        }}
      >
        <ViewerList projectId={mockProjectId} />
      </ViewerManagementServicesProvider>,
    );

    // When: 1件目の取り消しボタンをクリックして確認導線を開く
    await user.click(
      screen.getByRole('button', {
        name: 'a@example.comへの招待を取り消す',
      }),
    );

    // When: 取り消し処理中の状態へ再レンダリング
    rerender(
      <ViewerManagementServicesProvider
        services={{
          useInviteViewer: mock(),
          useProjectViewers: useProjectViewersMock,
          useRevokeViewer: useRevokeViewerPending,
        }}
      >
        <ViewerList projectId={mockProjectId} />
      </ViewerManagementServicesProvider>,
    );

    // Then: 確定・キャンセルボタン、他viewerの取り消しトリガーボタンが無効化される
    expect(screen.getByRole('button', { name: '取り消す' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: 'b@example.comへの招待を取り消す',
      }),
    ).toBeDisabled();
  });

  test('取り消し失敗時にエラーメッセージが表示される', async () => {
    // Given: APIが失敗する設定
    const user = userEvent.setup();
    const mockMutateError = mock((_input, { onError }) => {
      onError?.(new Error('招待が見つかりません'));
    });
    const mockUseRevokeViewer = mock(() => ({
      mutate: mockMutateError,
      isPending: false,
    }));

    renderWithProviders(
      () => ({ data: mockViewers, isLoading: false, error: null }),
      mockUseRevokeViewer,
    );

    // When: 取り消しを実行
    await user.click(
      screen.getByRole('button', {
        name: 'a@example.comへの招待を取り消す',
      }),
    );
    await user.click(screen.getByRole('button', { name: '取り消す' }));

    // Then: エラーメッセージが表示される
    expect(screen.getByText('招待が見つかりません')).toBeDefined();
  });
});
