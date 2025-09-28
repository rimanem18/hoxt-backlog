/*
 * MockJwtVerifier（テスト用モック検証器）単体テスト
 * 作成日: 2025年09月23日
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import type {
  ExternalUserInfo,
  JwtPayload,
  JwtVerificationResult,
} from '@/domain/services/IAuthProvider';
import {
  MockJwtVerifier,
  MockJwtVerifierFactory,
} from '../__tests__/MockJwtVerifier';

describe('MockJwtVerifier（テスト用モック検証器）', () => {
  describe('constructor', () => {
    test('デフォルト設定でインスタンスが作成される', () => {
      // When: デフォルト設定でインスタンスを作成
      const mockVerifier = new MockJwtVerifier();

      // Then: インスタンスが正常に作成される
      expect(mockVerifier).toBeInstanceOf(MockJwtVerifier);
    });

    test('カスタム設定でインスタンスが作成される', () => {
      // Given: カスタム設定
      const customOptions = {
        shouldSucceed: false,
        customError: 'カスタムエラーメッセージ',
      };

      // When: カスタム設定でインスタンスを作成
      const mockVerifier = new MockJwtVerifier(customOptions);

      // Then: インスタンスが正常に作成される
      expect(mockVerifier).toBeInstanceOf(MockJwtVerifier);
    });

    test('本番環境での使用時に例外が発生する', () => {
      // Given: 本番環境設定
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        // When & Then: 例外が発生することを確認
        expect(() => new MockJwtVerifier()).toThrow(
          'MockJwtVerifier cannot be used in production environment',
        );
      } finally {
        // Cleanup: 環境変数を元に戻す
        if (originalEnv !== undefined) {
          process.env.NODE_ENV = originalEnv;
        } else {
          delete process.env.NODE_ENV;
        }
      }
    });
  });

  describe('verifyToken', () => {
    let successfulVerifier: MockJwtVerifier;
    let failingVerifier: MockJwtVerifier;

    beforeEach(() => {
      successfulVerifier = new MockJwtVerifier({ shouldSucceed: true });
      failingVerifier = new MockJwtVerifier({ shouldSucceed: false });
    });

    test('成功設定で有効なトークン検証結果が返される', async () => {
      // Given: 有効なテストトークン
      const validToken = 'mock-valid-jwt-token';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await successfulVerifier.verifyToken(validToken);

      // Then: 成功結果が返される
      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.error).toBeUndefined();

      // デフォルトペイロードの内容確認
      expect(result.payload).toBeDefined();
      if (result.payload) {
        expect(result.payload.sub).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(result.payload.email).toBe('test@example.com');
        expect(result.payload.aud).toBe('authenticated');
        expect(result.payload.iss).toBe('https://test.supabase.co/auth/v1');
        expect(result.payload.user_metadata.name).toBe('Test User');
        expect(result.payload.app_metadata.provider).toBe('google');
      }
    });

    test('カスタムペイロードで指定された内容が返される', async () => {
      // Given: カスタムペイロード設定
      const customPayload: JwtPayload = {
        sub: 'custom-user-456',
        email: 'custom@example.com',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 7200, // 2時間後
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://custom.supabase.co/auth/v1',
        user_metadata: {
          name: 'Custom User',
          avatar_url: 'https://custom.com/avatar.jpg',
          email: 'custom@example.com',
          full_name: 'Custom User',
        },
        app_metadata: {
          provider: 'github',
          providers: ['github'],
        },
      };

      const customVerifier = new MockJwtVerifier({
        shouldSucceed: true,
        customPayload,
      });

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await customVerifier.verifyToken('mock-token');

      // Then: カスタムペイロードが返される
      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(customPayload);
    });

    test('失敗設定でエラー結果が返される', async () => {
      // Given: 無効なテストトークン
      const invalidToken = 'mock-invalid-jwt-token';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await failingVerifier.verifyToken(invalidToken);

      // Then: 失敗結果が返される
      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toBe('Mock verification failed');
    });

    test('カスタムエラーメッセージが返される', async () => {
      // Given: カスタムエラー設定
      const customError = 'カスタム検証エラー';
      const customErrorVerifier = new MockJwtVerifier({
        shouldSucceed: false,
        customError,
      });

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await customErrorVerifier.verifyToken('mock-token');

      // Then: カスタムエラーメッセージが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe(customError);
    });

    test('空のトークンで適切なエラーが返される', async () => {
      // Given: 空のトークン
      const emptyToken = '';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await successfulVerifier.verifyToken(emptyToken);

      // Then: 適切なエラーメッセージが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is required');
    });

    test('空白のみのトークンで適切なエラーが返される', async () => {
      // Given: 空白のみのトークン
      const whitespaceToken = '   ';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await successfulVerifier.verifyToken(whitespaceToken);

      // Then: 適切なエラーメッセージが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is required');
    });
  });

  describe('getExternalUserInfo', () => {
    let mockVerifier: MockJwtVerifier;

    beforeEach(() => {
      mockVerifier = new MockJwtVerifier();
    });

    test('完全なJWTペイロードから正確なユーザー情報が抽出される', async () => {
      // Given: 完全なJWTペイロード
      const completePayload: JwtPayload = {
        sub: 'test-user-789',
        email: 'complete@example.com',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://test.supabase.co/auth/v1',
        user_metadata: {
          name: 'Complete User',
          avatar_url: 'https://example.com/complete-avatar.jpg',
        },
        app_metadata: {
          provider: 'google',
        },
      };

      // When: ユーザー情報抽出を実行
      const userInfo: ExternalUserInfo =
        await mockVerifier.getExternalUserInfo(completePayload);

      // Then: 正確なユーザー情報が返される
      expect(userInfo.id).toBe('test-user-789');
      expect(userInfo.email).toBe('complete@example.com');
      expect(userInfo.name).toBe('Complete User');
      expect(userInfo.provider).toBe('google');
      expect(userInfo.avatarUrl).toBe(
        'https://example.com/complete-avatar.jpg',
      );
    });

    test('アバターURLなしのペイロードでもユーザー情報が正常に抽出される', async () => {
      // Given: アバターURLなしのJWTペイロード
      const payloadWithoutAvatar: JwtPayload = {
        sub: 'test-user-456',
        email: 'noavatar@example.com',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://test.supabase.co/auth/v1',
        user_metadata: {
          name: 'No Avatar User',
        },
        app_metadata: {
          provider: 'github',
        },
      };

      // When: ユーザー情報抽出を実行
      const userInfo: ExternalUserInfo =
        await mockVerifier.getExternalUserInfo(payloadWithoutAvatar);

      // Then: アバターURL以外の情報が正常に抽出される
      expect(userInfo.id).toBe('test-user-456');
      expect(userInfo.email).toBe('noavatar@example.com');
      expect(userInfo.name).toBe('No Avatar User');
      expect(userInfo.provider).toBe('github');
      expect(userInfo.avatarUrl).toBeUndefined();
    });

    test('必須フィールド不足で適切な例外が発生する - sub', async () => {
      // Given: sub（ユーザーID）が不足したペイロード
      const payloadMissingSub: Partial<JwtPayload> = {
        email: 'test@example.com',
        user_metadata: {
          name: 'Test User',
          email: 'test@example.com',
          full_name: 'Test User',
        },
        app_metadata: { provider: 'google', providers: ['google'] },
      };

      // When & Then: 適切な例外が発生することを確認
      await expect(
        mockVerifier.getExternalUserInfo(payloadMissingSub as JwtPayload),
      ).rejects.toThrow('Missing required field: sub');
    });

    test('必須フィールド不足で適切な例外が発生する - email', async () => {
      // Given: emailが不足したペイロード
      const payloadMissingEmail: Partial<JwtPayload> = {
        sub: 'test-user-123',
        user_metadata: {
          name: 'Test User',
          email: 'test@example.com',
          full_name: 'Test User',
        },
        app_metadata: { provider: 'google', providers: ['google'] },
      };

      // When & Then: 適切な例外が発生することを確認
      await expect(
        mockVerifier.getExternalUserInfo(payloadMissingEmail as JwtPayload),
      ).rejects.toThrow('Missing required field: email');
    });
  });
});

describe('MockJwtVerifierFactory（ファクトリー関数群）', () => {
  test('成功パターンの検証器が正常に作成される', async () => {
    // When: 成功パターンの検証器を作成
    const successVerifier = MockJwtVerifierFactory.createSuccessfulVerifier();

    // Then: 成功結果が返される
    const result = await successVerifier.verifyToken('test-token');
    expect(result.valid).toBe(true);
    expect(result.payload).toBeDefined();
  });

  test('カスタムペイロード付き成功パターンの検証器が正常に作成される', async () => {
    // Given: カスタムペイロード
    const customPayload: JwtPayload = {
      sub: 'factory-user-123',
      email: 'factory@example.com',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      iss: 'https://factory.supabase.co/auth/v1',
      user_metadata: { name: 'Factory User' },
      app_metadata: { provider: 'factory' },
    };

    // When: カスタムペイロード付き成功パターンの検証器を作成
    const successVerifier =
      MockJwtVerifierFactory.createSuccessfulVerifier(customPayload);

    // Then: カスタムペイロードが返される
    const result = await successVerifier.verifyToken('test-token');
    expect(result.valid).toBe(true);
    expect(result.payload).toEqual(customPayload);
  });

  test('署名エラーパターンの検証器が正常に作成される', async () => {
    // When: 署名エラーパターンの検証器を作成
    const signatureErrorVerifier =
      MockJwtVerifierFactory.createSignatureErrorVerifier();

    // Then: 署名エラーが返される
    const result = await signatureErrorVerifier.verifyToken('test-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid signature');
  });

  test('トークン期限切れパターンの検証器が正常に作成される', async () => {
    // When: トークン期限切れパターンの検証器を作成
    const expiredTokenVerifier =
      MockJwtVerifierFactory.createExpiredTokenVerifier();

    // Then: 期限切れエラーが返される
    const result = await expiredTokenVerifier.verifyToken('test-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Token expired');
  });

  test('JWKS取得エラーパターンの検証器が正常に作成される', async () => {
    // When: JWKS取得エラーパターンの検証器を作成
    const jwksFetchErrorVerifier =
      MockJwtVerifierFactory.createJwksFetchErrorVerifier();

    // Then: JWKS取得エラーが返される
    const result = await jwksFetchErrorVerifier.verifyToken('test-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Failed to fetch JWKS');
  });

  test('無効フォーマットパターンの検証器が正常に作成される', async () => {
    // When: 無効フォーマットパターンの検証器を作成
    const invalidFormatVerifier =
      MockJwtVerifierFactory.createInvalidFormatVerifier();

    // Then: 無効フォーマットエラーが返される
    const result = await invalidFormatVerifier.verifyToken('test-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token format');
  });
});
