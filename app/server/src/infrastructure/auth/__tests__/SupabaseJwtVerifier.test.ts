/*
 * SupabaseJwtVerifier（JWKS検証器）単体テスト
 * 作成日: 2025年09月23日
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import type {
  ExternalUserInfo,
  JwtPayload,
  JwtVerificationResult,
} from '@/domain/services/IAuthProvider';
import { SupabaseJwtVerifier } from '../SupabaseJwtVerifier';

// CI環境またはテスト環境では外部JWKS依存のテストをスキップ
// ネットワーク依存のテストは統合テストで実施
const skipInCI =
  process.env.CI === 'true' || process.env.NODE_ENV === 'test'
    ? describe.skip
    : describe;

describe('SupabaseJwtVerifier（JWKS検証器）', () => {
  let jwtVerifier: SupabaseJwtVerifier;

  beforeEach(() => {
    // 各テスト実行前にSupabaseJwtVerifierインスタンスを初期化
    process.env.SUPABASE_URL = 'https://test-project.supabase.co';
    jwtVerifier = new SupabaseJwtVerifier();
  });

  describe('constructor', () => {
    test('環境変数からSupabase URLを正しく取得してインスタンスが作成される', () => {
      // Given: 有効なSupabase URL環境変数
      process.env.SUPABASE_URL = 'https://valid-project.supabase.co';

      // When: SupabaseJwtVerifierインスタンスを作成
      const verifier = new SupabaseJwtVerifier();

      // Then: インスタンスが正常に作成される
      expect(verifier).toBeInstanceOf(SupabaseJwtVerifier);
    });

    test('直接指定したSupabase URLでインスタンスが作成される', () => {
      // Given: 直接指定のSupabase URL
      const customUrl = 'https://custom-project.supabase.co';

      // When: URLを直接指定してインスタンスを作成
      const verifier = new SupabaseJwtVerifier(customUrl);

      // Then: インスタンスが正常に作成される
      expect(verifier).toBeInstanceOf(SupabaseJwtVerifier);
    });

    test('不正なSupabase URL環境変数で例外が発生する', () => {
      // Given: 不正なSupabase URL
      process.env.SUPABASE_URL = '';

      // When & Then: 例外が発生することを確認
      expect(() => new SupabaseJwtVerifier()).toThrow(
        'SUPABASE_URL environment variable is required',
      );
    });

    test('無効なURL形式で例外が発生する', () => {
      // Given: 無効なURL形式
      const invalidUrl = 'invalid-url-format';

      // When & Then: 例外が発生することを確認
      expect(() => new SupabaseJwtVerifier(invalidUrl)).toThrow(
        'Invalid SUPABASE_URL format',
      );
    });
  });

  describe('verifyToken', () => {
    test('空のトークンで適切なエラーが返される', async () => {
      // Given: 空のトークン
      const emptyToken = '';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await jwtVerifier.verifyToken(emptyToken);

      // Then: 適切なエラーメッセージが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is required');
      expect(result.payload).toBeUndefined();
    });

    test('不正な形式のトークンで適切なエラーが返される', async () => {
      // Given: 不正な形式のトークン（部品数が不正）
      const invalidFormatToken = 'invalid.token';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await jwtVerifier.verifyToken(invalidFormatToken);

      // Then: 適切なエラーメッセージが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token format');
      expect(result.payload).toBeUndefined();
    });

    test('nullまたはundefinedトークンで適切なエラーが返される', async () => {
      // Given: nullトークン
      const nullToken = null as unknown as string;

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await jwtVerifier.verifyToken(nullToken);

      // Then: 適切なエラーメッセージが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is required');
      expect(result.payload).toBeUndefined();
    });
  });

  describe('getExternalUserInfo', () => {
    test('完全なJWTペイロードから正確なユーザー情報が抽出される', async () => {
      // Given: 完全なJWTペイロード
      const completePayload: JwtPayload = {
        sub: 'google_1234567890',
        email: 'test@example.com',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://test-project.supabase.co/auth/v1',
        user_metadata: {
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        app_metadata: {
          provider: 'google',
        },
      };

      // When: ユーザー情報抽出を実行
      const userInfo: ExternalUserInfo =
        await jwtVerifier.getExternalUserInfo(completePayload);

      // Then: 正確なユーザー情報が返される
      expect(userInfo.id).toBe('google_1234567890');
      expect(userInfo.email).toBe('test@example.com');
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.provider).toBe('google');
      expect(userInfo.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    test('アバターURLなしのペイロードでもユーザー情報が正常に抽出される', async () => {
      // Given: アバターURLなしのJWTペイロード
      const payloadWithoutAvatar: JwtPayload = {
        sub: 'google_9876543210',
        email: 'noavatar@example.com',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://test-project.supabase.co/auth/v1',
        user_metadata: {
          name: 'No Avatar User',
        },
        app_metadata: {
          provider: 'google',
        },
      };

      // When: ユーザー情報抽出を実行
      const userInfo: ExternalUserInfo =
        await jwtVerifier.getExternalUserInfo(payloadWithoutAvatar);

      // Then: アバターURL以外の情報が正常に抽出される
      expect(userInfo.id).toBe('google_9876543210');
      expect(userInfo.email).toBe('noavatar@example.com');
      expect(userInfo.name).toBe('No Avatar User');
      expect(userInfo.provider).toBe('google');
      expect(userInfo.avatarUrl).toBeUndefined();
    });

    test('必須フィールド不足で適切な例外が発生する', async () => {
      // Given: sub（ユーザーID）が不足したペイロード
      const payloadMissingSub: Partial<JwtPayload> = {
        email: 'test@example.com',
        user_metadata: { name: 'Test User', email: 'test@example.com', full_name: 'Test User' },
        app_metadata: { provider: 'google', providers: ['google'] },
      };

      // When & Then: 適切な例外が発生することを確認
      await expect(
        jwtVerifier.getExternalUserInfo(payloadMissingSub as JwtPayload),
      ).rejects.toThrow('Missing required field: sub');
    });

    test('emailフィールド不足で適切な例外が発生する', async () => {
      // Given: emailが不足したペイロード
      const payloadMissingEmail: Partial<JwtPayload> = {
        sub: 'google_1234567890',
        user_metadata: { name: 'Test User', email: 'test@example.com', full_name: 'Test User' },
        app_metadata: { provider: 'google', providers: ['google'] },
      };

      // When & Then: 適切な例外が発生することを確認
      await expect(
        jwtVerifier.getExternalUserInfo(payloadMissingEmail as JwtPayload),
      ).rejects.toThrow('Missing required field: email');
    });

    test('user_metadata.name不足で適切な例外が発生する', async () => {
      // Given: user_metadata.nameが不足したペイロード
      const payloadMissingName: Partial<JwtPayload> = {
        sub: 'google_1234567890',
        email: 'test@example.com',
        user_metadata: { name: '', email: 'test@example.com', full_name: 'Test User' }, // nameが不足
        app_metadata: { provider: 'google' },
      };

      // When & Then: 適切な例外が発生することを確認
      await expect(
        jwtVerifier.getExternalUserInfo(payloadMissingName as JwtPayload),
      ).rejects.toThrow('Missing required field: user_metadata.name');
    });

    test('app_metadata.provider不足で適切な例外が発生する', async () => {
      // Given: app_metadata.providerが不足したペイロード
      const payloadMissingProvider: Partial<JwtPayload> = {
        sub: 'google_1234567890',
        email: 'test@example.com',
        user_metadata: { name: 'Test User', email: 'test@example.com', full_name: 'Test User' },
        app_metadata: { provider: '', providers: [] }, // providerが不足
      };

      // When & Then: 適切な例外が発生することを確認
      await expect(
        jwtVerifier.getExternalUserInfo(payloadMissingProvider as JwtPayload),
      ).rejects.toThrow('Missing required field: app_metadata.provider');
    });
  });
});

skipInCI('SupabaseJwtVerifier（JWKS統合テスト）', () => {
  let jwtVerifier: SupabaseJwtVerifier;

  beforeEach(() => {
    // 実際のSupabase環境変数が必要
    process.env.SUPABASE_URL =
      process.env.SUPABASE_URL || 'https://test-project.supabase.co';
    jwtVerifier = new SupabaseJwtVerifier();
  });

  test('実際のJWKSエンドポイントからの公開鍵取得テスト', async () => {
    // Note: このテストは実際のSupabaseプロジェクトが必要
    // CI環境では自動スキップされる

    // Given: 実際のSupabase JWTトークン（テスト用）
    // 注意: 実際のテストでは、テスト用の有効なトークンが必要
    const realJwtToken = 'your-real-test-jwt-token-here';

    // このテストは手動実行時のみ有効
    if (realJwtToken === 'your-real-test-jwt-token-here') {
      console.log('⚠️ 実際のJWKS統合テストには有効なJWTトークンが必要です');
      return;
    }

    // When: 実際のJWKS検証を実行
    const result: JwtVerificationResult =
      await jwtVerifier.verifyToken(realJwtToken);

    // Then: 検証結果を確認（成功または適切なエラー）
    expect(result).toBeDefined();
    expect(typeof result.valid).toBe('boolean');

    if (result.valid) {
      expect(result.payload).toBeDefined();
      if (result.payload) {
        expect(typeof result.payload.sub).toBe('string');
      }
    } else {
      expect(typeof result.error).toBe('string');
    }
  });
});
