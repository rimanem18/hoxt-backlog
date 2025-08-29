/*
 * UserController テストケース集
 */

import type { Mock } from 'bun:test';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type {
  ErrorResponse,
  GetUserProfileResponse,
} from '@/packages/shared-schemas/src';
import type { IGetUserProfileUseCase } from '@/application/usecases/GetUserProfileUseCase';
import { AuthProviders } from '@/domain/user/AuthProvider';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import { UserEntity } from '@/domain/user/UserEntity';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';
import { UserController } from '../UserController';

type MockContext = {
  req: {
    header: Mock<(name?: string) => string | undefined>;
    method: string;
    url: string;
  };
  json: Mock<
    (
      data: GetUserProfileResponse | ErrorResponse,
      status?: number,
    ) => { data: GetUserProfileResponse | ErrorResponse; status: number }
  >;
  status: Mock<(code: number) => MockContext>;
  set: Mock<(key: string, value: string) => void>;
  get: Mock<(key: string) => unknown>;
};

describe('UserController', () => {
  let userController: UserController;
  let mockGetUserProfileUseCase: IGetUserProfileUseCase;
  let mockContext: MockContext;

  beforeEach(() => {
    const createMockUser = () =>
      UserEntity.create({
        externalId: 'test123',
        provider: AuthProviders.GOOGLE,
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

    mockGetUserProfileUseCase = {
      execute: mock(() =>
        Promise.resolve({
          user: createMockUser(),
        }),
      ),
    };

    userController = new UserController(mockGetUserProfileUseCase);

    mockContext = {
      req: {
        header: mock(() => 'Bearer valid-jwt-token'),
        method: 'GET',
        url: '/api/user/profile',
      },
      json: mock((data, status = 200) => ({ data, status })),
      status: mock((_code) => mockContext),
      set: mock(() => {}),
      get: mock(() => ({ userId: '12345678-1234-1234-1234-123456789012' })),
    } as MockContext;
  });

  afterEach(() => {
    mock.restore();
  });

  describe('正常系テスト', () => {
    test('認証済みユーザーのプロフィール取得が成功する', async () => {
      // Given: AuthMiddlewareでuserIdが設定済み
      mockContext.get = mock(() => '12345678-1234-1234-1234-123456789012');

      // When: プロフィール取得メソッドを実行
      // @ts-expect-error MockContext型はテスト用の部分的な実装のため
      await userController.getProfile(mockContext);

      // Then: UseCaseが正しく呼び出され、正常なレスポンスが返される
      expect(mockGetUserProfileUseCase.execute).toHaveBeenCalledWith({
        userId: '12345678-1234-1234-1234-123456789012',
      });
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: expect.objectContaining({
            externalId: 'test123',
            provider: 'google',
            email: 'test@example.com',
            name: 'Test User',
            avatarUrl: 'https://example.com/avatar.jpg',
            lastLoginAt: null,
          }),
        },
        200,
      );
    });

    test('プロフィール取得が500ms以内で完了する', async () => {
      // Given: 認証済みユーザーのコンテキスト
      mockContext.get = mock(() => '12345678-1234-1234-1234-123456789012');

      // When: プロフィール取得を実行し実行時間を測定
      const startTime = performance.now();
      // @ts-expect-error MockContext型はテスト用の部分的な実装のため
      await userController.getProfile(mockContext);
      const endTime = performance.now();

      // Then: 500ms以内で完了する
      expect(endTime - startTime).toBeLessThan(500);
    });

    // CORS設定はミドルウェアレベルで行われるため、UserControllerでは直接テストしない
  });

  describe('異常系テスト', () => {
    // 【認証チェック削除】: requireAuth()ミドルウェアにより認証は保証されるためテスト不要
    // test('認証が必要な場合はAUTHENTICATION_REQUIREDエラーが返される', async () => {
    //   認証エラーはAuthMiddlewareレベルで処理されるため、UserControllerでは発生しない
    // });

    test('ユーザー未存在でUSER_NOT_FOUNDエラーが返される', async () => {
      // Given: 存在しないユーザーIDとUserNotFoundErrorを投げるUseCase
      mockContext.get = mock(() => '00000000-0000-0000-0000-000000000000');
      mockGetUserProfileUseCase.execute = mock(() =>
        Promise.reject(
          new UserNotFoundError('指定されたユーザーが見つかりません'),
        ),
      );

      // When: プロフィール取得を実行
      // @ts-expect-error MockContext型はテスト用の部分的な実装のため
      await userController.getProfile(mockContext);

      // Then: 404エラーが返される
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        },
        404,
      );
    });

    test('サーバー内部エラーで500エラーが返される', async () => {
      // Given: 有効なユーザーIDとInfrastructureErrorを投げるUseCase
      mockContext.get = mock(() => '12345678-1234-1234-1234-123456789012');
      mockGetUserProfileUseCase.execute = mock(() =>
        Promise.reject(new InfrastructureError('データベース接続エラー')),
      );

      // When: プロフィール取得を実行
      // @ts-expect-error MockContext型はテスト用の部分的な実装のため
      await userController.getProfile(mockContext);

      // Then: 500エラーが返される
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: '一時的にサービスが利用できません',
          },
        },
        500,
      );
    });
  });

  describe('境界値テスト', () => {
    // 【認証チェック削除】: requireAuth()ミドルウェアにより認証は保証されるため期限切れテスト不要
    // test('JWTトークンの期限切れで認証エラーが返される', async () => {
    //   JWT期限切れエラーはAuthMiddlewareレベルで処理されるため、UserControllerでは発生しない
    // });

    test('同時リクエスト処理でもユーザー情報が正しく取得される', async () => {
      // Given: 有効なユーザーIDとコンテキスト
      mockContext.get = mock(() => '12345678-1234-1234-1234-123456789012');

      // When: 10件の同時リクエストを実行
      const promises = Array(10)
        .fill(null)
        // @ts-expect-error MockContext型はテスト用の部分的な実装のため
        .map(() => userController.getProfile(mockContext));

      await Promise.all(promises);

      // Then: すべてのリクエストが正しく処理される
      expect(mockGetUserProfileUseCase.execute).toHaveBeenCalledTimes(10);
    });

    test('大量のユーザーデータでもパフォーマンス要件を満たす', async () => {
      // Given: 大量データを持つユーザーとUseCase
      const largeUser = UserEntity.create({
        externalId: 'large-user-data'.repeat(10),
        provider: AuthProviders.GOOGLE,
        email: 'large@example.com',
        name: 'Large Data User'.repeat(5),
        avatarUrl: 'https://example.com/large-avatar.jpg',
      });

      mockGetUserProfileUseCase.execute = mock(() =>
        Promise.resolve({ user: largeUser }),
      );
      mockContext.get = mock(() => '12345678-1234-1234-1234-123456789012');

      // When: プロフィール取得を実行し実行時間を測定
      const startTime = performance.now();
      // @ts-expect-error MockContext型はテスト用の部分的な実装のため
      await userController.getProfile(mockContext);
      const endTime = performance.now();

      // Then: 500ms以内で完了する
      expect(endTime - startTime).toBeLessThan(500);
    });

    // HTTPメソッド制限はルーティングレベルで行われるため、UserControllerでは直接テストしない
  });
});
