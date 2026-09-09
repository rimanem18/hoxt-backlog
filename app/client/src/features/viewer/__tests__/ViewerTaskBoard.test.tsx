import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { ViewerAccessibleProject } from '@hoxt-backlog/shared-schemas/viewers';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewerTaskBoardContent } from '../components/ViewerTaskBoard';
import type { useRegisterPushSubscription } from '../hooks/useRegisterPushSubscription';
import type { useUpdateNotificationSetting } from '../hooks/useUpdateNotificationSetting';
import { ViewerServicesProvider } from '../lib/ViewerServicesContext';

const mockProjects: ViewerAccessibleProject[] = [
  {
    projectId: '770e8400-e29b-41d4-a716-446655440001',
    projectName: 'project A',
    ownerName: '山田太郎',
    notificationEnabled: true,
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
    notificationEnabled: false,
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
const tokenExpiresAt = '2026-09-15T00:00:00.000Z';

const defaultMockMutate = mock(() => {});
const defaultMockUseUpdateNotificationSetting: typeof useUpdateNotificationSetting =
  mock(() => ({
    mutate: defaultMockMutate,
    isPending: false,
    isError: false,
    error: null,
    variables: undefined,
  }));

const defaultMockUseRegisterPushSubscription: typeof useRegisterPushSubscription =
  mock(() => ({
    permissionState: 'unsupported',
    isRegistering: false,
    error: null,
    requestPermission: mock(() => {}),
  }));

function renderWithProviders(
  useViewerAccessibleProjects: () => {
    data:
      | {
          viewerEmail: string;
          tokenExpiresAt: string;
          projects: ViewerAccessibleProject[];
        }
      | undefined;
    isLoading: boolean;
    error: Error | null;
  },
  useUpdateNotificationSettingOverride?: typeof useUpdateNotificationSetting,
) {
  return render(
    <ViewerServicesProvider
      services={{
        useViewerAccessibleProjects,
        useUpdateNotificationSetting:
          useUpdateNotificationSettingOverride ??
          defaultMockUseUpdateNotificationSetting,
        useRegisterPushSubscription: defaultMockUseRegisterPushSubscription,
      }}
    >
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
      data: { viewerEmail, tokenExpiresAt, projects: mockProjects },
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
      data: { viewerEmail, tokenExpiresAt, projects: mockProjects },
      isLoading: false,
      error: null,
    }));

    // When & Then: 「〜として閲覧しています。」が表示される
    expect(
      screen.getByText('viewer@example.com として閲覧しています。'),
    ).toBeDefined();
  });

  test('トークンの有効期限が絶対日付で表示される', () => {
    // Given: tokenExpiresAtを含むモック
    renderWithProviders(() => ({
      data: { viewerEmail, tokenExpiresAt, projects: mockProjects },
      isLoading: false,
      error: null,
    }));

    // When & Then: 「このURLの有効期限は2026年9月15日までです。」が表示される
    expect(
      screen.getByText('このURLの有効期限は2026年9月15日までです。'),
    ).toBeDefined();
  });

  test('オーナー名があるprojectには「○○さんのタスク」が表示される', () => {
    // Given: ownerNameが設定されたprojectとnullのprojectを含むモック
    renderWithProviders(() => ({
      data: { viewerEmail, tokenExpiresAt, projects: mockProjects },
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
      data: { viewerEmail, tokenExpiresAt, projects: [] },
      isLoading: false,
      error: null,
    }));

    // When & Then: 空状態メッセージが表示される
    expect(screen.getByText('閲覧できるprojectがありません')).toBeDefined();
  });

  test('招待0件時でも閲覧者自身のメールアドレスは表示される', () => {
    // Given: 空配列を返すモック
    renderWithProviders(() => ({
      data: { viewerEmail, tokenExpiresAt, projects: [] },
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

  test('各projectの通知トグルが初期状態を反映して表示される', () => {
    // Given: 通知ONのprojectAと通知OFFのprojectBを含むモック
    renderWithProviders(() => ({
      data: { viewerEmail, tokenExpiresAt, projects: mockProjects },
      isLoading: false,
      error: null,
    }));

    // When & Then: 各projectのトグルが対応する初期状態を反映する
    expect(
      screen.getByRole('switch', { name: 'project A の通知' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('switch', { name: 'project B の通知' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  test('通知トグルをクリックすると対象projectのIDと反転した値でmutateが呼ばれる', async () => {
    // Given: 通知ONのprojectAを含むモック
    const user = userEvent.setup();
    const mockMutate = mock(() => {});
    const mockUseUpdateNotificationSetting: typeof useUpdateNotificationSetting =
      mock(() => ({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        variables: undefined,
      }));

    renderWithProviders(
      () => ({
        data: { viewerEmail, tokenExpiresAt, projects: mockProjects },
        isLoading: false,
        error: null,
      }),
      mockUseUpdateNotificationSetting,
    );

    // When: projectAのトグルをクリック
    await user.click(screen.getByRole('switch', { name: 'project A の通知' }));

    // Then: projectAのIDと反転した値（false）でmutateが呼ばれる
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: '770e8400-e29b-41d4-a716-446655440001',
        enabled: false,
      }),
    );
  });

  test('あるprojectのトグル操作は他projectの初期表示に影響しない', async () => {
    // Given: 通知ONのprojectAと通知OFFのprojectBを含むモック
    const user = userEvent.setup();
    renderWithProviders(() => ({
      data: { viewerEmail, tokenExpiresAt, projects: mockProjects },
      isLoading: false,
      error: null,
    }));

    // When: projectAのトグルをクリック
    await user.click(screen.getByRole('switch', { name: 'project A の通知' }));

    // Then: projectBのトグル表示はOFFのまま変化しない
    expect(
      screen.getByRole('switch', { name: 'project B の通知' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  test('更新中は通知トグルが無効化される', () => {
    // Given: 更新中（isPending）状態のモック
    const mockUseUpdateNotificationSettingPending: typeof useUpdateNotificationSetting =
      mock(() => ({
        mutate: mock(() => {}),
        isPending: true,
        isError: false,
        error: null,
        variables: undefined,
      }));

    renderWithProviders(
      () => ({
        data: { viewerEmail, tokenExpiresAt, projects: mockProjects },
        isLoading: false,
        error: null,
      }),
      mockUseUpdateNotificationSettingPending,
    );

    // When & Then: 通知トグルが無効化されている
    expect(
      screen.getByRole('switch', { name: 'project A の通知' }),
    ).toBeDisabled();
  });

  test('通知設定変更が失敗した場合はエラーメッセージが表示される', () => {
    // Given: 更新エラー状態のモック
    const mockUseUpdateNotificationSettingError: typeof useUpdateNotificationSetting =
      mock(() => ({
        mutate: mock(() => {}),
        isPending: false,
        isError: true,
        error: new Error('通知設定の変更に失敗しました'),
        variables: undefined,
      }));

    renderWithProviders(
      () => ({
        data: {
          viewerEmail,
          tokenExpiresAt,
          projects: [mockProjects[0] as ViewerAccessibleProject],
        },
        isLoading: false,
        error: null,
      }),
      mockUseUpdateNotificationSettingError,
    );

    // When & Then: 通知設定変更のエラーメッセージが表示される
    expect(screen.getByText('通知設定の変更に失敗しました')).toBeDefined();
  });
});
