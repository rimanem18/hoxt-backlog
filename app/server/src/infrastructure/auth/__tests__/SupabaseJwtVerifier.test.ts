/*
 * SupabaseJwtVerifier（JWKS検証器）単体テスト
 * 作成日: 2025年09月23日
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type {
  ExternalUserInfo,
  JwtPayload,
  JwtVerificationResult,
} from '@/domain/services/IAuthProvider';
import { SupabaseJwtVerifier } from '../SupabaseJwtVerifier';
import {
  generateTestJwks,
  mockJwksFetch,
  mockJwksFetchFailure,
  mockJwksFetchWithRetry,
  mockJwksFetchWithTimeout,
  signTestToken,
} from './helpers/jwks-test-helper';

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

    test('pictureフィールドのみ提供される場合にavatarUrlが正しく設定される', async () => {
      // Given: avatar_urlなし、pictureフィールドあり
      const payloadWithPictureOnly: JwtPayload = {
        sub: 'google_picture_user',
        email: 'picture@example.com',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://test-project.supabase.co/auth/v1',
        user_metadata: {
          name: 'Picture User',
          picture: 'https://example.com/picture.jpg',
        },
        app_metadata: {
          provider: 'google',
        },
      };

      // When: ユーザー情報抽出を実行
      const userInfo: ExternalUserInfo = await jwtVerifier.getExternalUserInfo(
        payloadWithPictureOnly,
      );

      // Then: pictureフィールドからavatarUrlが設定される
      expect(userInfo.id).toBe('google_picture_user');
      expect(userInfo.email).toBe('picture@example.com');
      expect(userInfo.name).toBe('Picture User');
      expect(userInfo.provider).toBe('google');
      expect(userInfo.avatarUrl).toBe('https://example.com/picture.jpg');
    });

    test('avatar_urlとpictureの両方がある場合にavatar_urlが優先される', async () => {
      // Given: avatar_urlとpictureの両方あり
      const payloadWithBoth: JwtPayload = {
        sub: 'google_both_fields',
        email: 'both@example.com',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://test-project.supabase.co/auth/v1',
        user_metadata: {
          name: 'Both Fields User',
          avatar_url: 'https://example.com/avatar.jpg',
          picture: 'https://example.com/picture.jpg',
        },
        app_metadata: {
          provider: 'google',
        },
      };

      // When: ユーザー情報抽出を実行
      const userInfo: ExternalUserInfo =
        await jwtVerifier.getExternalUserInfo(payloadWithBoth);

      // Then: avatar_urlが優先される
      expect(userInfo.id).toBe('google_both_fields');
      expect(userInfo.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    test('必須フィールド不足で適切な例外が発生する', async () => {
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
        jwtVerifier.getExternalUserInfo(payloadMissingSub as JwtPayload),
      ).rejects.toThrow('Missing required field: sub');
    });

    test('emailフィールド不足で適切な例外が発生する', async () => {
      // Given: emailが不足したペイロード
      const payloadMissingEmail: Partial<JwtPayload> = {
        sub: 'google_1234567890',
        user_metadata: {
          name: 'Test User',
          email: 'test@example.com',
          full_name: 'Test User',
        },
        app_metadata: { provider: 'google', providers: ['google'] },
      };

      // When & Then: 適切な例外が発生することを確認
      await expect(
        jwtVerifier.getExternalUserInfo(payloadMissingEmail as JwtPayload),
      ).rejects.toThrow('Missing required field: email');
    });

    test('user_metadata.nameが空の場合、full_nameにフォールバックする', async () => {
      // Given: user_metadata.nameが空でfull_nameが存在するペイロード
      const payloadWithEmptyName: Partial<JwtPayload> = {
        sub: 'google_1234567890',
        email: 'test@example.com',
        user_metadata: {
          name: '',
          email: 'test@example.com',
          full_name: 'Test User',
        },
        app_metadata: { provider: 'google' },
      };

      // When: ユーザー情報を抽出
      const result = await jwtVerifier.getExternalUserInfo(
        payloadWithEmptyName as JwtPayload,
      );

      // Then: full_nameにフォールバックしてユーザー情報が取得される
      expect(result.name).toBe('Test User');
      expect(result.email).toBe('test@example.com');
    });

    test('app_metadata.provider不足で適切な例外が発生する', async () => {
      // Given: app_metadata.providerが不足したペイロード
      const payloadMissingProvider: Partial<JwtPayload> = {
        sub: 'google_1234567890',
        email: 'test@example.com',
        user_metadata: {
          name: 'Test User',
          email: 'test@example.com',
          full_name: 'Test User',
        },
        app_metadata: { provider: '', providers: [] }, // providerが不足
      };

      // When & Then: 適切な例外が発生することを確認
      await expect(
        jwtVerifier.getExternalUserInfo(payloadMissingProvider as JwtPayload),
      ).rejects.toThrow('Missing required field: app_metadata.provider');
    });
  });
});

describe('SupabaseJwtVerifier(JWKS検証テスト)', () => {
  let jwtVerifier: SupabaseJwtVerifier;
  let unmockFetch:
    | (() => void)
    | { unmock: () => void; getCallCount: () => number }
    | null = null;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://test-project.supabase.co';
  });

  afterEach(() => {
    if (unmockFetch) {
      if (typeof unmockFetch === 'function') {
        unmockFetch();
      } else {
        unmockFetch.unmock();
      }
      unmockFetch = null;
    }
  });

  describe('JWKS署名検証（正常系）', () => {
    test('有効な署名を持つトークンが正しく検証される', async () => {
      // Given: テスト用JWKS環境をセットアップ
      const jwksContext = await generateTestJwks();
      unmockFetch = mockJwksFetch(jwksContext.jwksJson);

      const testPayload = {
        sub: 'test-user-123',
        email: 'test@example.com',
        user_metadata: {
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        app_metadata: {
          provider: 'google',
        },
      };

      const validToken = await signTestToken(
        jwksContext.privateKey,
        testPayload,
        {
          issuer: 'https://test-project.supabase.co/auth/v1',
          audience: 'authenticated',
          expirationTime: '2h',
        },
      );

      jwtVerifier = new SupabaseJwtVerifier();

      // When: JWT検証を実行
      const result = await jwtVerifier.verifyToken(validToken);

      // Then: 検証が成功し、正しいペイロードが返される
      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe('test-user-123');
      expect(result.payload?.email).toBe('test@example.com');
      expect(result.error).toBeUndefined();
    });

    test('audience が配列の場合でも正しく処理される', async () => {
      // Given: audience配列を持つトークン
      const jwksContext = await generateTestJwks();
      unmockFetch = mockJwksFetch(jwksContext.jwksJson);

      const testPayload = {
        sub: 'test-user-456',
        email: 'array-aud@example.com',
        user_metadata: { name: 'Array Aud User' },
        app_metadata: { provider: 'google' },
      };

      const tokenWithArrayAud = await signTestToken(
        jwksContext.privateKey,
        testPayload,
        {
          issuer: 'https://test-project.supabase.co/auth/v1',
          audience: 'authenticated',
          expirationTime: '1h',
        },
      );

      jwtVerifier = new SupabaseJwtVerifier();

      // When: JWT検証を実行
      const result = await jwtVerifier.verifyToken(tokenWithArrayAud);

      // Then: audience が文字列として正規化される
      expect(result.valid).toBe(true);
      expect(result.payload?.aud).toBe('authenticated');
    });
  });

  describe('JWKS署名検証（異常系）', () => {
    test('署名が改ざんされたトークンで検証が失敗する', async () => {
      // Given: 異なる鍵で署名されたトークン
      const jwksContext = await generateTestJwks();
      unmockFetch = mockJwksFetch(jwksContext.jwksJson);

      const anotherKeyPair = await generateTestJwks();

      const tamperedToken = await signTestToken(
        anotherKeyPair.privateKey,
        {
          sub: 'attacker',
          email: 'attacker@example.com',
          user_metadata: { name: 'Attacker' },
          app_metadata: { provider: 'google' },
        },
        {
          issuer: 'https://test-project.supabase.co/auth/v1',
          audience: 'authenticated',
          expirationTime: '1h',
        },
      );

      jwtVerifier = new SupabaseJwtVerifier();

      // When: 改ざんされたトークンを検証
      const result = await jwtVerifier.verifyToken(tamperedToken);

      // Then: 署名検証エラーが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
      expect(result.payload).toBeUndefined();
    });

    test('期限切れのトークンで検証が失敗する', async () => {
      // Given: 期限切れのトークン
      const jwksContext = await generateTestJwks();
      unmockFetch = mockJwksFetch(jwksContext.jwksJson);

      const expiredToken = await signTestToken(
        jwksContext.privateKey,
        {
          sub: 'expired-user',
          email: 'expired@example.com',
          user_metadata: { name: 'Expired User' },
          app_metadata: { provider: 'google' },
        },
        {
          issuer: 'https://test-project.supabase.co/auth/v1',
          audience: 'authenticated',
          expirationTime: '-1h',
        },
      );

      jwtVerifier = new SupabaseJwtVerifier();

      // When: 期限切れトークンを検証
      const result = await jwtVerifier.verifyToken(expiredToken);

      // Then: 期限切れエラーが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(result.payload).toBeUndefined();
    });

    test('issuer が一致しないトークンで検証が失敗する', async () => {
      // Given: 不正なissuerを持つトークン
      const jwksContext = await generateTestJwks();
      unmockFetch = mockJwksFetch(jwksContext.jwksJson);

      const invalidIssuerToken = await signTestToken(
        jwksContext.privateKey,
        {
          sub: 'wrong-issuer-user',
          email: 'wrong@example.com',
          user_metadata: { name: 'Wrong Issuer' },
          app_metadata: { provider: 'google' },
        },
        {
          issuer: 'https://attacker.com/auth/v1',
          audience: 'authenticated',
          expirationTime: '1h',
        },
      );

      jwtVerifier = new SupabaseJwtVerifier();

      // When: 不正なissuerのトークンを検証
      const result = await jwtVerifier.verifyToken(invalidIssuerToken);

      // Then: issuer不一致エラーが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(result.payload).toBeUndefined();
    });

    test('audience が一致しないトークンで検証が失敗する', async () => {
      // Given: 不正なaudienceを持つトークン
      const jwksContext = await generateTestJwks();
      unmockFetch = mockJwksFetch(jwksContext.jwksJson);

      const invalidAudienceToken = await signTestToken(
        jwksContext.privateKey,
        {
          sub: 'wrong-aud-user',
          email: 'wrong-aud@example.com',
          user_metadata: { name: 'Wrong Audience' },
          app_metadata: { provider: 'google' },
        },
        {
          issuer: 'https://test-project.supabase.co/auth/v1',
          audience: 'unauthenticated',
          expirationTime: '1h',
        },
      );

      jwtVerifier = new SupabaseJwtVerifier();

      // When: 不正なaudienceのトークンを検証
      const result = await jwtVerifier.verifyToken(invalidAudienceToken);

      // Then: audience不一致エラーが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(result.payload).toBeUndefined();
    });
  });

  describe('JWKS取得エラー', () => {
    test('JWKS取得に失敗した場合に適切なエラーが返される', async () => {
      // Given: JWKS取得が失敗する環境
      unmockFetch = mockJwksFetchFailure('Network error');
      jwtVerifier = new SupabaseJwtVerifier();

      const jwksContext = await generateTestJwks();
      const validToken = await signTestToken(
        jwksContext.privateKey,
        {
          sub: 'network-error-user',
          email: 'network@example.com',
          user_metadata: { name: 'Network Error' },
          app_metadata: { provider: 'google' },
        },
        {
          issuer: 'https://test-project.supabase.co/auth/v1',
          audience: 'authenticated',
          expirationTime: '1h',
        },
      );

      // When: JWKS取得失敗環境でトークンを検証
      const result = await jwtVerifier.verifyToken(validToken);

      // Then: JWKS取得失敗エラーが返される
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network error during JWKS fetch');
      expect(result.payload).toBeUndefined();
    }, 10000);
  });

  describe('リトライ・タイムアウト機能', () => {
    afterEach(() => {
      if (unmockFetch) {
        if (typeof unmockFetch === 'function') {
          unmockFetch();
        } else {
          unmockFetch.unmock();
        }
        unmockFetch = null;
      }
    });

    test('ネットワークエラー時に最大3回リトライして成功する', async () => {
      // Given: 2回失敗した後に成功するJWKSフェッチ
      const jwksContext = await generateTestJwks();
      const retryMock = mockJwksFetchWithRetry(2, jwksContext.jwksJson);
      unmockFetch = retryMock;

      const testPayload = {
        sub: 'test-user-retry',
        email: 'retry@example.com',
        user_metadata: { name: 'Retry Test User' },
        app_metadata: { provider: 'google' },
      };

      const validToken = await signTestToken(
        jwksContext.privateKey,
        testPayload,
        {
          issuer: 'https://test-project.supabase.co/auth/v1',
          audience: 'authenticated',
          expirationTime: '2h',
        },
      );

      jwtVerifier = new SupabaseJwtVerifier();

      // When: JWT検証を実行
      const result = await jwtVerifier.verifyToken(validToken);

      // Then: リトライにより検証が成功する
      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe('test-user-retry');

      // リトライが3回実行されたことを確認（初回 + 2回リトライ）
      expect(retryMock.getCallCount()).toBe(3);
    }, 5000);

    test('リトライ可能なエラーで最大3回までリトライする', async () => {
      // Given: 常に失敗するJWKSフェッチ
      const jwksContext = await generateTestJwks();
      const retryMock = mockJwksFetchWithRetry(10, jwksContext.jwksJson); // 10回失敗設定
      unmockFetch = retryMock;

      const testPayload = {
        sub: 'test-user-max-retry',
        email: 'maxretry@example.com',
        user_metadata: { name: 'Max Retry Test User' },
        app_metadata: { provider: 'google' },
      };

      const validToken = await signTestToken(
        jwksContext.privateKey,
        testPayload,
        {
          issuer: 'https://test-project.supabase.co/auth/v1',
          audience: 'authenticated',
          expirationTime: '2h',
        },
      );

      jwtVerifier = new SupabaseJwtVerifier();

      // When: JWT検証を実行
      const result = await jwtVerifier.verifyToken(validToken);

      // Then: 最大リトライ回数後に失敗する
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network error during JWKS fetch');

      // 最大4回実行されたことを確認（初回 + 3回リトライ）
      expect(retryMock.getCallCount()).toBe(4);
    }, 10000);

    test('署名エラーなどリトライ不可能なエラーは即座に失敗する', async () => {
      // Given: 正しいJWKSだが異なる鍵で署名されたトークン
      const jwksContext = await generateTestJwks();
      const anotherKeyPair = await generateTestJwks();

      const retryMock = mockJwksFetchWithRetry(0, jwksContext.jwksJson);
      unmockFetch = retryMock;

      const testPayload = {
        sub: 'test-user-invalid-sig',
        email: 'invalidsig@example.com',
        user_metadata: { name: 'Invalid Sig User' },
        app_metadata: { provider: 'google' },
      };

      const invalidToken = await signTestToken(
        anotherKeyPair.privateKey,
        testPayload,
        {
          issuer: 'https://test-project.supabase.co/auth/v1',
          audience: 'authenticated',
          expirationTime: '2h',
        },
      );

      jwtVerifier = new SupabaseJwtVerifier();

      // When: JWT検証を実行
      const result = await jwtVerifier.verifyToken(invalidToken);

      // Then: リトライせず即座に失敗する
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');

      // 1回のみ実行されたことを確認（リトライなし）
      expect(retryMock.getCallCount()).toBe(1);
    });
  });
});
