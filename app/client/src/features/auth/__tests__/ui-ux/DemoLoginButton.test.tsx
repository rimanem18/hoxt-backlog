import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DemoLoginButton } from '@/features/auth/components/DemoLoginButton';

const demoCredentials = {
  email: 'demo@example.com',
  password: 'demo_password',
};

describe('DemoLoginButton', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('資格情報が渡されると「デモユーザーとしてログイン」ボタンが表示される', () => {
    // Given: 有効なデモ資格情報
    const mockSignIn = mock(async () => {});

    // When: DemoLoginButton をレンダリング
    render(
      <DemoLoginButton
        signIn={mockSignIn}
        isLoading={false}
        credentials={demoCredentials}
      />,
    );

    // Then: デモログインボタンが表示される
    expect(
      screen.getByRole('button', { name: /デモユーザーとしてログイン/i }),
    ).toBeInTheDocument();
  });

  test('ボタン押下でデモ資格情報を引数にsignInが呼ばれる', async () => {
    // Given: 有効なデモ資格情報とユーザー操作
    const mockSignIn = mock(async () => {});
    const user = userEvent.setup();

    render(
      <DemoLoginButton
        signIn={mockSignIn}
        isLoading={false}
        credentials={demoCredentials}
      />,
    );

    // When: デモログインボタンを押下
    await user.click(
      screen.getByRole('button', { name: /デモユーザーとしてログイン/i }),
    );

    // Then: デモ資格情報でsignInが1回呼ばれる
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith(
      'demo@example.com',
      'demo_password',
    );
  });

  test('isLoadingがtrueのときボタンが無効化され、ラベルが変わる', () => {
    // Given: ローディング中の状態
    const mockSignIn = mock(async () => {});

    // When: isLoading=true でレンダリング
    render(
      <DemoLoginButton
        signIn={mockSignIn}
        isLoading={true}
        credentials={demoCredentials}
      />,
    );

    // Then: ボタンが無効化され、ローディングラベルが表示される
    const button = screen.getByRole('button', { name: /ログイン中/i });
    expect(button).toBeDisabled();
  });

  test('credentialsがnullのときボタンが表示されない', () => {
    // Given: デモ資格情報が未設定（環境変数未設定相当）
    const mockSignIn = mock(async () => {});

    // When: credentials=null でレンダリング
    render(
      <DemoLoginButton
        signIn={mockSignIn}
        isLoading={false}
        credentials={null}
      />,
    );

    // Then: デモログインボタンが描画されない
    expect(
      screen.queryByRole('button', { name: /デモユーザーとしてログイン/i }),
    ).not.toBeInTheDocument();
  });
});
