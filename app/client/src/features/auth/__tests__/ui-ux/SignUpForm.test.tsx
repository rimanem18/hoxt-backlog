import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { SignUpForm } from '@/features/auth/components/SignUpForm';
import {
  SignUpFormServicesProvider,
  type UseEmailSignupHook,
} from '@/features/auth/components/SignUpFormServicesContext';
import type { UseEmailSignupResult } from '@/features/auth/hooks/useEmailSignup';

function createMockUseEmailSignup(
  overrides: Partial<UseEmailSignupResult> = {},
): () => UseEmailSignupResult {
  return mock(() => ({
    isLoading: false,
    status: 'idle' as const,
    errorMessage: null,
    signup: mock(async () => {}),
    ...overrides,
  }));
}

describe('SignUpForm', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  function buildWrapper(
    useEmailSignup: UseEmailSignupHook = createMockUseEmailSignup(),
  ) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <SignUpFormServicesProvider services={{ useEmailSignup }}>
          {children}
        </SignUpFormServicesProvider>
      );
    };
  }

  test('メール・パスワード入力フィールドとサインアップボタンが表示される', () => {
    // Given: デフォルト状態のモック
    const mockUseEmailSignup = createMockUseEmailSignup();

    // When: SignUpForm をレンダリング
    render(<SignUpForm />, { wrapper: buildWrapper(mockUseEmailSignup) });

    // Then: メールアドレス入力フィールドが表示される
    expect(
      screen.getByRole('textbox', { name: /メールアドレス/i }),
    ).toBeInTheDocument();

    // Then: パスワード入力フィールドが表示される
    expect(screen.getByLabelText(/パスワード/i)).toBeInTheDocument();

    // Then: サインアップボタンが表示される
    expect(
      screen.getByRole('button', { name: /アカウントを作成/i }),
    ).toBeInTheDocument();
  });

  test('送信後に「確認メールを送信しました。受信トレイを確認してください。」が表示される', async () => {
    // Given: signup 成功状態のモック
    const mockUseEmailSignup = createMockUseEmailSignup({
      status: 'pending_confirmation',
    });
    const user = userEvent.setup();

    // When: SignUpForm をレンダリング
    render(<SignUpForm />, { wrapper: buildWrapper(mockUseEmailSignup) });

    // Then: 確認メール送信済みメッセージが表示される
    await user.type(
      screen.getByRole('textbox', { name: /メールアドレス/i }),
      'test@example.com',
    );

    expect(
      screen.getByText(
        /確認メールを送信しました。受信トレイを確認してください。/i,
      ),
    ).toBeInTheDocument();
  });

  test('409 Google 衝突 → REQ-302 案内文が表示される（AC-05）', () => {
    // Given: Google アカウント衝突エラーのモック
    const googleErrorMessage =
      'このメールアドレスは Google アカウントで登録済みです。Google でログインしてください。';
    const mockUseEmailSignup = createMockUseEmailSignup({
      status: 'error',
      errorMessage: googleErrorMessage,
    });

    // When: SignUpForm をレンダリング
    render(<SignUpForm />, { wrapper: buildWrapper(mockUseEmailSignup) });

    // Then: REQ-302 案内文（Google 誘導含む）が表示される
    expect(screen.getByText(googleErrorMessage)).toBeInTheDocument();
  });

  test('メール形式不正 → バリデーションエラーが表示される（REQ-304）', async () => {
    // Given: デフォルト状態のモック
    const mockUseEmailSignup = createMockUseEmailSignup();
    const user = userEvent.setup();

    // When: 不正なメール形式を入力して送信
    render(<SignUpForm />, { wrapper: buildWrapper(mockUseEmailSignup) });
    await user.type(
      screen.getByRole('textbox', { name: /メールアドレス/i }),
      'invalid-email',
    );
    await user.click(screen.getByRole('button', { name: /アカウントを作成/i }));

    // Then: メール形式エラーが表示される
    expect(
      screen.getByText(/メールアドレスの形式が正しくありません/i),
    ).toBeInTheDocument();
  });

  test('「ログインはこちら」リンクがホームページ（/）を指す', () => {
    // Given: デフォルト状態のモック
    const mockUseEmailSignup = createMockUseEmailSignup();

    // When: SignUpForm をレンダリング
    render(<SignUpForm />, { wrapper: buildWrapper(mockUseEmailSignup) });

    // Then: ログインリンクが / を指す
    const loginLink = screen.getByRole('link', { name: /ログインはこちら/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/');
  });

  test('送信中はフォームが無効化される', () => {
    // Given: isLoading=true のモック
    const mockUseEmailSignup = createMockUseEmailSignup({ isLoading: true });

    // When: ローディング中の SignUpForm をレンダリング
    render(<SignUpForm />, { wrapper: buildWrapper(mockUseEmailSignup) });

    // Then: サインアップボタンが無効化される
    expect(
      screen.getByRole('button', { name: /送信中|アカウントを作成/i }),
    ).toBeDisabled();
  });
});
