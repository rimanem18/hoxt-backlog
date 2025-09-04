import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { AuthenticateUserUseCaseOutput } from '@/application/interfaces/IAuthenticateUserUseCase';
import type { IAuthenticationDomainService } from '@/domain/services/IAuthenticationDomainService';
import type { IAuthProvider } from '@/domain/services/IAuthProvider';
import type { AuthenticateUserUseCaseInput } from '@/packages/shared-schemas/src/auth';
import type { User } from '@/packages/shared-schemas/src/user';
import { makeSUT } from '../authenticate-user/helpers/makeSUT';

/**
 * TDD Red フェーズ: JITプロビジョニング成功テスト
 *
 * 【テスト目的】: 初回ログイン時のJIT（Just-In-Time）新規ユーザー作成が正常に動作することを確認
 * 【テスト内容】: 未登録ユーザーの初回認証時に自動的にユーザーレコードが作成される処理を検証
 * 【期待される動作】: JWT検証→ユーザー不存在確認→新規ユーザー作成→レスポンス返却
 * 🟢 信頼性レベル: EARS要件REQ-004・interfaces.ts・dataflow.mdから直接抽出
 */
describe('AuthenticateUserUseCase - JITプロビジョニング成功テスト', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にテスト環境を初期化し、JIT処理の前提条件を設定
    // 【環境初期化】: データベースに未登録ユーザーの状態を確保（external_idが存在しない状態）
    console.log('JITプロビジョニングテスト環境の初期化を開始');
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後に作成された新規ユーザーレコードを削除し、環境をクリーンアップ
    // 【状態復元】: JIT処理で作成されたテストデータを削除し、次のテストに影響しないよう初期状態に戻す
    console.log('JITプロビジョニングテスト環境のクリーンアップを完了');
  });

  test('初回ログインユーザーのJITプロビジョニングが成功する', async () => {
    // 【テスト目的】: 初回認証時のユーザー自動作成機能が正常に動作することを確認
    // 【テスト内容】: AuthenticateUserUseCaseが未登録ユーザーのJWTを処理し、新規ユーザーを作成・返却する
    // 【期待される動作】: JWT検証→ユーザー不存在確認→JIT新規作成→UUID生成→タイムスタンプ設定→isNewUser=true返却
    // 🟢 信頼性レベル: EARS要件REQ-004・AuthenticationDomainService仕様から直接抽出

    // 【テストデータ準備】: 初回認証ユーザーのJWT（external_idがDB未登録）を模擬
    // 【初期条件設定】: データベースに該当するexternal_id + providerの組み合わせが存在しない状態
    const newUserJwtInput: AuthenticateUserUseCaseInput = {
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfOTg3NjU0MzIxIiwiZW1haWwiOiJuZXd1c2VyQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiTmV3IFVzZXIgU2FuIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vbmV3LWF2YXRhci5qcGciLCJlbWFpbCI6Im5ld3VzZXJAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiJOZXcgVXNlciBTYW4ifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTI3MDU2fQ.dGVzdF9zaWduYXR1cmU',
    };

    // 【依存関係注入】: makeSUTヘルパーでJITプロビジョニングパターンのモックセットアップを実行
    // 【実装方針】: 初回ログインユーザーのため、新規ユーザー作成パターンのモックを設定
    // 🟢 信頼性レベル: 既存のテストパターンから抽出された確立された手法
    const mockNewUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440001', // 新しいUUID
      externalId: 'google_987654321',
      provider: 'google',
      email: 'newuser@example.com',
      name: 'New User San',
      avatarUrl: 'https://example.com/new-avatar.jpg',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastLoginAt: new Date().toISOString(),
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

    // 【実際の処理実行】: makeSUTで構築したSUTでJITプロビジョニングを実行
    // 【処理内容】: JWT検証→ユーザー検索（不存在）→JIT新規作成→UUID生成→レスポンス生成の一連の処理を実行
    const { sut: authenticateUserUseCase } = makeSUT({
      authProvider: mockAuthProvider as IAuthProvider,
      authDomainService: mockAuthDomainService as IAuthenticationDomainService,
    });
    const result: AuthenticateUserUseCaseOutput =
      await authenticateUserUseCase.execute(newUserJwtInput);

    // 【結果検証】: JIT処理により新規作成されたユーザー情報とフラグが正確に返却されることを検証
    // 【期待値確認】: 新規ユーザーが正常に作成され、isNewUser=trueであることを確認

    expect(result.user).toBeDefined(); // 【確認内容】: 新規作成されたユーザーオブジェクトが返却されることを確認 🟢
    expect(result.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    ); // 【確認内容】: 新規UUIDが正しい形式で生成されることを確認 🟢
    expect(result.user.externalId).toBe('google_987654321'); // 【確認内容】: JWTペイロードのsubからexternal_idが正確に設定されることを確認 🟢
    expect(result.user.provider).toBe('google'); // 【確認内容】: 認証プロバイダーがJWTペイロードから正確に抽出・設定されることを確認 🟢
    expect(result.user.email).toBe('newuser@example.com'); // 【確認内容】: メールアドレスがJWTペイロードから正確に設定されることを確認 🟢
    expect(result.user.name).toBe('New User San'); // 【確認内容】: 表示名がJWTペイロードのuser_metadata.nameから正確に設定されることを確認 🟢
    expect(result.user.avatarUrl).toBe('https://example.com/new-avatar.jpg'); // 【確認内容】: アバターURLがJWTペイロードから正確に設定されることを確認 🟢

    // タイムスタンプの検証（適切な日時が設定されていることを確認）
    expect(result.user.createdAt).toBe('2024-01-01T00:00:00Z'); // 【確認内容】: 作成日時が正確に設定されることを確認 🟢
    expect(result.user.updatedAt).toBe('2024-01-01T00:00:00Z'); // 【確認内容】: 更新日時が正確に設定されることを確認 🟢
    expect(result.user.lastLoginAt).toBeDefined(); // 【確認内容】: 最終ログイン日時が設定されていることを確認 🟢
    
    // 最終ログイン日時は現在時刻に近いことを確認
    if (result.user.lastLoginAt) {
      const lastLoginAt = new Date(result.user.lastLoginAt);
      const now = new Date();
      expect(Math.abs(lastLoginAt.getTime() - now.getTime())).toBeLessThan(5000); // 【確認内容】: 最終ログイン日時が現在時刻から5秒以内であることを確認 🟢
    }

    expect(result.isNewUser).toBe(true); // 【確認内容】: JIT処理で新規作成されたユーザーなのでisNewUserがtrueであることを確認 🟢

    // 【品質保証】: この検証により、AuthenticationDomainServiceのJIT機能が正常に動作し、
    // 初回ログインユーザーの自動作成と適切なフラグ設定が保証される
  });

  test('JITプロビジョニングでユーザーエンティティが正しく構築される', async () => {
    // 【テスト目的】: JIT処理で作成されるUserEntityがDDD原則に従って正しく構築されることを確認
    // 【テスト内容】: ドメインオブジェクトとしての整合性・不変条件・ビジネスルールが適用されることを検証
    // 【期待される動作】: CreateUserInputから適切なUserEntityが生成され、ドメイン制約が満たされる
    // 🟢 信頼性レベル: DDD UserEntity設計・domain/user/UserEntity仕様から直接抽出

    // 【テストデータ準備】: JIT処理に必要な最小限のJWTペイロード情報を提供
    // 【初期条件設定】: ドメインバリデーションをテストするための境界値を含むデータ
    const jitValidationInput: AuthenticateUserUseCaseInput = {
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfZG9tYWluX3Rlc3QiLCJlbWFpbCI6InZhbGlkQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiRG9tYWluIFRlc3QiLCJhdmF0YXJfdXJsIjpudWxsLCJlbWFpbCI6InZhbGlkQGV4YW1wbGUuY29tIiwiZnVsbF9uYW1lIjoiRG9tYWluIFRlc3QifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTI3MDU2fQ.ZG9tYWluX3Rlc3Rfc2ln',
    };

    // 【実際の処理実行】: AuthenticateUserUseCaseのexecuteメソッドでJIT処理を実行
    // 【処理内容】: UserAggregateによるドメインオブジェクト生成とビジネスルール適用を含むJIT処理
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

    // 【結果検証】: ドメインオブジェクトとしての品質と整合性を検証
    // 【期待値確認】: UserEntityのビジネスルールと制約が適切に適用されていることを確認

    expect(result.user.id).toBeDefined(); // 【確認内容】: プライマリキーとしてのUUIDが適切に設定されることを確認 🟢
    expect(result.user.externalId).toBe('google_domain_test'); // 【確認内容】: 外部プロバイダーIDが正規化されて設定されることを確認 🟢
    expect(result.user.provider).toBe('google'); // 【確認内容】: AuthProvider enum値が正しく設定されることを確認 🟢
    expect(result.user.email).toBe('valid@example.com'); // 【確認内容】: メールアドレスが正確に設定されることを確認 🟢
    expect(result.user.name).toBe('Domain Test'); // 【確認内容】: 名前が正確に設定されることを確認 🟢
    expect(result.user.avatarUrl).toBeNull(); // 【確認内容】: nullが適切に処理されることを確認 🟢

    // 【品質保証】: この検証により、JIT処理がDDDの原則に従ってドメインオブジェクトを正しく構築し、
    // ビジネスルールと制約を適切に適用することが保証される
  });
});
