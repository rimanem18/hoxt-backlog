/**
 * UserController のテストケース集
 */

import type { Mock } from 'bun:test';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Context } from 'hono';
import type {
  GetUserProfileResponse,
  ErrorResponse,
} from '@/../../packages/shared-schemas';
import type { IGetUserProfileUseCase } from '@/application/interfaces/IGetUserProfileUseCase';
import { AuthProviders } from '@/domain/user/AuthProvider';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import { ValidationError } from '@/domain/user/errors/ValidationError';
import { InfrastructureError } from '@/domain/shared/errors/InfrastructureError';
import { UserEntity } from '@/domain/user/UserEntity';
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
  get: Mock<(key: string) => any>;
};

describe('UserController', () => {
  let userController: UserController;
  let mockGetUserProfileUseCase: IGetUserProfileUseCase;
  let mockContext: MockContext;

  beforeEach(() => {
    const createMockUser = () =>
      UserEntity.create({
        id: '12345678-1234-1234-1234-123456789012',
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
      status: mock((code) => mockContext),
      set: mock(() => {}),
      get: mock(() => ({ userId: '12345678-1234-1234-1234-123456789012' })),
    } as MockContext;
  });

  afterEach(() => {
    mock.restore();
  });

  describe('正常系テスト', () => {
    test('認証済みユーザーのプロフィール取得が成功する', async () => {
      // AuthMiddlewareでuserIdが設定済みの前提
      mockContext.get = mock(() => ({ userId: '12345678-1234-1234-1234-123456789012' }));

      const result = await userController.getProfile(mockContext as any);

      expect(mockGetUserProfileUseCase.execute).toHaveBeenCalledWith({
        userId: '12345678-1234-1234-1234-123456789012',
      });
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: expect.objectContaining({
            id: '12345678-1234-1234-1234-123456789012',
            email: 'test@example.com',
            name: 'Test User',
          }),
        },
        200,
      );
      expect(result.status).toBe(200);
    });

    test('プロフィール取得が500ms以内で完了する', async () => {
      mockContext.get = mock(() => ({ userId: '12345678-1234-1234-1234-123456789012' }));
      
      const startTime = performance.now();
      await userController.getProfile(mockContext as any);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500);
    });

    test('CORS ヘッダーが正しく設定される', async () => {
      mockContext.get = mock(() => ({ userId: '12345678-1234-1234-1234-123456789012' }));
      
      await userController.getProfile(mockContext as any);
      
      expect(mockContext.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });
  });

  describe('異常系テスト', () => {
    test('認証が必要な場合はAUTHENTICATION_REQUIREDエラーが返される', async () => {
      // AuthMiddlewareでuserIdが未設定の前提（認証なし）
      mockContext.get = mock(() => undefined);

      const result = await userController.getProfile(mockContext as any);

      expect(mockContext.status).toHaveBeenCalledWith(401);
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'ログインが必要です',
          },
        },
        401,
      );
      expect(result.status).toBe(401);
    });

    test('ユーザー未存在でUSER_NOT_FOUNDエラーが返される', async () => {
      mockContext.get = mock(() => ({ userId: '00000000-0000-0000-0000-000000000000' }));
      mockGetUserProfileUseCase.execute = mock(() =>
        Promise.reject(new UserNotFoundError('指定されたユーザーが見つかりません')),
      );

      const result = await userController.getProfile(mockContext as any);

      expect(mockContext.status).toHaveBeenCalledWith(404);
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
      expect(result.status).toBe(404);
    });

    test('サーバー内部エラーで500エラーが返される', async () => {
      mockContext.get = mock(() => ({ userId: '12345678-1234-1234-1234-123456789012' }));
      mockGetUserProfileUseCase.execute = mock(() =>
        Promise.reject(new InfrastructureError('データベース接続エラー')),
      );

      const result = await userController.getProfile(mockContext as any);

      expect(mockContext.status).toHaveBeenCalledWith(500);
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'システム内部エラーが発生しました',
          },
        },
        500,
      );
      expect(result.status).toBe(500);
    });
  });

  describe('境界値テスト', () => {
    test('JWTトークンの期限切れで認証エラーが返される', async () => {
      // 期限切れトークンシミュレート（AuthMiddlewareでuserIdがnull）
      mockContext.get = mock(() => null);

      const result = await userController.getProfile(mockContext as any);

      expect(mockContext.status).toHaveBeenCalledWith(401);
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'ログインが必要です',
          },
        },
        401,
      );
    });

    test('同時リクエスト処理でもユーザー情報が正しく取得される', async () => {
      mockContext.get = mock(() => ({ userId: '12345678-1234-1234-1234-123456789012' }));

      // 同時リクエストをシミュレート
      const promises = Array(10)
        .fill(null)
        .map(() => userController.getProfile(mockContext as any));

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.status).toBe(200);
      });
      expect(mockGetUserProfileUseCase.execute).toHaveBeenCalledTimes(10);
    });

    test('大量のユーザーデータでもパフォーマンス要件を満たす', async () => {
      // 大きなユーザーデータをシミュレート
      const largeUser = UserEntity.create({
        id: '12345678-1234-1234-1234-123456789012',
        externalId: 'large-user-data'.repeat(100),
        provider: AuthProviders.GOOGLE,
        email: 'large@example.com',
        name: 'Large Data User'.repeat(50),
        avatarUrl: 'https://example.com/large-avatar.jpg',
      });

      mockGetUserProfileUseCase.execute = mock(() =>
        Promise.resolve({ user: largeUser }),
      );
      mockContext.get = mock(() => ({ userId: '12345678-1234-1234-1234-123456789012' }));

      const startTime = performance.now();
      await userController.getProfile(mockContext as any);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    test('POST メソッドでMethod Not Allowedエラーが返される', async () => {
      mockContext.req.method = 'POST';

      const result = await userController.getProfile(mockContext as any);

      expect(mockContext.status).toHaveBeenCalledWith(405);
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'このエンドポイントはGETメソッドのみ対応しています',
          },
        },
        405,
      );
    });
  });
});