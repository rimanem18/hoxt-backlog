/**
 * AuthController のテストケース集
 */
import { describe, test, beforeEach, afterEach, expect, mock, spyOn } from 'bun:test';
import type { Context } from 'hono';
import type { Mock } from 'bun:test';
import { AuthController } from '../AuthController';
import type { IAuthenticateUserUseCase } from '@/application/interfaces/IAuthenticateUserUseCase';
import { AuthenticationError } from '@/domain/user/errors/AuthenticationError';
import { ValidationError } from '@/shared/errors/ValidationError';
import { UserEntity } from '@/domain/user/UserEntity';
import type { AuthProvider } from '@/domain/user/AuthProvider';
import { AuthProviders } from '@/domain/user/AuthProvider';
import type { AuthResponse, ErrorResponse } from '@/../../packages/shared-schemas';
import type { AuthenticateUserUseCaseOutput } from '@/application/interfaces/IAuthenticateUserUseCase';

type MockContext = {
  req: {
    json: Mock<() => Promise<any>>;
    header: Mock<(name?: string) => string | undefined>;
    method: string;
    url: string;
  };
  json: Mock<(data: any, status?: number) => any>;
  status: Mock<(code: number) => any>;
};

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthenticateUserUseCase: IAuthenticateUserUseCase;
  let mockContext: MockContext;

  beforeEach(() => {
    const createMockUser = () => UserEntity.create({
      externalId: 'test123',
      provider: AuthProviders.GOOGLE,
      email: 'test@example.com',
      name: 'Test User'
    });
    mockAuthenticateUserUseCase = {
      execute: mock(() => Promise.resolve({ 
        user: createMockUser(),
        isNewUser: false 
      })),
    } as IAuthenticateUserUseCase;

    authController = new AuthController(mockAuthenticateUserUseCase);

    mockContext = {
      req: {
        json: mock(() => Promise.resolve({})),
        header: mock(() => undefined),
        method: 'POST',
        url: 'http://localhost:3000/api/auth/verify'
      },
      json: mock((data: any, status?: number) => ({ data, status })),
      status: mock((code: number) => mockContext),
    };
  });

  afterEach(() => {
    mock.restore();
  });

  test('有効なJWTトークンが提供された場合、認証に成功する', async () => {

    // Given: 有効なJWTトークンと認証成功条件
    const validJwtToken = 'valid.jwt.token';
    const requestBody = { token: validJwtToken };
    const createExpectedUser = () => UserEntity.create({
      externalId: 'user123',
      provider: AuthProviders.GOOGLE,
      email: 'test@example.com',
      name: 'Test User'
    });
    const expectedUser = createExpectedUser();
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody)) as any;
    mockAuthenticateUserUseCase.execute = mock(() => Promise.resolve({ user: expectedUser, isNewUser: false })) as any;

    // When: 認証コントローラーを実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // Then: 認証成功レスポンスが返される
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: validJwtToken });
    expect(mockContext.json).toHaveBeenCalledWith({ success: true, user: expectedUser, isNewUser: false }, 200);
  });

  test('新規ユーザーの場合、JITプロビジョニングによりユーザーが作成される', async () => {
    // Given: 新規ユーザーのJWTトークン
    const newUserJwtToken = 'new.user.jwt.token';
    const requestBody = { token: newUserJwtToken };
    const createNewUser = () => UserEntity.create({
      externalId: 'newuser456',
      provider: AuthProviders.GOOGLE,
      email: 'newuser@example.com',
      name: 'New User'
    });
    const newUser = createNewUser();
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody)) as any;
    mockAuthenticateUserUseCase.execute = mock(() => Promise.resolve({ user: newUser, isNewUser: true })) as any;

    // When: 新規ユーザーの認証を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // Then: JITプロビジョニングによる新規ユーザー作成と認証成功
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: newUserJwtToken });
    expect(mockContext.json).toHaveBeenCalledWith({ success: true, user: newUser, isNewUser: true }, 200);
  });

  test('既存ユーザーの場合、認証のみが実行される', async () => {
    // Given: 既存ユーザーのJWTトークン
    const existingUserJwtToken = 'existing.user.jwt.token';
    const requestBody = { token: existingUserJwtToken };
    const createExistingUser = () => UserEntity.create({
      externalId: 'existing789',
      provider: AuthProviders.GOOGLE,
      email: 'existing@example.com',
      name: 'Existing User'
    });
    const existingUser = createExistingUser();
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody)) as any;
    mockAuthenticateUserUseCase.execute = mock(() => Promise.resolve({ user: existingUser, isNewUser: false })) as any;

    // When: 既存ユーザーの認証を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // Then: 既存ユーザーとして認証成功（isNewUser: false）
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: existingUserJwtToken });
    expect(mockContext.json).toHaveBeenCalledWith({ success: true, user: existingUser, isNewUser: false }, 200);
  });

  // 異常系テスト
  test('不正なJWTトークンが提供された場合、認証エラーが返される', async () => {
    // Given: 不正なJWTトークン
    const invalidJwtToken = 'invalid.jwt.token';
    const requestBody = { token: invalidJwtToken };
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody)) as any;
    mockAuthenticateUserUseCase.execute = mock(() => Promise.reject(new AuthenticationError('Invalid JWT token'))) as any;

    // When: 不正なJWTで認証を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // Then: 401エラーが返される
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: invalidJwtToken });
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Invalid JWT token' }, 401);
  });

  test('期限切れのJWTトークンが提供された場合、認証エラーが返される', async () => {
    // Given: 期限切れのJWTトークン
    const expiredJwtToken = 'expired.jwt.token';
    const requestBody = { token: expiredJwtToken };
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody)) as any;
    mockAuthenticateUserUseCase.execute = mock(() => Promise.reject(new AuthenticationError('JWT token has expired'))) as any;

    // When: 期限切れJWTで認証を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // Then: 401エラーが返される
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: expiredJwtToken });
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'JWT token has expired' }, 401);
  });

  test('tokenフィールドが不足している場合、バリデーションエラーが返される', async () => {
    // Given: tokenフィールドが不足したリクエスト
    const requestBodyWithoutToken = {};
    
    mockContext.req.json = mock(() => Promise.resolve(requestBodyWithoutToken)) as any;

    // When: バリデーション処理を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // Then: 400バリデーションエラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Token is required' }, 400);
  });

  test('空文字のtokenが提供された場合、バリデーションエラーが返される', async () => {
    // Given: 空文字のtoken
    const requestBodyWithEmptyToken = { token: '' };
    
    mockContext.req.json = mock(() => Promise.resolve(requestBodyWithEmptyToken)) as any;

    // When: 空文字tokenでバリデーションを実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // Then: 400バリデーションエラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Token cannot be empty' }, 400);
  });

  test('不正な形式のJSONが送信された場合、パースエラーが返される', async () => {
    // Given: 不正なJSONリクエスト
    mockContext.req.json = mock(() => Promise.reject(new Error('Invalid JSON format'))) as any;

    // When: JSONパース処理を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // Then: 400JSONパースエラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Invalid JSON format' }, 400);
  });

  test('外部サービスエラーが発生した場合、適切なエラーレスポンスが返される', async () => {
    // 【テスト目的】: Supabase等外部サービスエラー発生時の適切なエラーハンドリングを確認
    // 【テスト内容】: 外部サービス接続エラーが発生した際のエラーレスポンスを検証
    // 【期待される動作】: 500ステータスで内部サーバーエラーメッセージが返される
    // 🟡 信頼性レベル: 外部依存サービスのエラーハンドリングとして一般的な要件

    // 【テストデータ準備】: 有効なリクエストだが外部サービスエラーが発生する条件を模擬
    // 【初期条件設定】: 外部サービス接続エラーが発生する条件を設定
    const validJwtToken = 'valid.jwt.token';
    const requestBody = { token: validJwtToken };
    
    // 🟢 【型安全性改善】: モックメソッドに適切な型を指定
    mockContext.req.json = mock(() => Promise.resolve(requestBody)) as any;
    mockAuthenticateUserUseCase.execute = mock(() => Promise.reject(new Error('External service unavailable'))) as any;

    // 【実際の処理実行】: 外部サービスエラー時の処理を実行
    // 【処理内容】: 外部サービス呼び出しとエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // 【結果検証】: 外部サービスエラーが適切に処理されたことを検証
    // 【期待値確認】: 500ステータスで内部サーバーエラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: validJwtToken }); // 【確認内容】: UseCaseが正常に呼び出されたことを確認 🟡
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' }, 500); // 【確認内容】: 500ステータスで内部サーバーエラーが返されることを確認 🟡
  });

  test('予期しないエラーが発生した場合、汎用エラーレスポンスが返される', async () => {
    // 【テスト目的】: 想定外エラー発生時の適切なエラーハンドリングを確認
    // 【テスト内容】: 予期しない例外が発生した際の汎用エラーレスポンスを検証
    // 【期待される動作】: 500ステータスで汎用エラーメッセージが返される
    // 🔴 信頼性レベル: 一般的なエラーハンドリングパターンとして推測される内容

    // 【テストデータ準備】: 予期しないエラーが発生する条件を模擬
    // 【初期条件設定】: 想定外の例外が発生する条件を設定
    const validJwtToken = 'valid.jwt.token';
    const requestBody = { token: validJwtToken };
    
    // 🟢 【型安全性改善】: モックメソッドに適切な型を指定
    mockContext.req.json = mock(() => Promise.resolve(requestBody)) as any;
    mockAuthenticateUserUseCase.execute = mock(() => Promise.reject(new TypeError('Unexpected error'))) as any;

    // 【実際の処理実行】: 予期しないエラー時の処理を実行
    // 【処理内容】: 例外捕捉と汎用エラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // 【結果検証】: 予期しないエラーが適切に処理されたことを検証
    // 【期待値確認】: 500ステータスで汎用エラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: validJwtToken }); // 【確認内容】: UseCaseが正常に呼び出されたことを確認 🔴
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' }, 500); // 【確認内容】: 500ステータスで汎用エラーが返されることを確認 🔴
  });

  // ========== 境界値テスト ==========
  test('GETメソッドでリクエストされた場合、405エラーが返される', async () => {
    // 【テスト目的】: 許可されていないHTTPメソッドに対する適切なエラーハンドリングを確認
    // 【テスト内容】: POST以外のHTTPメソッド（GET）でアクセスした際のエラーレスポンスを検証
    // 【期待される動作】: 405ステータスでメソッド不許可エラーメッセージが返される
    // 🟢 信頼性レベル: REST API の標準的なHTTPメソッド制限として明確

    // 【テストデータ準備】: GETメソッドでのリクエストを模擬
    // 【初期条件設定】: HTTPメソッド制限エラーが発生する条件を設定
    // 🟢 【型安全性改善】: MockContext型でmethodを設定
    mockContext = {
      ...mockContext,
      req: {
        ...mockContext.req,
        method: 'GET'
      }
    };

    // 【実際の処理実行】: 不許可HTTPメソッド時の処理を実行
    // 【処理内容】: HTTPメソッド検証とエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // 【結果検証】: HTTPメソッド制限エラーが適切に処理されたことを検証
    // 【期待値確認】: 405ステータスでメソッド不許可エラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled(); // 【確認内容】: UseCaseが呼び出されていないことを確認（メソッド制限前段での拒否） 🟢
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Method not allowed' }, 405); // 【確認内容】: 405ステータスでメソッド不許可エラーが返されることを確認 🟢
  });

  test('不正なContent-Typeでリクエストされた場合、415エラーが返される', async () => {
    // 【テスト目的】: 不適切なContent-Typeに対する適切なエラーハンドリングを確認
    // 【テスト内容】: application/json以外のContent-Typeでリクエストした際のエラーレスポンスを検証
    // 【期待される動作】: 415ステータスでContent-Type不正エラーメッセージが返される
    // 🟡 信頼性レベル: JSON API の一般的なContent-Type制限として推測

    // 【テストデータ準備】: 不正なContent-Typeでのリクエストを模擬
    // 【初期条件設定】: Content-Type制限エラーが発生する条件を設定
    // 🟢 【型安全性改善】: MockContext型でheaderメソッドを設定
    mockContext = {
      ...mockContext,
      req: {
        ...mockContext.req,
        header: mock((headerName?: string) => {
          if (headerName && headerName.toLowerCase() === 'content-type') return 'text/plain';
          return undefined;
        })
      }
    };

    // When: 不正Content-Typeで処理を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // Then: 415Content-Type不正エラーが返される
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Content-Type must be application/json' }, 415);
  });

  test('不正なURLパスでリクエストされた場合、404エラーが返される', async () => {
    // 【テスト目的】: 存在しないエンドポイントに対する適切なエラーハンドリングを確認
    // 【テスト内容】: /api/auth/verify以外のURLパスでアクセスした際のエラーレスポンスを検証
    // 【期待される動作】: 404ステータスでエンドポイント不存在エラーメッセージが返される
    // 🟡 信頼性レベル: REST API の一般的なルーティングエラーハンドリングとして推測

    // 【テストデータ準備】: 不正なURLパスでのリクエストを模擬
    // 【初期条件設定】: ルーティングエラーが発生する条件を設定
    // 🟢 【型安全性改善】: MockContext型でURLを設定
    mockContext = {
      ...mockContext,
      req: {
        ...mockContext.req,
        url: 'http://localhost:3000/api/auth/invalid-path'
      }
    };

    // 【実際の処理実行】: 不正URLパス時の処理を実行
    // 【処理内容】: URLパス検証とエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // 【結果検証】: URLパスエラーが適切に処理されたことを検証
    // 【期待値確認】: 404ステータスでエンドポイント不存在エラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled(); // 【確認内容】: UseCaseが呼び出されていないことを確認（ルーティング前段での拒否） 🟡
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Endpoint not found' }, 404); // 【確認内容】: 404ステータスでエンドポイント不存在エラーが返されることを確認 🟡
  });

  test('非常に長いトークン文字列が提供された場合、適切に処理される', async () => {
    // 【テスト目的】: 極端に長いトークン文字列に対する適切な処理を確認
    // 【テスト内容】: ペイロード制限を超える長さのトークンを送信し、適切に処理されることを検証
    // 【期待される動作】: 400ステータスでトークン長制限エラーメッセージが返される
    // 🔴 信頼性レベル: 具体的な制限値が要件定義にないため推測される内容

    // 【テストデータ準備】: 異常に長いトークン文字列を含むリクエストを模擬
    // 【初期条件設定】: トークン長制限エラーが発生する条件を設定
    const veryLongToken = 'a'.repeat(10000); // 10KB のトークン文字列
    const requestBody = { token: veryLongToken };
    
    // 🟢 【型安全性改善】: モックメソッドに適切な型を指定
    mockContext.req.json = mock(() => Promise.resolve(requestBody)) as any;

    // 【実際の処理実行】: 長いトークン時の処理を実行
    // 【処理内容】: トークン長制限検証とエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext as unknown as Context);

    // 【結果検証】: トークン長制限エラーが適切に処理されたことを検証
    // 【期待値確認】: 400ステータスでトークン長制限エラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled(); // 【確認内容】: UseCaseが呼び出されていないことを確認（トークン長制限前段での拒否） 🔴
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Token is too long' }, 400); // 【確認内容】: 400ステータスでトークン長制限エラーが返されることを確認 🔴
  });
});