import { beforeEach, describe, expect, it } from 'bun:test';
import { MockAuthProvider } from '@/features/auth/services/providers/mockAuthProvider';
import { createMockJwt } from '@/testing/jwtFactory';

describe('MockAuthProvider', () => {
  let mockProvider: MockAuthProvider;

  beforeEach(() => {
    mockProvider = new MockAuthProvider();
  });

  describe('validateToken', () => {
    it('モックトークンの場合は true を返す', () => {
      // Given: モックトークン
      const mockToken = 'mock_access_token';

      // When: トークン検証を実行
      const result = mockProvider.validateToken(mockToken);

      // Then: true が返される
      expect(result).toBe(true);
    });

    it('通常のトークンの場合は false を返す', async () => {
      // Given: 通常のトークン
      const realToken = await createMockJwt({ sub: '1234567890' });

      // When: トークン検証を実行
      const result = mockProvider.validateToken(realToken);

      // Then: false が返される
      expect(result).toBe(false);
    });

    it('空文字列の場合は false を返す', () => {
      // Given: 空文字列
      const emptyToken = '';

      // When: トークン検証を実行
      const result = mockProvider.validateToken(emptyToken);

      // Then: false が返される
      expect(result).toBe(false);
    });
  });

  describe('handleCallback', () => {
    it('モックトークンでコールバック処理が成功する', async () => {
      // Given: モックトークンを含むURLパラメータ
      const hashParams = new URLSearchParams('access_token=mock_access_token');

      // When: コールバック処理を実行
      const result = await mockProvider.handleCallback(hashParams);

      // Then: 成功結果とモックユーザー情報が返される
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('mock-user-id');
      expect(result.user?.email).toBe('test.user@example.com');
      expect(result.user?.name).toBe('Test User');
      expect(result.user?.provider).toBe('google');
      expect(result.isNewUser).toBe(false);
    });

    it('JWT形式のトークンでは失敗する（モックトークンのみ許可）', async () => {
      // Given: JWT形式のトークン（モックではない）
      const jwtToken = await createMockJwt({ sub: '1234567890' });
      const hashParams = new URLSearchParams(`access_token=${jwtToken}`);

      // When & Then: モックトークンではないため失敗
      await expect(mockProvider.handleCallback(hashParams)).rejects.toThrow(
        '無効な認証トークンです',
      );
    });

    it('アクセストークンが存在しない場合はエラーが発生する', async () => {
      // Given: トークンなしのパラメータ
      const hashParams = new URLSearchParams('error=access_denied');

      // When & Then: エラーが発生
      await expect(mockProvider.handleCallback(hashParams)).rejects.toThrow();
    });
  });

  describe('signIn', () => {
    it('URLフラグメントにモックトークンを設定する', async () => {
      // Given: 初期状態
      window.location.hash = '';

      // When: サインイン処理を実行
      await mockProvider.signIn();

      // Then: URLフラグメントにモックトークンが設定される
      expect(window.location.hash).toBe('#access_token=mock_access_token');
    });
  });

  describe('signOut', () => {
    it('何もせずに完了する（No-op）', async () => {
      // When: サインアウト処理を実行
      const result = await mockProvider.signOut();

      // Then: エラーが発生せず完了
      expect(result).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('プロバイダー名として "mock" を返す', () => {
      // When: プロバイダー名を取得
      const providerName = mockProvider.getProviderName();

      // Then: "mock" が返される
      expect(providerName).toBe('mock');
    });
  });
});
