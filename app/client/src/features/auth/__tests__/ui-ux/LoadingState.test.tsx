/**
 * UI/UXテスト: ローディング状態管理テスト
 * REQ-UI-001対応 - 認証処理中のローディングUI表示と操作制御確認
 */

import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { LoginButton } from '@/features/auth/components/LoginButton';
import { createMockAuthService } from '@/features/auth/services/__tests__/mockAuthService';

describe('LoginButton ローディング状態管理', () => {
  test('認証処理中のローディングUI表示と操作制御確認', async () => {
    // Given: 3秒間の遅延を持つモック認証サービス
    const mockAuthService = createMockAuthService({
      shouldSucceed: true,
      delay: 3000,
    });

    // When: LoginButtonをレンダリング
    render(<LoginButton provider="google" authService={mockAuthService} />);

    const loginButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    const user = userEvent.setup();

    // Then: 初期状態でボタンが有効で適切なラベルが表示される
    expect(loginButton).not.toBeDisabled();
    expect(loginButton).toHaveTextContent('Googleでログイン');
    expect(loginButton).not.toHaveAttribute('aria-busy', 'true');

    // When: ログインボタンをクリック
    await user.click(loginButton);

    // Then: ローディング状態の適切なUI制御が行われる
    const loadingButton = screen.getByRole('button', { name: '認証中...' });

    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveTextContent('認証中...');
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(loadingButton).toHaveAttribute('aria-label', '認証中...');
    expect(
      screen.getByRole('progressbar', { name: '認証処理中' }),
    ).toBeInTheDocument();
  });

  test('ダブルクリック防止機能の確認', async () => {
    // Given: 1秒の遅延を持つモック認証サービス
    const mockAuthService = createMockAuthService({
      shouldSucceed: true,
      delay: 1000,
    });

    // When: LoginButtonをレンダリングして連続クリック実行
    render(<LoginButton provider="google" authService={mockAuthService} />);

    const loginButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    const user = userEvent.setup();

    // 0.3秒間隔で2回クリックして重複実行を試行
    await user.click(loginButton);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await user.click(loginButton);

    // Then: 認証処理が1回のみ実行される
    expect(mockAuthService.mockSignInWithOAuth).toHaveBeenCalledTimes(1);
  });

  // TODO: 長時間処理対応メッセージ機能の実装時にテストを追加
});
