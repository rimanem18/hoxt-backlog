import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { GoogleLoginButton } from '../components/GoogleLoginButton';

const mockSignInWithOAuth = mock(() =>
  Promise.resolve({ data: null, error: null }),
);

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  },
}));

describe('GoogleLoginButton', () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockClear();
  });

  afterEach(() => {
    mockSignInWithOAuth.mockClear();
  });

  test('Googleログインボタンをクリックするとサインイン処理が開始される', async () => {
    // Given: 未認証状態でGoogleLoginButtonコンポーネントをレンダリング
    render(<GoogleLoginButton />);

    // When: Googleログインボタンをクリック
    const loginButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    expect(loginButton).toBeTruthy();

    fireEvent.click(loginButton);

    // Then: Supabase AuthのsignInWithOAuth関数が正しい引数で呼び出される
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.any(String),
      },
    });
  });
});
