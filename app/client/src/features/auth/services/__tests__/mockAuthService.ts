/**
 * テスト専用: 認証サービスモック実装
 * プロダクションコードから分離されたテスト用モック機能
 */

import { mock } from 'bun:test';
import type { Provider } from '@supabase/supabase-js';
import type {
  AuthOptions,
  AuthResponse,
  AuthServiceInterface,
} from '../authService';

/**
 * テスト用モック認証サービス（呼び出し回数チェック付き）
 */
export interface MockAuthService extends AuthServiceInterface {
  /** モック関数（呼び出し回数確認用） */
  mockSignInWithOAuth: import('bun:test').Mock<
    (provider: Provider, options?: AuthOptions) => Promise<AuthResponse>
  >;
}

/**
 * テスト用モック認証サービスファクトリー
 * DIパターンによりテスト分離を実現し、supabaseへの直接依存を排除
 */
export const createMockAuthService = (config?: {
  shouldSucceed?: boolean;
  delay?: number;
  mockError?: string;
}): MockAuthService => {
  const { shouldSucceed = true, delay = 0, mockError } = config ?? {};

  const mockSignInWithOAuth = mock(async (): Promise<AuthResponse> => {
    // 遅延をシミュレート
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // エラーケースのシミュレート
    if (!shouldSucceed) {
      return {
        data: { user: null, session: null },
        error: new Error(mockError || 'Mock authentication failed'),
      };
    }

    // 成功ケースのシミュレート
    return {
      data: { user: null, session: null },
      error: null,
    };
  });

  return {
    signInWithOAuth: mockSignInWithOAuth,
    mockSignInWithOAuth,
  };
};
