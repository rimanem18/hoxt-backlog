/**
 * テスト専用: 認証サービスモック実装
 * プロダクションコードから分離されたテスト用モック機能
 */

import { mock } from 'bun:test';
import type { Provider } from '@supabase/supabase-js';
import type { User } from '@/packages/shared-schemas/src/auth';
import type {
  AuthOptions,
  AuthResponse,
  AuthServiceInterface,
  RequestPasswordResetResult,
  SignupResult,
} from '../authService';
import type { SignInResult } from '../providers/emailPasswordAuthProvider';

/**
 * テスト用モック認証サービス（呼び出し回数チェック付き）
 */
export interface MockAuthService extends AuthServiceInterface {
  /** モック関数（呼び出し回数確認用） */
  mockSignInWithOAuth: import('bun:test').Mock<
    (provider: Provider, options?: AuthOptions) => Promise<AuthResponse>
  >;
  mockSignInWithEmailPassword: import('bun:test').Mock<
    (email: string, password: string) => Promise<SignInResult>
  >;
  mockVerifySession: import('bun:test').Mock<
    (token: string) => Promise<{ user: User; isNewUser: boolean }>
  >;
  mockSignup: import('bun:test').Mock<
    (email: string, password: string) => Promise<SignupResult>
  >;
  mockRequestPasswordReset: import('bun:test').Mock<
    (email: string, redirectTo: string) => Promise<RequestPasswordResetResult>
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

  const mockSignInWithEmailPassword = mock(
    async (_email: string, _password: string): Promise<SignInResult> => {
      if (!shouldSucceed) {
        return {
          success: false,
          errorMessage: mockError || 'Mock authentication failed',
        };
      }

      // セッションなしの成功（テスト側で必要に応じてオーバーライド）
      return {
        success: false,
        errorMessage: 'Not implemented in default mock',
      };
    },
  );

  const mockVerifySession = mock(
    async (_token: string): Promise<{ user: User; isNewUser: boolean }> => {
      throw new Error('verifySession is not implemented in default mock');
    },
  );

  const mockSignup = mock(
    async (_email: string, _password: string): Promise<SignupResult> => ({
      status: 'pending_confirmation',
    }),
  );

  const mockRequestPasswordReset = mock(
    async (
      _email: string,
      _redirectTo: string,
    ): Promise<RequestPasswordResetResult> => ({
      status: 'sent',
    }),
  );

  return {
    signInWithOAuth: mockSignInWithOAuth,
    mockSignInWithOAuth,
    signInWithEmailPassword: mockSignInWithEmailPassword,
    mockSignInWithEmailPassword,
    verifySession: mockVerifySession,
    mockVerifySession,
    signup: mockSignup,
    mockSignup,
    requestPasswordReset: mockRequestPasswordReset,
    mockRequestPasswordReset,
  };
};
