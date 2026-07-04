import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import {
  LoginFormServicesProvider,
  type UseEmailSigninHook,
} from '@/features/auth/components/LoginFormServicesContext';
import type { UseEmailSigninResult } from '@/features/auth/hooks/useEmailSignin';

function createMockUseEmailSignin(
  overrides: Partial<UseEmailSigninResult> = {},
): () => UseEmailSigninResult {
  return mock(() => ({
    isLoading: false,
    errorMessage: null,
    signIn: mock(async () => {}),
    ...overrides,
  }));
}

describe('LoginForm', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  function buildWrapper(
    useEmailSignin: UseEmailSigninHook = createMockUseEmailSignin(),
  ) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <LoginFormServicesProvider services={{ useEmailSignin }}>
          {children}
        </LoginFormServicesProvider>
      );
    };
  }

  test('Google ボタンとメールパスワードフォームが同一画面に表示される（REQ-001）', () => {
    // Given: デフォルト状態のモック
    const mockUseEmailSignin = createMockUseEmailSignin();

    // When: LoginForm をレンダリング
    render(<LoginForm />, { wrapper: buildWrapper(mockUseEmailSignin) });

    // Then: Google ボタンが表示される
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();

    // Then: メールアドレス入力フィールドが表示される
    expect(
      screen.getByRole('textbox', { name: /メールアドレス/i }),
    ).toBeInTheDocument();

    // Then: パスワード入力フィールドが表示される
    expect(screen.getByLabelText(/パスワード/i)).toBeInTheDocument();

    // Then: サインインボタンが表示される
    expect(
      screen.getByRole('button', { name: /サインイン/i }),
    ).toBeInTheDocument();
  });

  test('メール・パスワード未入力で送信 → バリデーションエラーが表示される（REQ-304）', async () => {
    // Given: デフォルト状態のモック
    const mockUseEmailSignin = createMockUseEmailSignin();
    const user = userEvent.setup();

    // When: LoginForm をレンダリングして未入力のまま送信
    render(<LoginForm />, { wrapper: buildWrapper(mockUseEmailSignin) });

    await user.click(screen.getByRole('button', { name: /サインイン/i }));

    // Then: バリデーションエラーが表示される
    expect(
      screen.getByText(/メールアドレスを入力してください/i),
    ).toBeInTheDocument();
  });

  test('送信中はフォームが無効化（loading 状態）になる', () => {
    // Given: isLoading=true のモック
    const mockUseEmailSignin = createMockUseEmailSignin({ isLoading: true });

    // When: ローディング中の LoginForm をレンダリング
    render(<LoginForm />, { wrapper: buildWrapper(mockUseEmailSignin) });

    // Then: サインインボタンが無効化される
    expect(
      screen.getByRole('button', { name: /サインイン中|サインイン/i }),
    ).toBeDisabled();
  });

  test('エラーメッセージが表示領域に表示される', () => {
    // Given: errorMessage がある状態のモック
    const errorMessage = 'メールアドレスまたはパスワードが間違っています';
    const mockUseEmailSignin = createMockUseEmailSignin({ errorMessage });

    // When: エラー状態の LoginForm をレンダリング
    render(<LoginForm />, { wrapper: buildWrapper(mockUseEmailSignin) });

    // Then: エラーメッセージが表示される
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('「アカウントをお持ちでない方はこちら」リンクが /signup を指す', () => {
    // Given: デフォルト状態のモック
    const mockUseEmailSignin = createMockUseEmailSignin();

    // When: LoginForm をレンダリング
    render(<LoginForm />, { wrapper: buildWrapper(mockUseEmailSignin) });

    // Then: サインアップリンクが表示される
    const signupLink = screen.getByRole('link', {
      name: /アカウントをお持ちでない方はこちら/i,
    });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  test('「パスワードを忘れた方はこちら」リンクが /auth/forgot-password を指す', () => {
    // Given: デフォルト状態のモック
    const mockUseEmailSignin = createMockUseEmailSignin();

    // When: LoginForm をレンダリング
    render(<LoginForm />, { wrapper: buildWrapper(mockUseEmailSignin) });

    // Then: パスワードリセットリンクが表示される
    const forgotLink = screen.getByRole('link', {
      name: /パスワードを忘れた方はこちら/i,
    });
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink).toHaveAttribute('href', '/auth/forgot-password');
  });
});
