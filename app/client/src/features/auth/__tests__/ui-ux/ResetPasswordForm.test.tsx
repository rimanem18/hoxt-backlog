import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import {
  ResetPasswordFormServicesProvider,
  type UsePasswordResetHook,
} from '@/features/auth/components/ResetPasswordFormServicesContext';
import type { UsePasswordResetResult } from '@/features/auth/hooks/usePasswordReset';

function createMockUsePasswordReset(
  overrides: Partial<UsePasswordResetResult> = {},
): () => UsePasswordResetResult {
  return mock(() => ({
    isReady: false,
    isLoading: false,
    status: 'idle' as const,
    errorMessage: null,
    updatePassword: mock(async () => {}),
    ...overrides,
  }));
}

describe('ResetPasswordForm', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  function buildWrapper(
    usePasswordReset: UsePasswordResetHook = createMockUsePasswordReset(),
  ) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <ResetPasswordFormServicesProvider services={{ usePasswordReset }}>
          {children}
        </ResetPasswordFormServicesProvider>
      );
    };
  }

  test('isReady が false のとき「リンクを確認中...」が表示される', () => {
    // Given: isReady=false のモック
    const mockUsePasswordReset = createMockUsePasswordReset({
      isReady: false,
    });

    // When: ResetPasswordForm をレンダリング
    render(<ResetPasswordForm />, {
      wrapper: buildWrapper(mockUsePasswordReset),
    });

    // Then: ローディング表示がされる
    expect(screen.getByText(/リンクを確認中/i)).toBeInTheDocument();
  });

  test('isReady が true のとき新パスワード入力フォームが表示される', () => {
    // Given: isReady=true のモック
    const mockUsePasswordReset = createMockUsePasswordReset({
      isReady: true,
    });

    // When: ResetPasswordForm をレンダリング
    render(<ResetPasswordForm />, {
      wrapper: buildWrapper(mockUsePasswordReset),
    });

    // Then: 新パスワード入力フィールドが表示される
    expect(screen.getByLabelText(/新しいパスワード/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /更新/i })).toBeInTheDocument();
  });

  test('新パスワード送信後に「パスワードを更新しました」が表示される', async () => {
    // Given: 更新成功状態のモック
    const mockUsePasswordReset = createMockUsePasswordReset({
      isReady: true,
      status: 'success',
    });

    // When: ResetPasswordForm をレンダリング
    render(<ResetPasswordForm />, {
      wrapper: buildWrapper(mockUsePasswordReset),
    });

    // Then: 完了メッセージが表示される
    expect(screen.getByText(/パスワードを更新しました/i)).toBeInTheDocument();
  });

  test('無効リンク時に「リンクが無効か期限切れです」が表示される（REQ-305）', () => {
    // Given: リンク無効エラー状態のモック
    const mockUsePasswordReset = createMockUsePasswordReset({
      isReady: true,
      status: 'error',
      errorMessage:
        'リンクが無効か期限切れです。再度パスワードリセットを要求してください',
    });

    // When: ResetPasswordForm をレンダリング
    render(<ResetPasswordForm />, {
      wrapper: buildWrapper(mockUsePasswordReset),
    });

    // Then: エラーメッセージが表示される
    expect(screen.getByText(/リンクが無効か期限切れです/i)).toBeInTheDocument();
  });

  test('「再度パスワードリセットを要求する」リンクが /auth/forgot-password を指す', () => {
    // Given: リンク無効エラー状態のモック
    const mockUsePasswordReset = createMockUsePasswordReset({
      isReady: true,
      status: 'error',
      errorMessage:
        'リンクが無効か期限切れです。再度パスワードリセットを要求してください',
    });

    // When: ResetPasswordForm をレンダリング
    render(<ResetPasswordForm />, {
      wrapper: buildWrapper(mockUsePasswordReset),
    });

    // Then: 再要求リンクが forgot-password を指す
    const retryLink = screen.getByRole('link', {
      name: /再度パスワードリセットを要求する/i,
    });
    expect(retryLink).toBeInTheDocument();
    expect(retryLink).toHaveAttribute('href', '/auth/forgot-password');
  });

  test('到達時点でリンク無効と判定された場合、フォームを表示せずエラーと再要求リンクを表示する（REQ-305）', () => {
    // Given: isReady=false かつ status=error（到達時点での無効リンク判定）
    const mockUsePasswordReset = createMockUsePasswordReset({
      isReady: false,
      status: 'error',
      errorMessage:
        'リンクが無効か期限切れです。再度パスワードリセットを要求してください',
    });

    // When: ResetPasswordForm をレンダリング
    render(<ResetPasswordForm />, {
      wrapper: buildWrapper(mockUsePasswordReset),
    });

    // Then: エラーメッセージと再要求リンクが表示され、フォームは表示されない
    expect(screen.getByText(/リンクが無効か期限切れです/i)).toBeInTheDocument();
    const retryLink = screen.getByRole('link', {
      name: /再度パスワードリセットを要求する/i,
    });
    expect(retryLink).toHaveAttribute('href', '/auth/forgot-password');
    expect(
      screen.queryByLabelText(/新しいパスワード/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/リンクを確認中/i)).not.toBeInTheDocument();
  });

  test('パスワード入力後に送信するとupdatePasswordが呼ばれる', async () => {
    // Given: isReady=true のモック
    const updatePassword = mock(async () => {});
    const mockUsePasswordReset = createMockUsePasswordReset({
      isReady: true,
      updatePassword,
    });
    const user = userEvent.setup();

    // When: 新パスワードを入力して送信
    render(<ResetPasswordForm />, {
      wrapper: buildWrapper(mockUsePasswordReset),
    });
    await user.type(
      screen.getByLabelText(/新しいパスワード/i),
      'newSecurePass123',
    );
    await user.click(screen.getByRole('button', { name: /更新/i }));

    // Then: updatePassword が入力値で呼ばれる
    expect(updatePassword).toHaveBeenCalledWith('newSecurePass123');
  });
});
