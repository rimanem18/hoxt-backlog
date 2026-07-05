import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import {
  ForgotPasswordFormServicesProvider,
  type UseForgotPasswordHook,
} from '@/features/auth/components/ForgotPasswordFormServicesContext';
import type { UseForgotPasswordResult } from '@/features/auth/hooks/useForgotPassword';

function createMockUseForgotPassword(
  overrides: Partial<UseForgotPasswordResult> = {},
): () => UseForgotPasswordResult {
  return mock(() => ({
    isLoading: false,
    status: 'idle' as const,
    errorMessage: null,
    requestReset: mock(async () => {}),
    ...overrides,
  }));
}

describe('ForgotPasswordForm', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  function buildWrapper(
    useForgotPassword: UseForgotPasswordHook = createMockUseForgotPassword(),
  ) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <ForgotPasswordFormServicesProvider services={{ useForgotPassword }}>
          {children}
        </ForgotPasswordFormServicesProvider>
      );
    };
  }

  test('メールアドレス入力フィールドと送信ボタンが表示される', () => {
    // Given: デフォルト状態のモック
    const mockUseForgotPassword = createMockUseForgotPassword();

    // When: ForgotPasswordForm をレンダリング
    render(<ForgotPasswordForm />, {
      wrapper: buildWrapper(mockUseForgotPassword),
    });

    // Then: メールアドレス入力フィールドが表示される
    expect(
      screen.getByRole('textbox', { name: /メールアドレス/i }),
    ).toBeInTheDocument();

    // Then: 送信ボタンが表示される
    expect(screen.getByRole('button', { name: /送信/i })).toBeInTheDocument();
  });

  test('送信後に「パスワードリセットメールを送信しました」が表示される', async () => {
    // Given: 送信成功状態のモック
    const mockUseForgotPassword = createMockUseForgotPassword({
      status: 'sent',
    });

    // When: ForgotPasswordForm をレンダリング
    render(<ForgotPasswordForm />, {
      wrapper: buildWrapper(mockUseForgotPassword),
    });

    // Then: 送信済みメッセージが表示される
    expect(
      screen.getByText(/パスワードリセットメールを送信しました/i),
    ).toBeInTheDocument();
  });

  test('メール形式不正 → バリデーションエラーが表示される', async () => {
    // Given: デフォルト状態のモック
    const mockUseForgotPassword = createMockUseForgotPassword();
    const user = userEvent.setup();

    // When: 不正なメール形式を入力して送信
    render(<ForgotPasswordForm />, {
      wrapper: buildWrapper(mockUseForgotPassword),
    });
    await user.type(
      screen.getByRole('textbox', { name: /メールアドレス/i }),
      'invalid-email',
    );
    await user.click(screen.getByRole('button', { name: /送信/i }));

    // Then: メール形式エラーが表示される
    expect(
      screen.getByText(/メールアドレスの形式が正しくありません/i),
    ).toBeInTheDocument();
  });

  test('「ログインに戻る」リンクがホームページ（/）を指す', () => {
    // Given: デフォルト状態のモック
    const mockUseForgotPassword = createMockUseForgotPassword();

    // When: ForgotPasswordForm をレンダリング
    render(<ForgotPasswordForm />, {
      wrapper: buildWrapper(mockUseForgotPassword),
    });

    // Then: ログインに戻るリンクが / を指す
    const backLink = screen.getByRole('link', { name: /ログインに戻る/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/');
  });

  test('送信中はボタンが無効化される', () => {
    // Given: isLoading=true のモック
    const mockUseForgotPassword = createMockUseForgotPassword({
      isLoading: true,
    });

    // When: ローディング中の ForgotPasswordForm をレンダリング
    render(<ForgotPasswordForm />, {
      wrapper: buildWrapper(mockUseForgotPassword),
    });

    // Then: 送信ボタンが無効化される
    expect(screen.getByRole('button', { name: /送信中|送信/i })).toBeDisabled();
  });
});
