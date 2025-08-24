/**
 * AuthController のテストケース集
 * JWT検証エンドポイント POST /api/auth/verify のテスト
 */
import { describe, test, beforeEach, afterEach, expect, mock, spyOn } from 'bun:test';
import type { Context } from 'hono';
import { AuthController } from '../AuthController';
import type { IAuthenticateUserUseCase } from '@/application/interfaces/IAuthenticateUserUseCase';
import { AuthenticationError } from '@/domain/user/errors/AuthenticationError';
import { ValidationError } from '@/shared/errors/ValidationError';
import { UserEntity } from '@/domain/user/UserEntity';
import type { AuthResponse, ErrorResponse } from '@/../../packages/shared-schemas';

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthenticateUserUseCase: IAuthenticateUserUseCase;
  let mockContext: Context;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にコントローラーとモックオブジェクトを初期化
    // 【環境初期化】: 前のテストの状態が影響しないよう、新しいモックインスタンスを作成
    mockAuthenticateUserUseCase = {
      execute: mock(() => Promise.resolve()),
    } as IAuthenticateUserUseCase;

    authController = new AuthController(mockAuthenticateUserUseCase);

    // 【Context モック準備】: Hono の Context をモック化
    // 【リクエスト/レスポンス準備】: HTTP リクエスト・レスポンスの動作を模擬
    mockContext = {
      req: {
        json: mock(() => Promise.resolve({})),
        header: mock(() => undefined),
        method: 'POST',
        url: 'http://localhost:3000/api/auth/verify'
      },
      json: mock((data: any, status?: number) => ({ data, status })),
      status: mock((code: number) => mockContext),
    } as unknown as Context;
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後にモックオブジェクトの状態をクリア
    // 【状態復元】: 次のテストに影響しないよう、モックの呼び出し履歴をリセット
    mock.restore();
  });

  // ========== 正常系テスト ==========
  test('有効なJWTトークンが提供された場合、認証に成功する', async () => {
    // 【テスト目的】: 有効なJWTトークンでの認証処理が正常に動作することを確認
    // 【テスト内容】: 正しい形式のJWTトークンを送信し、認証UseCaseが呼び出されることを検証
    // 【期待される動作】: 200ステータスで認証成功レスポンスが返される
    // 🟢 信頼性レベル: テストケース定義書に基づく標準的な正常系テスト

    // 【テストデータ準備】: 有効なJWTトークンを含むリクエストボディを模擬
    // 【初期条件設定】: 認証が成功する条件でUseCaseをモック化
    const validJwtToken = 'valid.jwt.token';
    const requestBody = { token: validJwtToken };
    const expectedUser = new UserEntity('user123', 'test@example.com', 'Test User');
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() => Promise.resolve({ user: expectedUser, isNewUser: false }));

    // 【実際の処理実行】: AuthController の verifyToken メソッドを呼び出し
    // 【処理内容】: JWTトークン検証と認証処理を実行
    const result = await authController.verifyToken(mockContext);

    // 【結果検証】: 認証成功時の期待値と実際の結果を比較
    // 【期待値確認】: HTTPステータス200と成功メッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: validJwtToken }); // 【確認内容】: UseCaseが正しいトークンで呼び出されたことを検証 🟢
    expect(mockContext.json).toHaveBeenCalledWith({ success: true, user: expectedUser, isNewUser: false }, 200); // 【確認内容】: 200ステータスで成功レスポンスが返されることを確認 🟢
  });

  test('新規ユーザーの場合、JITプロビジョニングによりユーザーが作成される', async () => {
    // 【テスト目的】: 新規ユーザーのJWT検証時にJust-In-Time プロビジョニングが動作することを確認
    // 【テスト内容】: 初回認証ユーザーのJWTトークンで認証し、新規ユーザー作成プロセスが実行されることを検証
    // 【期待される動作】: 新規ユーザーが作成され、認証成功レスポンスが返される
    // 🟢 信頼性レベル: 要件定義書で明確に規定されたJITプロビジョニング機能のテスト

    // 【テストデータ準備】: 新規ユーザーのJWTトークンを含むリクエストを模擬
    // 【初期条件設定】: JITプロビジョニングによる新規ユーザー作成が成功する条件を設定
    const newUserJwtToken = 'new.user.jwt.token';
    const requestBody = { token: newUserJwtToken };
    const newUser = new UserEntity('newuser456', 'newuser@example.com', 'New User');
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() => Promise.resolve({ user: newUser, success: true, isNewUser: true }));

    // 【実際の処理実行】: 新規ユーザーのJWT認証処理を実行
    // 【処理内容】: JITプロビジョニングによる新規ユーザー作成と認証を同時実行
    const result = await authController.verifyToken(mockContext);

    // 【結果検証】: JITプロビジョニングが正常に動作したことを検証
    // 【期待値確認】: 新規ユーザー作成成功と認証成功レスポンスが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: newUserJwtToken }); // 【確認内容】: 新規ユーザーのトークンでUseCaseが呼び出されたことを確認 🟢
    expect(mockContext.json).toHaveBeenCalledWith({ success: true, user: newUser, isNewUser: true }, 200); // 【確認内容】: JITプロビジョニング成功レスポンスが返されることを確認 🟢
  });

  test('既存ユーザーの場合、認証のみが実行される', async () => {
    // 【テスト目的】: 既存ユーザーのJWT認証時に新規作成処理が実行されないことを確認
    // 【テスト内容】: 登録済みユーザーのJWTトークンで認証し、ユーザー取得のみが行われることを検証
    // 【期待される動作】: 既存ユーザー情報が返され、新規作成フラグが設定されない
    // 🟢 信頼性レベル: 既存ユーザー認証は一般的な要件として明確

    // 【テストデータ準備】: 既存ユーザーのJWTトークンを含むリクエストを模擬
    // 【初期条件設定】: 既存ユーザーの認証が成功する条件を設定
    const existingUserJwtToken = 'existing.user.jwt.token';
    const requestBody = { token: existingUserJwtToken };
    const existingUser = new UserEntity('existing789', 'existing@example.com', 'Existing User');
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() => Promise.resolve({ user: existingUser, success: true, isNewUser: false }));

    // 【実際の処理実行】: 既存ユーザーのJWT認証処理を実行
    // 【処理内容】: 既存ユーザーの認証とユーザー情報取得を実行
    const result = await authController.verifyToken(mockContext);

    // 【結果検証】: 既存ユーザー認証が正常に動作したことを検証
    // 【期待値確認】: 新規作成フラグが設定されずに認証成功レスポンスが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: existingUserJwtToken }); // 【確認内容】: 既存ユーザーのトークンでUseCaseが呼び出されたことを確認 🟢
    expect(mockContext.json).toHaveBeenCalledWith({ success: true, user: existingUser, isNewUser: false }, 200); // 【確認内容】: 既存ユーザー認証成功レスポンスが返されることを確認 🟢
  });

  // ========== 異常系テスト ==========
  test('不正なJWTトークンが提供された場合、認証エラーが返される', async () => {
    // 【テスト目的】: 不正な形式や改ざんされたJWTトークンに対する適切なエラーハンドリングを確認
    // 【テスト内容】: 無効なJWTトークンを送信し、認証エラーが正しく処理されることを検証
    // 【期待される動作】: 401ステータスで認証エラーメッセージが返される
    // 🟢 信頼性レベル: セキュリティ要件として明確に定義されたエラーハンドリング

    // 【テストデータ準備】: 不正なJWTトークンを含むリクエストを模擬
    // 【初期条件設定】: AuthenticationErrorが発生する条件を設定
    const invalidJwtToken = 'invalid.jwt.token';
    const requestBody = { token: invalidJwtToken };
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() => Promise.reject(new AuthenticationError('Invalid JWT token')));

    // 【実際の処理実行】: 不正なJWTトークンでの認証処理を実行
    // 【処理内容】: JWT検証失敗時のエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

    // 【結果検証】: 認証エラーが適切に処理されたことを検証
    // 【期待値確認】: 401ステータスでエラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: invalidJwtToken }); // 【確認内容】: 不正トークンでUseCaseが呼び出されたことを確認 🟢
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Invalid JWT token' }, 401); // 【確認内容】: 401ステータスで認証エラーが返されることを確認 🟢
  });

  test('期限切れのJWTトークンが提供された場合、認証エラーが返される', async () => {
    // 【テスト目的】: 期限切れJWTトークンに対する適切なエラーハンドリングを確認
    // 【テスト内容】: 有効期限を過ぎたJWTトークンを送信し、期限切れエラーが処理されることを検証
    // 【期待される動作】: 401ステータスで期限切れエラーメッセージが返される
    // 🟢 信頼性レベル: JWT仕様に基づく標準的なエラーケース

    // 【テストデータ準備】: 期限切れのJWTトークンを含むリクエストを模擬
    // 【初期条件設定】: JWT期限切れエラーが発生する条件を設定
    const expiredJwtToken = 'expired.jwt.token';
    const requestBody = { token: expiredJwtToken };
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() => Promise.reject(new AuthenticationError('JWT token has expired')));

    // 【実際の処理実行】: 期限切れJWTトークンでの認証処理を実行
    // 【処理内容】: JWT期限切れ検証とエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

    // 【結果検証】: 期限切れエラーが適切に処理されたことを検証
    // 【期待値確認】: 401ステータスで期限切れエラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).toHaveBeenCalledWith({ jwt: expiredJwtToken }); // 【確認内容】: 期限切れトークンでUseCaseが呼び出されたことを確認 🟢
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'JWT token has expired' }, 401); // 【確認内容】: 401ステータスで期限切れエラーが返されることを確認 🟢
  });

  test('tokenフィールドが不足している場合、バリデーションエラーが返される', async () => {
    // 【テスト目的】: 必須フィールドの不足に対する適切なバリデーションエラーハンドリングを確認
    // 【テスト内容】: tokenフィールドが含まれていないリクエストを送信し、バリデーションエラーが処理されることを検証
    // 【期待される動作】: 400ステータスでバリデーションエラーメッセージが返される
    // 🟢 信頼性レベル: API仕様として明確に定義された必須フィールドチェック

    // 【テストデータ準備】: tokenフィールドが欠落したリクエストボディを模擬
    // 【初期条件設定】: ValidationErrorが発生する条件を設定
    const requestBodyWithoutToken = {};
    
    mockContext.req.json = mock(() => Promise.resolve(requestBodyWithoutToken));

    // 【実際の処理実行】: tokenフィールド不足時の処理を実行
    // 【処理内容】: リクエストボディバリデーションとエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

    // 【結果検証】: バリデーションエラーが適切に処理されたことを検証
    // 【期待値確認】: 400ステータスでバリデーションエラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled(); // 【確認内容】: UseCaseが呼び出されていないことを確認（バリデーション前段での拒否） 🟢
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Token is required' }, 400); // 【確認内容】: 400ステータスでバリデーションエラーが返されることを確認 🟢
  });

  test('空文字のtokenが提供された場合、バリデーションエラーが返される', async () => {
    // 【テスト目的】: 空文字トークンに対する適切なバリデーションエラーハンドリングを確認
    // 【テスト内容】: 空文字列のtokenを送信し、バリデーションエラーが処理されることを検証
    // 【期待される動作】: 400ステータスでバリデーションエラーメッセージが返される
    // 🟡 信頼性レベル: 一般的なバリデーション要件として推測される内容

    // 【テストデータ準備】: 空文字列のtokenを含むリクエストボディを模擬
    // 【初期条件設定】: 空文字バリデーションエラーが発生する条件を設定
    const requestBodyWithEmptyToken = { token: '' };
    
    mockContext.req.json = mock(() => Promise.resolve(requestBodyWithEmptyToken));

    // 【実際の処理実行】: 空文字token時の処理を実行
    // 【処理内容】: トークン値のバリデーションとエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

    // 【結果検証】: 空文字バリデーションエラーが適切に処理されたことを検証
    // 【期待値確認】: 400ステータスで空文字エラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled(); // 【確認内容】: UseCaseが呼び出されていないことを確認（バリデーション前段での拒否） 🟡
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Token cannot be empty' }, 400); // 【確認内容】: 400ステータスで空文字エラーが返されることを確認 🟡
  });

  test('不正な形式のJSONが送信された場合、パースエラーが返される', async () => {
    // 【テスト目的】: 不正なJSON形式のリクエストに対する適切なエラーハンドリングを確認
    // 【テスト内容】: パース不可能なJSONを送信し、パースエラーが処理されることを検証
    // 【期待される動作】: 400ステータスでJSONパースエラーメッセージが返される
    // 🟡 信頼性レベル: HTTP API の一般的なエラーハンドリング要件として推測

    // 【テストデータ準備】: JSONパースエラーが発生するリクエストを模擬
    // 【初期条件設定】: JSON パースエラーが発生する条件を設定
    mockContext.req.json = mock(() => Promise.reject(new Error('Invalid JSON format')));

    // 【実際の処理実行】: 不正JSON時のエラーハンドリング処理を実行
    // 【処理内容】: JSONパース処理とエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

    // 【結果検証】: JSONパースエラーが適切に処理されたことを検証
    // 【期待値確認】: 400ステータスでJSONパースエラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled(); // 【確認内容】: UseCaseが呼び出されていないことを確認（JSON パース失敗時） 🟡
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Invalid JSON format' }, 400); // 【確認内容】: 400ステータスでJSONパースエラーが返されることを確認 🟡
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
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() => Promise.reject(new Error('External service unavailable')));

    // 【実際の処理実行】: 外部サービスエラー時の処理を実行
    // 【処理内容】: 外部サービス呼び出しとエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

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
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody));
    mockAuthenticateUserUseCase.execute = mock(() => Promise.reject(new TypeError('Unexpected error')));

    // 【実際の処理実行】: 予期しないエラー時の処理を実行
    // 【処理内容】: 例外捕捉と汎用エラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

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
    mockContext.req.method = 'GET';

    // 【実際の処理実行】: 不許可HTTPメソッド時の処理を実行
    // 【処理内容】: HTTPメソッド検証とエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

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
    mockContext.req.header = mock((headerName: string) => {
      if (headerName.toLowerCase() === 'content-type') return 'text/plain';
      return undefined;
    });

    // 【実際の処理実行】: 不正Content-Type時の処理を実行
    // 【処理内容】: Content-Type検証とエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

    // 【結果検証】: Content-Type制限エラーが適切に処理されたことを検証
    // 【期待値確認】: 415ステータスでContent-Type不正エラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled(); // 【確認内容】: UseCaseが呼び出されていないことを確認（Content-Type制限前段での拒否） 🟡
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Content-Type must be application/json' }, 415); // 【確認内容】: 415ステータスでContent-Type不正エラーが返されることを確認 🟡
  });

  test('不正なURLパスでリクエストされた場合、404エラーが返される', async () => {
    // 【テスト目的】: 存在しないエンドポイントに対する適切なエラーハンドリングを確認
    // 【テスト内容】: /api/auth/verify以外のURLパスでアクセスした際のエラーレスポンスを検証
    // 【期待される動作】: 404ステータスでエンドポイント不存在エラーメッセージが返される
    // 🟡 信頼性レベル: REST API の一般的なルーティングエラーハンドリングとして推測

    // 【テストデータ準備】: 不正なURLパスでのリクエストを模擬
    // 【初期条件設定】: ルーティングエラーが発生する条件を設定
    mockContext.req.url = 'http://localhost:3000/api/auth/invalid-path';

    // 【実際の処理実行】: 不正URLパス時の処理を実行
    // 【処理内容】: URLパス検証とエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

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
    
    mockContext.req.json = mock(() => Promise.resolve(requestBody));

    // 【実際の処理実行】: 長いトークン時の処理を実行
    // 【処理内容】: トークン長制限検証とエラーハンドリング処理を実行
    const result = await authController.verifyToken(mockContext);

    // 【結果検証】: トークン長制限エラーが適切に処理されたことを検証
    // 【期待値確認】: 400ステータスでトークン長制限エラーメッセージが返されることを確認
    expect(mockAuthenticateUserUseCase.execute).not.toHaveBeenCalled(); // 【確認内容】: UseCaseが呼び出されていないことを確認（トークン長制限前段での拒否） 🔴
    expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Token is too long' }, 400); // 【確認内容】: 400ステータスでトークン長制限エラーが返されることを確認 🔴
  });
});