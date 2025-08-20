/**
 * AuthProvider契約テスト
 * 
 * IAuthProviderインターフェースの契約（戻り値とエラーの仕様）をテスト。
 * 実装詳細に依存しない、インターフェース仕様の確認に特化。
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import type { IAuthProvider, JwtVerificationResult, JwtPayload, ExternalUserInfo } from '../../../../domain/services/IAuthProvider';
import { UserFactory } from '../authenticate-user/helpers/userFactory';
import { mock } from 'bun:test';

describe('AuthProvider契約テスト', () => {
  let authProvider: IAuthProvider;

  beforeEach(() => {
    authProvider = {
      verifyToken: mock(),
      getExternalUserInfo: mock(),
    };
  });

  describe('verifyToken契約', () => {
    test('有効なJWTで成功レスポンスの契約を満たす', async () => {
      // Given: 有効なJWT
      const validJwt = UserFactory.validJwt();
      const expectedPayload = UserFactory.jwtPayload();

      const mockResult: JwtVerificationResult = {
        valid: true,
        payload: expectedPayload,
      };

      (authProvider.verifyToken as any).mockResolvedValue(mockResult);

      // When: JWT検証を実行
      const result = await authProvider.verifyToken(validJwt);

      // Then: 成功レスポンスの契約を確認
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(result.valid).toBe(true);
      
      // 成功時はpayloadが必須
      expect(result.payload).toBeDefined();
      expect(typeof result.payload).toBe('object');
      
      // payloadの必須フィールド
      expect(typeof result.payload!.sub).toBe('string');
      expect(typeof result.payload!.email).toBe('string');
      expect(typeof result.payload!.iat).toBe('number');
      expect(typeof result.payload!.exp).toBe('number');
      
      // 失敗時のフィールドは存在しない
      expect(result.error).toBeUndefined();
    });

    test('無効なJWTで失敗レスポンスの契約を満たす', async () => {
      // Given: 無効なJWT
      const invalidJwt = 'invalid.jwt.token';
      const mockResult: JwtVerificationResult = {
        valid: false,
        error: 'Invalid signature',
      };

      (authProvider.verifyToken as any).mockResolvedValue(mockResult);

      // When: JWT検証を実行
      const result = await authProvider.verifyToken(invalidJwt);

      // Then: 失敗レスポンスの契約を確認
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(result.valid).toBe(false);
      
      // 失敗時はerrorが必須
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error!.length).toBeGreaterThan(0);
      
      // 成功時のフィールドは存在しない
      expect(result.payload).toBeUndefined();
    });

    test.each([
      ['空文字JWT', ''],
      ['null JWT', null as any],
      ['undefined JWT', undefined as any],
    ])('%s で適切にエラーを返す', async (_description, jwt: string) => {
      // Given: 不正な入力
      const mockResult: JwtVerificationResult = {
        valid: false,
        error: 'Invalid JWT format',
      };

      (authProvider.verifyToken as any).mockResolvedValue(mockResult);

      // When: 不正な入力でJWT検証を実行
      const result = await authProvider.verifyToken(jwt);

      // Then: エラーレスポンスの契約を満たす
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.payload).toBeUndefined();
    });

    test('Promiseを返すことの契約確認', () => {
      // Given: 任意のJWT
      const jwt = 'any.jwt.token';
      
      // Promiseを返すようにモック設定
      (authProvider.verifyToken as any).mockResolvedValue({
        valid: true,
        payload: UserFactory.jwtPayload(),
      });

      // When: メソッド呼び出し
      const result = authProvider.verifyToken(jwt);

      // Then: Promiseを返すことを確認
      expect(result).toBeInstanceOf(Promise);
      expect(typeof result.then).toBe('function');
      expect(typeof result.catch).toBe('function');
    });
  });

  describe('getExternalUserInfo契約', () => {
    test('有効なペイロードで外部ユーザー情報の契約を満たす', async () => {
      // Given: 有効なJWTペイロード
      const payload = UserFactory.jwtPayload();
      const mockUserInfo: ExternalUserInfo = {
        id: 'google_12345',
        provider: 'google',
        email: 'user@example.com',
        name: 'テストユーザー',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      (authProvider.getExternalUserInfo as any).mockResolvedValue(mockUserInfo);

      // When: 外部ユーザー情報を取得
      const result = await authProvider.getExternalUserInfo(payload);

      // Then: 外部ユーザー情報の契約を確認
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      // 必須フィールドの型確認
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
      
      expect(typeof result.provider).toBe('string');
      expect(['google', 'github', 'facebook'].includes(result.provider)).toBe(true);
      
      expect(typeof result.email).toBe('string');
      expect(result.email).toMatch(/@/); // 簡単なemail形式確認
      
      expect(typeof result.name).toBe('string');
      expect(result.name.length).toBeGreaterThan(0);
      
      // オプションフィールド
      if (result.avatarUrl) {
        expect(typeof result.avatarUrl).toBe('string');
        expect(result.avatarUrl).toMatch(/^https?:\/\//); // URL形式確認
      }
    });

    test.each([
      ['Googleプロバイダー', 'google'],
      ['GitHubプロバイダー', 'github'], 
      ['Facebookプロバイダー', 'facebook'],
    ])('%s で適切なプロバイダー情報を返す', async (_description, provider) => {
      // Given: プロバイダー別のペイロード
      const payload = UserFactory.jwtPayload(
        `${provider}_user_123`,
        `user@${provider}.com`,
        'プロバイダーテストユーザー',
        provider as any
      );

      const mockUserInfo = UserFactory.externalUserInfo(
        `${provider}_user_123`,
        `user@${provider}.com`,
        'プロバイダーテストユーザー',
        provider as any
      );

      (authProvider.getExternalUserInfo as any).mockResolvedValue(mockUserInfo);

      // When: プロバイダー別ユーザー情報を取得
      const result = await authProvider.getExternalUserInfo(payload);

      // Then: プロバイダー情報の契約を満たす
      expect(result.provider).toBe(provider);
      expect(result.id).toContain(provider);
      expect(result.email).toContain(provider);
    });

    test('不正なペイロードでエラーをスローする', async () => {
      // Given: 不正なペイロード
      const invalidPayloads = [
        null as any,
        undefined as any,
        {} as any,
        { sub: '', email: '' } as any,
      ];

      for (const invalidPayload of invalidPayloads) {
        // エラーをスローするようにモック設定
        (authProvider.getExternalUserInfo as any).mockRejectedValue(
          new Error('Invalid payload format')
        );

        // When & Then: 不正なペイロードでエラーがスローされる
        await expect(authProvider.getExternalUserInfo(invalidPayload)).rejects.toThrow();
      }
    });

    test('Promiseを返すことの契約確認', () => {
      // Given: 任意のペイロード
      const payload = UserFactory.jwtPayload();
      
      // Promiseを返すようにモック設定
      (authProvider.getExternalUserInfo as any).mockResolvedValue(
        UserFactory.externalUserInfo()
      );

      // When: メソッド呼び出し
      const result = authProvider.getExternalUserInfo(payload);

      // Then: Promiseを返すことを確認
      expect(result).toBeInstanceOf(Promise);
      expect(typeof result.then).toBe('function');
      expect(typeof result.catch).toBe('function');
    });
  });

  describe('エラーハンドリング契約', () => {
    test('ネットワークエラー時の契約確認', async () => {
      // Given: ネットワークエラーシナリオ
      const jwt = UserFactory.validJwt();
      const networkError = new Error('Network connection failed');

      (authProvider.verifyToken as any).mockRejectedValue(networkError);

      // When & Then: ネットワークエラーで例外がスローされる
      await expect(authProvider.verifyToken(jwt)).rejects.toThrow('Network connection failed');
    });

    test('タイムアウトエラー時の契約確認', async () => {
      // Given: タイムアウトシナリオ
      const payload = UserFactory.jwtPayload();
      const timeoutError = new Error('Request timeout');

      (authProvider.getExternalUserInfo as any).mockRejectedValue(timeoutError);

      // When & Then: タイムアウトで例外がスローされる
      await expect(authProvider.getExternalUserInfo(payload)).rejects.toThrow('Request timeout');
    });

    test('レート制限エラー時の契約確認', async () => {
      // Given: レート制限シナリオ
      const jwt = UserFactory.validJwt();
      const rateLimitError = new Error('Rate limit exceeded');

      (authProvider.verifyToken as any).mockRejectedValue(rateLimitError);

      // When & Then: レート制限で例外がスローされる
      await expect(authProvider.verifyToken(jwt)).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('型安全性契約', () => {
    test('JwtVerificationResultの型定義確認', () => {
      // Given: 成功・失敗の両パターン
      const successResult: JwtVerificationResult = {
        valid: true,
        payload: UserFactory.jwtPayload(),
      };

      const failureResult: JwtVerificationResult = {
        valid: false,
        error: 'Verification failed',
      };

      // Then: TypeScriptの型システムで検証される
      expect(successResult.valid).toBe(true);
      expect(successResult.payload).toBeDefined();
      expect(successResult.error).toBeUndefined();

      expect(failureResult.valid).toBe(false);
      expect(failureResult.error).toBeDefined();
      expect(failureResult.payload).toBeUndefined();
    });

    test('JwtPayloadの型定義確認', () => {
      // Given: 完全なJWTペイロード
      const payload: JwtPayload = {
        sub: 'google_12345',
        email: 'user@example.com',
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
        user_metadata: {
          name: 'テストユーザー',
          email: 'user@example.com',
          full_name: 'テストユーザー',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        iss: 'https://supabase.co',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // Then: 必須フィールドが存在する
      expect(payload.sub).toBeDefined();
      expect(payload.email).toBeDefined();
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      
      // オプションフィールドの確認
      expect(payload.app_metadata).toBeDefined();
      expect(payload.user_metadata).toBeDefined();
      expect(payload.iss).toBeDefined();
    });

    test('ExternalUserInfoの型定義確認', () => {
      // Given: 完全な外部ユーザー情報
      const userInfo: ExternalUserInfo = {
        id: 'google_12345',
        provider: 'google',
        email: 'user@example.com',
        name: 'テストユーザー',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      // Then: 必須フィールドが存在する
      expect(userInfo.id).toBeDefined();
      expect(userInfo.provider).toBeDefined();
      expect(userInfo.email).toBeDefined();
      expect(userInfo.name).toBeDefined();
      
      // オプションフィールドの確認
      expect(userInfo.avatarUrl).toBeDefined();
    });
  });
});