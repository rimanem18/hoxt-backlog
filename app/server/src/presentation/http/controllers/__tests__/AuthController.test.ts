/**
 * AuthController のテストケース集
 */

import type { Mock } from 'bun:test';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Context } from 'hono';
import type { IAuthenticateUserUseCase } from '@/application/interfaces/IAuthenticateUserUseCase';
import { AuthProviders } from '@/domain/user/AuthProvider';
import { AuthenticationError } from '@/domain/user/errors/AuthenticationError';
import { UserEntity } from '@/domain/user/UserEntity';
// shared-schemasからの型インポート
import type {
  AuthResponse,
  ErrorResponse,
} from '@/packages/shared-schemas/src/auth';
import { AuthController } from '../AuthController';

type MockContext = {
  req: {
    json: Mock<() => Promise<unknown>>;
    header: Mock<(name?: string) => string | undefined>;
    method: string;
    url: string;
  };
  json: Mock<
    (
      data: AuthResponse | ErrorResponse,
      status?: number,
    ) => { data: AuthResponse | ErrorResponse; status: number }
  >;
  status: Mock<(code: number) => MockContext>;
};

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthenticateUserUseCase: IAuthenticateUserUseCase;
  let mockContext: MockContext;

  beforeEach(() => {
    const createMockUser = () =>
      UserEntity.create({
        externalId: 'test123',
        provider: AuthProviders.GOOGLE,
        email: 'test@example.com',
        name: 'Test User',
      });
    mockAuthenticateUserUseCase = {
      execute: mock(() =>
        Promise.resolve({
          user: createMockUser(),
          isNewUser: false,
        }),
      ),
    } as IAuthenticateUserUseCase;

    authController = new AuthController(mockAuthenticateUserUseCase);

    mockContext = {
      req: {
        json: mock(() => Promise.resolve({})),
        header: mock(() => undefined),
        method: 'POST',
        url: 'http://localhost:3000/api/auth/verify',
      },
      json: mock((data: AuthResponse | ErrorResponse, status?: number) => ({
        data,
        status: status ?? 200,
      })),
      status: mock((_code: number) => mockContext),
    };
  });

  afterEach(() => {
    mock.restore();
  });

  test('有効なJWTトークンが提供された場合、認証に成功する', async () => {
    // Given: 有効なJWTトークン
    const validJwtToken = 'valid.jwt.token';
    const requestBody = { token: validJwtToken };
    const createExpectedUser = () =>
      UserEntity.create({
        externalId: 'user123',
        provider: AuthProviders.GOOGLE,
        email: 'test@example.com',
        name: 'Test User',
      });
    const expectedUser = createExpectedUser();

    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() =>
      Promise.resolve({ user: expectedUser, isNewUser: false }),
    );

    // When: 認証コントローラーを実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 認証成功レスポンスが返される
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({
      jwt: validJwtToken,
    });
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: true, user: expectedUser, isNewUser: false },
      200,
    );
  });

  test('新規ユーザーの場合、JITプロビジョニングによりユーザーが作成される', async () => {
    // Given: 新規ユーザーのJWTトークン
    const newUserJwtToken = 'new.user.jwt.token';
    const requestBody = { token: newUserJwtToken };
    const createNewUser = () =>
      UserEntity.create({
        externalId: 'newuser456',
        provider: AuthProviders.GOOGLE,
        email: 'newuser@example.com',
        name: 'New User',
      });
    const newUser = createNewUser();

    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() =>
      Promise.resolve({ user: newUser, isNewUser: true }),
    );

    // When: 新規ユーザーの認証を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: JITプロビジョニングによる新規ユーザー作成と認証成功
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({
      jwt: newUserJwtToken,
    });
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: true, user: newUser, isNewUser: true },
      200,
    );
  });

  test('既存ユーザーの場合、認証のみが実行される', async () => {
    // Given: 既存ユーザーのJWTトークン
    const existingUserJwtToken = 'existing.user.jwt.token';
    const requestBody = { token: existingUserJwtToken };
    const createExistingUser = () =>
      UserEntity.create({
        externalId: 'existing789',
        provider: AuthProviders.GOOGLE,
        email: 'existing@example.com',
        name: 'Existing User',
      });
    const existingUser = createExistingUser();

    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() =>
      Promise.resolve({ user: existingUser, isNewUser: false }),
    );

    // When: 既存ユーザーの認証を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 既存ユーザーとして認証成功（isNewUser: false）
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({
      jwt: existingUserJwtToken,
    });
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: true, user: existingUser, isNewUser: false },
      200,
    );
  });

  // 異常系テスト
  test('不正なJWTトークンが提供された場合、認証エラーが返される', async () => {
    // Given: 不正なJWTトークン
    const invalidJwtToken = 'invalid.jwt.token';
    const requestBody = { token: invalidJwtToken };

    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() =>
      Promise.reject(
        new AuthenticationError('INVALID_TOKEN', 'Invalid JWT token'),
      ),
    );

    // When: 不正なJWTで認証を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 401エラーが返される
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({
      jwt: invalidJwtToken,
    });
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Invalid JWT token' },
      401,
    );
  });

  test('期限切れのJWTトークンが提供された場合、認証エラーが返される', async () => {
    // Given: 期限切れのJWTトークン
    const expiredJwtToken = 'expired.jwt.token';
    const requestBody = { token: expiredJwtToken };

    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() =>
      Promise.reject(
        new AuthenticationError('TOKEN_EXPIRED', 'JWT token has expired'),
      ),
    );

    // When: 期限切れJWTで認証を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 401エラーが返される
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({
      jwt: expiredJwtToken,
    });
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'JWT token has expired' },
      401,
    );
  });

  test('tokenフィールドが不足している場合、バリデーションエラーが返される', async () => {
    // Given: tokenフィールドが不足したリクエスト
    const requestBodyWithoutToken = {};

    mockContext.req.json = mock(() => Promise.resolve(requestBodyWithoutToken));

    // When: バリデーション処理を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 400バリデーションエラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Token is required' },
      400,
    );
  });

  test('空文字のtokenが提供された場合、バリデーションエラーが返される', async () => {
    // Given: 空文字のtoken
    const requestBodyWithEmptyToken = { token: '' };

    mockContext.req.json = mock(() =>
      Promise.resolve(requestBodyWithEmptyToken),
    );

    // When: 空文字tokenでバリデーションを実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 400バリデーションエラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Token cannot be empty' },
      400,
    );
  });

  test('不正な形式のJSONが送信された場合、パースエラーが返される', async () => {
    // Given: 不正なJSONリクエスト
    mockContext.req.json = mock(() =>
      Promise.reject(new Error('Invalid JSON format')),
    );

    // When: JSONパース処理を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 400JSONパースエラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Invalid JSON format' },
      400,
    );
  });

  test('外部サービスエラーが発生した場合、適切なエラーレスポンスが返される', async () => {
    // Given: 外部サービスエラーが発生する条件
    const validJwtToken = 'valid.jwt.token';
    const requestBody = { token: validJwtToken };

    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() =>
      Promise.reject(new Error('External service unavailable')),
    );

    // When: 認証処理を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 500ステータスで内部サーバーエラーが返される
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({
      jwt: validJwtToken,
    });
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Internal server error' },
      500,
    );
  });

  test('予期しないエラーが発生した場合、汎用エラーレスポンスが返される', async () => {
    // Given: 予期しないエラーが発生する条件
    const validJwtToken = 'valid.jwt.token';
    const requestBody = { token: validJwtToken };

    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() =>
      Promise.reject(new TypeError('Unexpected error')),
    );

    // When: 認証処理を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 500ステータスで汎用エラーが返される
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({
      jwt: validJwtToken,
    });
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Internal server error' },
      500,
    );
  });

  test('GETメソッドでリクエストされた場合、405エラーが返される', async () => {
    // Given: GETメソッドでのリクエスト
    mockContext = {
      ...mockContext,
      req: {
        ...mockContext.req,
        method: 'GET',
      },
    };

    // When: 認証処理を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 405ステータスでメソッド不許可エラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Method not allowed' },
      405,
    );
  });

  test('不正なContent-Typeでリクエストされた場合、415エラーが返される', async () => {
    // Given: 不正なContent-Typeでのリクエスト
    mockContext = {
      ...mockContext,
      req: {
        ...mockContext.req,
        header: mock((headerName?: string) => {
          if (headerName && headerName.toLowerCase() === 'content-type')
            return 'text/plain';
          return undefined;
        }),
      },
    };

    // When: 認証処理を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 415Content-Type不正エラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Content-Type must be application/json' },
      415,
    );
  });

  test('不正なURLパスでリクエストされた場合、404エラーが返される', async () => {
    // Given: 不正なURLパスでのリクエスト
    mockContext = {
      ...mockContext,
      req: {
        ...mockContext.req,
        url: 'http://localhost:3000/api/auth/invalid-path',
      },
    };

    // When: 認証処理を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 404ステータスでエンドポイント不存在エラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Endpoint not found' },
      404,
    );
  });

  test('非常に長いトークン文字列が提供された場合、適切に処理される', async () => {
    // Given: 異常に長いトークン文字列を含むリクエスト
    const veryLongToken = 'a'.repeat(10000); // 10KB のトークン
    const requestBody = { token: veryLongToken };

    mockContext.req.json = mock(() => Promise.resolve(requestBody));

    // When: 認証処理を実行
    const _result = await authController.verifyToken(
      mockContext as unknown as Context,
    );

    // Then: 400ステータスでトークン長制限エラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Token is too long' },
      400,
    );
  });
});
