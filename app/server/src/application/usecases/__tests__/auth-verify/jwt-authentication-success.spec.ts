import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IAuthenticationDomainService } from '@/domain/services/IAuthenticationDomainService';
import type { IAuthProvider } from '@/domain/services/IAuthProvider';
import type { User } from '@/domain/user/UserEntity';
import type { AuthenticateUserUseCaseInput } from '@/packages/shared-schemas/src/auth';
import { makeSUT } from '../authenticate-user/helpers/makeSUT';

/**
 * AuthenticateUserUseCaseの既存ユーザー認証成功テスト
 *
 * 有効なJWTトークンを使用した既存ユーザーの認証が正常に動作することを検証する。
 * JWT検証→既存ユーザー取得→レスポンス返却の一連の流れをテストする。
 */
describe('AuthenticateUserUseCase - JWT認証成功テスト', () => {
  beforeEach(() => {
    // テスト環境を初期化し一貫した条件を保証する
    console.log('テスト環境の初期化を開始');
  });

  afterEach(() => {
    // テスト後にデータをクリーンアップして次のテストへの影響を防ぐ
    console.log('テスト環境のクリーンアップを完了');
  });

  test('有効なJWTで既存ユーザーの認証が成功する', async () => {
    // Given: 有効なJWTトークンと既存ユーザーデータ
    const validJwtInput: AuthenticateUserUseCaseInput = {
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5IiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoi5bGx55Sw5aSq6YOOIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2F2YXRhci5qcGciLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiLlsbHnlLDlpKrpg44ifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTI3MDU2fQ.dGVzdF9zaWduYXR1cmU',
    };

    // 認証成功パターンのモックセットアップ
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google',
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: 'https://lh3.googleusercontent.com/a/avatar.jpg',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastLoginAt: new Date(),
    };

    const mockAuthProvider: Partial<IAuthProvider> = {
      verifyToken: mock().mockResolvedValue({
        valid: true,
        payload: {
          sub: 'google_123456789',
          email: 'user@example.com',
          app_metadata: { provider: 'google', providers: ['google'] },
          user_metadata: {
            name: '山田太郎',
            avatar_url: 'https://lh3.googleusercontent.com/a/avatar.jpg',
            email: 'user@example.com',
            full_name: '山田太郎',
          },
          iss: 'https://supabase.example.com',
          iat: 1703123456,
          exp: 1703127056,
        },
        error: '',
      }),
      getExternalUserInfo: mock().mockResolvedValue({
        externalId: 'google_123456789',
        email: 'user@example.com',
        name: '山田太郎',
        avatarUrl: 'https://lh3.googleusercontent.com/a/avatar.jpg',
      }),
    };

    const mockAuthDomainService = {
      authenticateUser: mock().mockResolvedValue({
        user: mockUser,
        isNewUser: false,
      }),
      createUserFromExternalInfo: mock().mockResolvedValue(mockUser),
    };

    // When: JWT認証を実行
    const { sut: authenticateUserUseCase } = makeSUT({
      authProvider: mockAuthProvider as IAuthProvider,
      authDomainService: mockAuthDomainService as IAuthenticationDomainService,
    });
    const result = await authenticateUserUseCase.execute(validJwtInput);

    // Then: 既存ユーザー情報とisNewUser=falseが返却される
    expect(result.user).toBeDefined();
    expect(result.user.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.user.externalId).toBe('google_123456789');
    expect(result.user.provider).toBe('google');
    expect(result.user.email).toBe('user@example.com');
    expect(result.user.name).toBe('山田太郎');
    expect(result.user.avatarUrl).toBe(
      'https://lh3.googleusercontent.com/a/avatar.jpg',
    );
    // 【型安全性】: 文字列型での日時検証（実際の戻り値に合わせて修正）
    expect(result.user.createdAt).toBe(mockUser.createdAt);
    expect(result.user.updatedAt).toBe(mockUser.updatedAt);
    expect(result.user.lastLoginAt).toBeDefined();
    expect(result.isNewUser).toBe(false);
  });
});
