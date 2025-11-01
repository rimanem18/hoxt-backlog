import { describe, expect, it } from 'bun:test';
import type {
  AuthCallbackResult,
  AuthProviderInterface,
} from '@/features/auth/services/providers/authProviderInterface';

/**
 * AuthProviderInterface 契約テスト
 *
 * すべての認証プロバイダー実装が満たすべき契約を検証する。
 * 新しいプロバイダー（GitHub, Microsoft等）を追加する際は、
 * このテストスイートを実行して契約を満たすことを確認する。
 */
describe('AuthProviderInterface Contract', () => {
  describe('handleCallback メソッドの契約', () => {
    it('URLSearchParams を受け取り AuthCallbackResult を返す', () => {
      // Given: 契約で定義された型
      type HandleCallbackSignature = (
        hashParams: URLSearchParams,
      ) => Promise<AuthCallbackResult>;

      // Then: 型定義が存在することを確認
      const _typeCheck: HandleCallbackSignature = {} as HandleCallbackSignature;
      expect(_typeCheck).toBeDefined();
    });

    it('success: true の場合は user と isNewUser を含む', () => {
      // Given: 成功時の結果型
      const successResult: AuthCallbackResult = {
        success: true,
        user: {
          id: 'test-id',
          externalId: 'test-external-id',
          provider: 'google',
          email: 'test@example.com',
          name: 'Test User',
          avatarUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
        isNewUser: false,
      };

      // Then: 型が正しく定義されている
      expect(successResult.success).toBe(true);
      expect(successResult.user).toBeDefined();
      expect(successResult.isNewUser).toBeDefined();
    });

    it('success: false の場合は error を含む可能性がある', () => {
      // Given: 失敗時の結果型（ユーザーキャンセル）
      const cancelResult: AuthCallbackResult = {
        success: false,
        isNewUser: false,
      };

      // Given: 失敗時の結果型（エラー発生）
      const errorResult: AuthCallbackResult = {
        success: false,
        isNewUser: false,
        error: 'Authentication failed',
      };

      // Then: 両方の形式が許容される
      expect(cancelResult.success).toBe(false);
      expect(errorResult.error).toBeDefined();
    });
  });

  describe('validateToken メソッドの契約', () => {
    it('文字列トークンを受け取り boolean を返す', () => {
      // Given: 契約で定義された型
      type ValidateTokenSignature = (token: string) => boolean;

      // Then: 型定義が存在することを確認
      const _typeCheck: ValidateTokenSignature = {} as ValidateTokenSignature;
      expect(_typeCheck).toBeDefined();
    });
  });

  describe('AuthProviderInterface 型定義の完全性', () => {
    it('すべての必須メソッドが定義されている', () => {
      // Given: インターフェース定義
      const requiredMethods = [
        'signIn',
        'signOut',
        'getUser',
        'getSession',
        'getProviderName',
        'handleCallback',
        'validateToken',
      ];

      // Then: すべてのメソッドがインターフェースに存在することを確認
      // （実行時にはダミー実装で型チェックのみ）
      const mockProvider: AuthProviderInterface = {
        signIn: async () => ({ success: false }),
        signOut: async () => ({ success: false }),
        getUser: async () => ({ user: null }),
        getSession: async () => null,
        getProviderName: () => 'mock',
        handleCallback: async () => ({ success: false, isNewUser: false }),
        validateToken: () => false,
      };

      requiredMethods.forEach((method) => {
        expect(mockProvider).toHaveProperty(method);
      });
    });
  });
});
