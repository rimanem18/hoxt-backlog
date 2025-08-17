import { beforeEach, describe, expect, test } from 'bun:test';
import type {
  ExternalUserInfo,
  JwtPayload,
  JwtVerificationResult,
} from '@/domain/services/IAuthProvider';
import { SupabaseAuthProvider } from '../SupabaseAuthProvider';

describe('SupabaseAuthProvider', () => {
  let authProvider: SupabaseAuthProvider;

  beforeEach(() => {
    // 各テスト実行前にSupabaseAuthProviderインスタンスを初期化
    process.env.SUPABASE_JWT_SECRET = 'test-secret-key-for-jwt-verification';
    authProvider = new SupabaseAuthProvider();
  });

  describe('verifyToken', () => {
    test('有効なGoogle OAuth JWTが正常に検証される', async () => {
      // Given: 有効なGoogle OAuth JWT
      const validGoogleJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5MCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6Imdvb2dsZSIsInByb3ZpZGVycyI6WyJnb29nbGUiXX0sInVzZXJfbWV0YWRhdGEiOnsibmFtZSI6IlRlc3QgVXNlciIsImF2YXRhcl91cmwiOiJodHRwczovL2V4YW1wbGUuY29tL2F2YXRhci5qcGciLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiJUZXN0IFVzZXIifSwiaXNzIjoiaHR0cHM6Ly95b3VyLXN1cGFiYXNlLnVybCIsImlhdCI6MTY5Mjc4MDgwMCwiZXhwIjoyMDA4MTQwODAwfQ.signature';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await authProvider.verifyToken(validGoogleJwt);

      // Then: 検証が成功し、正確なペイロードが返される
      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.payload?.sub).toBe('google_1234567890');
      expect(result.payload?.email).toBe('test@example.com');
      expect(result.payload?.app_metadata.provider).toBe('google');
    });

    test('不正な署名のJWTが確実に拒否される', async () => {
      // Given: 不正な署名を持つJWT
      const invalidSignatureJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5MCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.invalid_signature';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await authProvider.verifyToken(invalidSignatureJwt);

      // Then: 署名検証が失敗する
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid signature');
      expect(result.payload).toBeUndefined();
    });

    test('有効期限が切れたJWTが確実に拒否される', async () => {
      // Given: 有効期限が切れたJWT（exp claim: 1692780800）
      const expiredJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5MCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImV4cCI6MTY5Mjc4MDgwMH0.valid_signature_but_expired';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await authProvider.verifyToken(expiredJwt);

      // Then: 期限切れで検証が失敗する
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Token expired');
      expect(result.payload).toBeUndefined();
    });

    test('JWT形式に準拠しないトークンが確実に拒否される', async () => {
      // Given: JWT標準形式でないトークン
      const malformedJwt = 'not-a-jwt-token';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await authProvider.verifyToken(malformedJwt);

      // Then: 形式不正で検証が失敗する
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid token format');
      expect(result.payload).toBeUndefined();
    });

    test('空文字列やnullトークンが適切に拒否される', async () => {
      // Given: 空文字列のトークン
      const emptyToken = '';

      // When: JWT検証を実行
      const result: JwtVerificationResult =
        await authProvider.verifyToken(emptyToken);

      // Then: 必須パラメータエラーを返す
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Token is required');
      expect(result.payload).toBeUndefined();
    });
  });

  describe('getExternalUserInfo', () => {
    test('完全なJWTペイロードから正確なユーザー情報が抽出される', async () => {
      // Given: すべての必須・オプションフィールドを含むJWTペイロード
      const validPayload: JwtPayload = {
        sub: 'google_1234567890',
        email: 'test@example.com',
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
        user_metadata: {
          name: '田中太郎',
          avatar_url: 'https://lh3.googleusercontent.com/avatar.jpg',
          email: 'test@example.com',
          full_name: '田中太郎',
        },
        iss: 'https://your-supabase.url',
        iat: 1692780800,
        exp: 1692784400,
      };

      // When: ユーザー情報を抽出
      const userInfo: ExternalUserInfo =
        await authProvider.getExternalUserInfo(validPayload);

      // Then: 正確にマッピングされたユーザー情報が返される
      expect(userInfo.id).toBe('google_1234567890');
      expect(userInfo.provider).toBe('google');
      expect(userInfo.email).toBe('test@example.com');
      expect(userInfo.name).toBe('田中太郎');
      expect(userInfo.avatarUrl).toBe(
        'https://lh3.googleusercontent.com/avatar.jpg',
      );
    });

    test('avatar_urlが存在しない場合に適切に処理される', async () => {
      // Given: avatar_urlフィールドが存在しないJWTペイロード
      const payloadWithoutAvatar: JwtPayload = {
        sub: 'google_0987654321',
        email: 'user@example.com',
        app_metadata: { provider: 'google', providers: ['google'] },
        user_metadata: {
          name: '山田花子',
          email: 'user@example.com',
          full_name: '山田花子',
          // avatar_url なし
        },
        iss: 'https://your-supabase.url',
        iat: 1692780800,
        exp: 1692784400,
      };

      // When: ユーザー情報を抽出
      const userInfo: ExternalUserInfo =
        await authProvider.getExternalUserInfo(payloadWithoutAvatar);

      // Then: avatarUrlがundefinedとして正しく処理される
      expect(userInfo.id).toBe('google_0987654321');
      expect(userInfo.provider).toBe('google');
      expect(userInfo.email).toBe('user@example.com');
      expect(userInfo.name).toBe('山田花子');
      expect(userInfo.avatarUrl).toBeUndefined();
    });

    test('必須フィールド不足ペイロードでエラーが発生する', async () => {
      // Given: 必須フィールド（sub）が不足したペイロード
      const incompletePayload = {
        // sub フィールドなし
        email: 'test@example.com',
        app_metadata: { provider: 'google', providers: ['google'] },
        user_metadata: { name: 'Test User' },
        iss: 'https://your-supabase.url',
        iat: 1692780800,
        exp: 1692784400,
      } as JwtPayload;

      // When & Then: ユーザー情報を抽出し、エラーが発生する
      await expect(
        authProvider.getExternalUserInfo(incompletePayload),
      ).rejects.toThrow();
    });
  });
});
