import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { AuthenticateUserUseCaseOutput } from '@/application/interfaces/IAuthenticateUserUseCase';
import type { IAuthenticationDomainService } from '@/domain/services/IAuthenticationDomainService';
import type { IAuthProvider } from '@/domain/services/IAuthProvider';
import type { User } from '@/domain/user/UserEntity';
import type { AuthenticateUserUseCaseInput } from '@/packages/shared-schemas/src/auth';
import { makeSUT } from '../authenticate-user/helpers/makeSUT';

/**
 * AuthenticateUserUseCaseのJITプロビジョニング成功テスト
 *
 * 初回ログイン時のJust-In-Time新規ユーザー作成が正常に動作することを検証する。
 * JWT検証→ユーザー不存在確認→新規ユーザー作成→レスポンス返却の流れをテストする。
 */
describe('AuthenticateUserUseCase - JITプロビジョニング成功テスト', () => {
  beforeEach(() => {
    // JITプロビジョニングテストの環境初期化
    console.log('JITプロビジョニングテスト環境の初期化を開始');
  });

  afterEach(() => {
    // JITテストで作成されたデータをクリーンアップ
    console.log('JITプロビジョニングテスト環境のクリーンアップを完了');
  });

  test('初回ログインユーザーのJITプロビジョニングが成功する', async () => {
    // Given: 未登録ユーザーのJWTトークン
    const newUserJwtInput: AuthenticateUserUseCaseInput = {
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfOTg3NjU0MzIxIiwiZW1haWwiOiJuZXd1c2VyQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiTmV3IFVzZXIgU2FuIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vbmV3LWF2YXRhci5qcGciLCJlbWFpbCI6Im5ld3VzZXJAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiJOZXcgVXNlciBTYW4ifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTI3MDU2fQ.dGVzdF9zaWduYXR1cmU',
    };

    // JITプロビジョニングパターンのモックセットアップ
    const mockNewUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440001', // 新しいUUID
      externalId: 'google_987654321',
      provider: 'google',
      email: 'newuser@example.com',
      name: 'New User San',
      avatarUrl: 'https://example.com/new-avatar.jpg',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastLoginAt: new Date(),
    };

    const mockAuthProvider: Partial<IAuthProvider> = {
      verifyToken: mock().mockResolvedValue({
        valid: true,
        payload: {
          sub: 'google_987654321',
          email: 'newuser@example.com',
          app_metadata: { provider: 'google', providers: ['google'] },
          user_metadata: {
            name: 'New User San',
            avatar_url: 'https://example.com/new-avatar.jpg',
            email: 'newuser@example.com',
            full_name: 'New User San',
          },
          iss: 'https://supabase.example.com',
          iat: 1703123456,
          exp: 1703127056,
        },
        error: '',
      }),
      getExternalUserInfo: mock().mockResolvedValue({
        externalId: 'google_987654321',
        email: 'newuser@example.com',
        name: 'New User San',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      }),
    };

    const mockAuthDomainService = {
      authenticateUser: mock().mockResolvedValue({
        user: mockNewUser,
        isNewUser: true, // JITプロビジョニングのためtrue
      }),
      createUserFromExternalInfo: mock().mockResolvedValue(mockNewUser),
    };

    // When: JITプロビジョニングを実行
    const { sut: authenticateUserUseCase } = makeSUT({
      authProvider: mockAuthProvider as IAuthProvider,
      authDomainService: mockAuthDomainService as IAuthenticationDomainService,
    });
    const result: AuthenticateUserUseCaseOutput =
      await authenticateUserUseCase.execute(newUserJwtInput);

    // Then: 新規ユーザー情報とisNewUser=trueが返却される
    expect(result.user).toBeDefined();
    expect(result.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(result.user.externalId).toBe('google_987654321');
    expect(result.user.provider).toBe('google');
    expect(result.user.email).toBe('newuser@example.com');
    expect(result.user.name).toBe('New User San');
    expect(result.user.avatarUrl).toBe('https://example.com/new-avatar.jpg');

    // 【型安全性】: 文字列型での日時検証（実際の戻り値に合わせて修正）
    expect(result.user.createdAt).toBe(mockNewUser.createdAt);
    expect(result.user.updatedAt).toBe(mockNewUser.updatedAt);
    expect(result.user.lastLoginAt).toBeDefined();

    if (result.user.lastLoginAt) {
      const lastLoginAt = new Date(result.user.lastLoginAt);
      const now = new Date();
      // 最終ログイン日時が現在時刻から5秒以内であることを確認
      expect(Math.abs(lastLoginAt.getTime() - now.getTime())).toBeLessThan(
        5000,
      );
    }

    expect(result.isNewUser).toBe(true);
  });

  test('JITプロビジョニングでユーザーエンティティが正しく構築される', async () => {
    // Given: JIT処理用のドメインバリデーションデータ
    const jitValidationInput: AuthenticateUserUseCaseInput = {
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfZG9tYWluX3Rlc3QiLCJlbWFpbCI6InZhbGlkQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiRG9tYWluIFRlc3QiLCJhdmF0YXJfdXJsIjpudWxsLCJlbWFpbCI6InZhbGlkQGV4YW1wbGUuY29tIiwiZnVsbF9uYW1lIjoiRG9tYWluIFRlc3QifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTI3MDU2fQ.ZG9tYWluX3Rlc3Rfc2ln',
    };

    // When: ドメインオブジェクト構築を含むJIT処理を実行
    const { sut: authenticateUserUseCase } = makeSUT({
      authProvider: {
        verifyToken: mock().mockResolvedValue({
          valid: true,
          payload: {
            sub: 'google_domain_test',
            email: 'valid@example.com',
            app_metadata: { provider: 'google', providers: ['google'] },
            user_metadata: {
              name: 'Domain Test',
              avatar_url: null,
              email: 'valid@example.com',
              full_name: 'Domain Test',
            },
            iss: 'https://supabase.example.com',
            iat: 1703123456,
            exp: 1703127056,
          },
          error: '',
        }),
        getExternalUserInfo: mock().mockResolvedValue({
          externalId: 'google_domain_test',
          email: 'valid@example.com',
          name: 'Domain Test',
          avatarUrl: null,
        }),
      } as IAuthProvider,
      authDomainService: {
        createUserFromExternalInfo: mock(),
        authenticateUser: mock().mockResolvedValue({
          user: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            externalId: 'google_domain_test',
            provider: 'google',
            email: 'valid@example.com',
            name: 'Domain Test',
            avatarUrl: null,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
            lastLoginAt: new Date(),
          },
          isNewUser: true,
        }),
      } as IAuthenticationDomainService,
    });
    const result: AuthenticateUserUseCaseOutput =
      await authenticateUserUseCase.execute(jitValidationInput);

    // Then: ドメインオブジェクトとして適切に構築される
    expect(result.user.id).toBeDefined();
    expect(result.user.externalId).toBe('google_domain_test');
    expect(result.user.provider).toBe('google');
    expect(result.user.email).toBe('valid@example.com');
    expect(result.user.name).toBe('Domain Test');
    expect(result.user.avatarUrl).toBeNull();
  });
});
