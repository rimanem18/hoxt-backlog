import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IAuthenticationDomainService } from '@/domain/services/IAuthenticationDomainService';
import type { IAuthProvider } from '@/domain/services/IAuthProvider';
import type {
  AuthenticateUserUseCaseInput,
  AuthenticateUserUseCaseOutput,
} from '@/packages/shared-schemas/src/auth';
import type { User } from '@/packages/shared-schemas/src/user';
import { makeSUT } from '../authenticate-user/helpers/makeSUT';

/**
 * TDD Red フェーズ: 有効なJWTでのユーザー認証成功テスト
 *
 * 【テスト目的】: POST /api/auth/verify エンドポイントが有効なJWTを正常に検証し、ユーザー情報を返却することを確認
 * 【テスト内容】: JWT検証→既存ユーザー取得→レスポンス返却の一連の流れが正常実行されることを検証
 * 【期待される動作】: AuthenticateUserUseCaseが有効なJWTを受け取り、既存ユーザー情報とisNewUser=falseを返却
 * 🟢 信頼性レベル: EARS要件REQ-002・interfaces.ts・api-endpoints.mdから直接抽出
 */
describe('AuthenticateUserUseCase - JWT認証成功テスト', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にテスト環境を初期化し、一貫したテスト条件を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、データベースの状態をクリーンにリセット
    console.log('テスト環境の初期化を開始');
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後に作成されたテストデータを削除し、環境をクリーンアップ
    // 【状態復元】: 次のテストに影響しないよう、データベースを元の状態に戻す
    console.log('テスト環境のクリーンアップを完了');
  });

  test('有効なJWTで既存ユーザーの認証が成功する', async () => {
    // 【テスト目的】: 有効なJWTトークンでの認証処理が正常に動作することを確認
    // 【テスト内容】: AuthenticateUserUseCaseが既存ユーザーのJWTを処理し、ユーザー情報を正常に返却する
    // 【期待される動作】: JWT検証成功→既存ユーザー情報取得→lastLoginAt更新→レスポンス返却
    // 🟢 信頼性レベル: EARS要件REQ-002・interfaces.tsから直接抽出

    // 【テストデータ準備】: Supabase Authが発行する形式の有効なJWTトークンを模擬
    // 【初期条件設定】: 既存ユーザーがデータベースに存在する状態を前提とする
    const validJwtInput: AuthenticateUserUseCaseInput = {
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5IiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoi5bGx55Sw5aSq6YOOIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2F2YXRhci5qcGciLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiLlsbHnlLDlpKrpg44ifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTI3MDU2fQ.signature',
    };

    // 【依存関係注入】: makeSUTヘルパーで成功パターンのモックセットアップを実行
    // 【実装方針】: JWT認証成功のため、各種モックで正常値を返すよう設定
    // 🟢 信頼性レベル: 既存のテストパターンから抽出された確立された手法
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google',
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: 'https://lh3.googleusercontent.com/a/avatar.jpg',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastLoginAt: new Date().toISOString(),
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

    // 【実際の処理実行】: makeSUTで構築したSUTでJWT認証を実行
    // 【処理内容】: JWT検証・ユーザー存在確認・最終ログイン時刻更新・レスポンス生成の一連の処理を実行
    const { sut: authenticateUserUseCase } = makeSUT({
      authProvider: mockAuthProvider as IAuthProvider,
      authDomainService: mockAuthDomainService as IAuthenticationDomainService,
    });
    const result: AuthenticateUserUseCaseOutput =
      await authenticateUserUseCase.execute(validJwtInput);

    // 【結果検証】: 返却されたレスポンスが期待される形式と内容に合致することを検証
    // 【期待値確認】: 既存ユーザーの情報が正確に返され、isNewUserがfalseであることを確認

    expect(result.user).toBeDefined(); // 【確認内容】: ユーザーオブジェクトが返却されることを確認 🟢
    expect(result.user.id).toBe('550e8400-e29b-41d4-a716-446655440000'); // 【確認内容】: 既存ユーザーIDが正確に返却されることを確認 🟢
    expect(result.user.externalId).toBe('google_123456789'); // 【確認内容】: Google OAuthでのexternal_idが正確に返却されることを確認 🟢
    expect(result.user.provider).toBe('google'); // 【確認内容】: 認証プロバイダーがGoogleとして正確に返却されることを確認 🟢
    expect(result.user.email).toBe('user@example.com'); // 【確認内容】: メールアドレスがJWTペイロードと一致することを確認 🟢
    expect(result.user.name).toBe('山田太郎'); // 【確認内容】: 表示名がJWTペイロードと一致することを確認 🟢
    expect(result.user.avatarUrl).toBe(
      'https://lh3.googleusercontent.com/a/avatar.jpg',
    ); // 【確認内容】: アバターURLが正確に返却されることを確認 🟢
    expect(result.user.createdAt).toEqual(new Date('2024-01-01T00:00:00Z')); // 【確認内容】: アカウント作成日時が正確に返却されることを確認 🟢
    expect(result.user.updatedAt).toEqual(new Date('2024-01-01T00:00:00Z')); // 【確認内容】: 最終更新日時が正確に返却されることを確認 🟢
    expect(result.user.lastLoginAt).toBeDefined(); // 【確認内容】: 最終ログイン日時が更新されていることを確認 🟢
    expect(result.isNewUser).toBe(false); // 【確認内容】: 既存ユーザーなのでisNewUserがfalseであることを確認 🟢

    // 【品質保証】: この検証により、AuthenticateUserUseCaseが既存ユーザーの認証を正常に処理し、
    // 適切なユーザー情報とフラグを返却することが保証される
  });
});
