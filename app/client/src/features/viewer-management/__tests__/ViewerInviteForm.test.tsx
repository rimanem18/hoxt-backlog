import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewerInviteForm from '../components/ViewerInviteForm';
import { ViewerManagementServicesProvider } from '../lib/ViewerManagementServicesContext';

const mockProjectId = '770e8400-e29b-41d4-a716-446655440002';

function renderWithProviders(
  ui: React.ReactElement,
  services: Parameters<typeof ViewerManagementServicesProvider>[0]['services'],
) {
  return render(
    <ViewerManagementServicesProvider services={services}>
      {ui}
    </ViewerManagementServicesProvider>,
  );
}

describe('ViewerInviteForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('メールアドレスを入力して送信するとinviteViewerが呼ばれる', async () => {
    // Given: ViewerInviteFormが表示されている
    const mockMutate = mock(() => {});
    const mockUseInviteViewer = mock(() => ({
      mutate: mockMutate,
      isPending: false,
    }));

    renderWithProviders(<ViewerInviteForm projectId={mockProjectId} />, {
      useInviteViewer: mockUseInviteViewer,
      useProjectViewers: mock(),
      useRevokeViewer: mock(),
    });

    // When: メールアドレスを入力して招待ボタンをクリック
    await user.type(
      screen.getByLabelText('招待するメールアドレス'),
      'viewer@example.com',
    );
    await user.click(screen.getByRole('button', { name: '招待する' }));

    // Then: inviteViewer.mutateが正しい引数で呼ばれる
    expect(mockMutate).toHaveBeenCalledWith(
      { projectId: mockProjectId, email: 'viewer@example.com' },
      expect.any(Object),
    );
  });

  test('不正なメール形式の場合はバリデーションエラーが表示され送信されない', async () => {
    // Given: ViewerInviteFormが表示されている
    const mockMutate = mock(() => {});
    const mockUseInviteViewer = mock(() => ({
      mutate: mockMutate,
      isPending: false,
    }));

    renderWithProviders(<ViewerInviteForm projectId={mockProjectId} />, {
      useInviteViewer: mockUseInviteViewer,
      useProjectViewers: mock(),
      useRevokeViewer: mock(),
    });

    // When: 不正な形式のメールアドレスを入力して送信
    await user.type(
      screen.getByLabelText('招待するメールアドレス'),
      'not-an-email',
    );
    await user.click(screen.getByRole('button', { name: '招待する' }));

    // Then: バリデーションエラーが表示され、mutateは呼ばれない
    expect(
      screen.getByText('有効なメールアドレス形式である必要があります'),
    ).toBeDefined();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('自己招待エラー時にエラーメッセージが表示される', async () => {
    // Given: APIが自己招待エラーを返す設定
    const mockMutateError = mock((_input, { onError }) => {
      onError?.(new Error('自分自身を招待できません'));
    });
    const mockUseInviteViewer = mock(() => ({
      mutate: mockMutateError,
      isPending: false,
    }));

    renderWithProviders(<ViewerInviteForm projectId={mockProjectId} />, {
      useInviteViewer: mockUseInviteViewer,
      useProjectViewers: mock(),
      useRevokeViewer: mock(),
    });

    // When: メールアドレスを入力して送信
    await user.type(
      screen.getByLabelText('招待するメールアドレス'),
      'owner@example.com',
    );
    await user.click(screen.getByRole('button', { name: '招待する' }));

    // Then: エラーメッセージが表示される
    expect(screen.getByText('自分自身を招待できません')).toBeDefined();
  });

  test('メール送信失敗エラー時にエラーメッセージが表示される', async () => {
    // Given: APIがメール送信失敗エラーを返す設定
    const mockMutateError = mock((_input, { onError }) => {
      onError?.(new Error('招待メールの送信に失敗しました: SES error'));
    });
    const mockUseInviteViewer = mock(() => ({
      mutate: mockMutateError,
      isPending: false,
    }));

    renderWithProviders(<ViewerInviteForm projectId={mockProjectId} />, {
      useInviteViewer: mockUseInviteViewer,
      useProjectViewers: mock(),
      useRevokeViewer: mock(),
    });

    // When: メールアドレスを入力して送信
    await user.type(
      screen.getByLabelText('招待するメールアドレス'),
      'viewer@example.com',
    );
    await user.click(screen.getByRole('button', { name: '招待する' }));

    // Then: エラーメッセージが表示される
    expect(
      screen.getByText('招待メールの送信に失敗しました: SES error'),
    ).toBeDefined();
  });

  test('送信成功後は入力欄がリセットされ成功メッセージが表示される', async () => {
    // Given: APIが成功する設定
    const mockMutateSuccess = mock((_input, { onSuccess }) => {
      onSuccess?.();
    });
    const mockUseInviteViewer = mock(() => ({
      mutate: mockMutateSuccess,
      isPending: false,
    }));

    renderWithProviders(<ViewerInviteForm projectId={mockProjectId} />, {
      useInviteViewer: mockUseInviteViewer,
      useProjectViewers: mock(),
      useRevokeViewer: mock(),
    });

    // When: メールアドレスを入力して送信
    const emailInput = screen.getByLabelText('招待するメールアドレス');
    await user.type(emailInput, 'viewer@example.com');
    await user.click(screen.getByRole('button', { name: '招待する' }));

    // Then: 入力欄がリセットされ、成功メッセージが表示される
    expect(emailInput).toHaveValue('');
    expect(screen.getByText('招待メールを送信しました')).toBeDefined();
  });

  test('送信中はボタンが無効化される', () => {
    // Given: 送信中の状態
    const mockUseInviteViewer = mock(() => ({
      mutate: mock(() => {}),
      isPending: true,
    }));

    renderWithProviders(<ViewerInviteForm projectId={mockProjectId} />, {
      useInviteViewer: mockUseInviteViewer,
      useProjectViewers: mock(),
      useRevokeViewer: mock(),
    });

    // Then: 招待ボタンが無効化されている
    expect(screen.getByRole('button', { name: '招待する' })).toBeDisabled();
  });
});
