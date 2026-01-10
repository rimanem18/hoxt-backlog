import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  mock,
  test,
} from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import type { UnknownAction } from 'redux';
import type { AuthValidationResult } from '@/shared/utils/authValidation';
import Provider, { type ProviderServices } from '../provider';

describe('Provider', () => {
  // モックサービスの定義
  let mockServices: ProviderServices;
  let mockDispatch: Mock<[action: UnknownAction], void>;
  let mockSetAuthErrorCallback: Mock<
    [callback: (error: { status: number; message?: string }) => void],
    void
  >;
  let mockSetAuthToken: Mock<[token: string], void>;
  let mockValidateStoredAuth: Mock<[], AuthValidationResult>;
  let mockRestoreAuthState: Mock<
    [payload: { user: unknown; isNewUser: boolean }],
    { type: string }
  >;
  let mockFinishAuthRestore: Mock<[], { type: string }>;
  let mockHandleExpiredToken: Mock<[], { type: string }>;
  let mockLogout: Mock<[], { type: string }>;
  let registeredCallback:
    | ((error: { status: number; message?: string }) => void)
    | null = null;

  beforeEach(() => {
    // 各テスト前にモックをリセット
    registeredCallback = null;

    // モック関数を作成
    mockDispatch = mock(() => {});
    mockSetAuthErrorCallback = mock((callback) => {
      registeredCallback = callback;
    });
    mockSetAuthToken = mock(() => {});
    mockValidateStoredAuth = mock(() => ({
      isValid: false,
      reason: 'missing',
    }));
    mockRestoreAuthState = mock(() => ({ type: 'auth/restoreAuthState' }));
    mockFinishAuthRestore = mock(() => ({ type: 'auth/finishAuthRestore' }));
    mockHandleExpiredToken = mock(() => ({ type: 'auth/handleExpiredToken' }));
    mockLogout = mock(() => ({ type: 'auth/logout' }));

    // モックサービスを作成
    mockServices = {
      store: {
        dispatch: mockDispatch,
      },
      setAuthErrorCallback: mockSetAuthErrorCallback,
      setAuthToken: mockSetAuthToken,
      validateStoredAuth: mockValidateStoredAuth,
      restoreAuthState: mockRestoreAuthState,
      finishAuthRestore: mockFinishAuthRestore,
      handleExpiredToken: mockHandleExpiredToken,
      logout: mockLogout,
    };
  });

  afterEach(() => {
    // テスト後にクリーンアップ
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('Provider が正常にレンダリングされる', () => {
    // When: Provider をレンダリング
    render(
      <Provider services={mockServices}>
        <div data-testid="child">Test Child</div>
      </Provider>,
    );

    // Then: 子要素が表示される
    expect(screen.getByTestId('child')).toBeDefined();
  });

  test('QueryClientProvider が子コンポーネントをラップする', () => {
    // When: Provider をレンダリング
    render(
      <Provider services={mockServices}>
        <div data-testid="child-unique">Test Child</div>
      </Provider>,
    );

    // Then: QueryClientProvider 経由で子要素がレンダリングされる
    expect(screen.getByTestId('child-unique')).toBeDefined();
  });

  test('複数回レンダリングしても同じ QueryClient インスタンスを使用する', () => {
    // Given: Provider を初回レンダリング
    const { rerender } = render(
      <Provider services={mockServices}>
        <div>First</div>
      </Provider>,
    );

    // When: 再レンダリング
    rerender(
      <Provider services={mockServices}>
        <div>Second</div>
      </Provider>,
    );

    // Then: エラーが発生しない（異なるインスタンスだとコンテキストエラーが発生）
    expect(screen.getByText('Second')).toBeDefined();
  });

  test('Provider mount 時に setAuthErrorCallback が呼び出される', () => {
    // When: Provider をレンダリング
    render(
      <Provider services={mockServices}>
        <div>Test</div>
      </Provider>,
    );

    // Then: setAuthErrorCallback が呼び出される
    expect(mockSetAuthErrorCallback).toHaveBeenCalledTimes(1);
    expect(registeredCallback).not.toBeNull();
  });

  test('登録されたコールバックが 401 エラーを受け取ると handleExpiredToken が dispatch される', () => {
    // Given: Provider をレンダリングしてコールバックを登録
    render(
      <Provider services={mockServices}>
        <div>Test</div>
      </Provider>,
    );

    expect(registeredCallback).not.toBeNull();

    // When: 登録されたコールバックを 401 エラーで呼び出し
    registeredCallback?.({ status: 401, message: 'Unauthorized' });

    // Then: handleExpiredToken が dispatch される
    expect(mockHandleExpiredToken).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'auth/handleExpiredToken',
    });
  });

  test('登録されたコールバックが 401 以外のエラーを受け取っても handleExpiredToken は dispatch されない', () => {
    // Given: Provider をレンダリングしてコールバックを登録
    render(
      <Provider services={mockServices}>
        <div>Test</div>
      </Provider>,
    );

    expect(registeredCallback).not.toBeNull();

    // テスト前の呼び出し回数をリセット
    mockHandleExpiredToken.mockClear();
    mockDispatch.mockClear();

    // When: 登録されたコールバックを 404 エラーで呼び出し
    registeredCallback?.({ status: 404, message: 'Not Found' });

    // Then: handleExpiredToken は dispatch されない
    expect(mockHandleExpiredToken).not.toHaveBeenCalled();
  });

  test('認証情報が missing の場合、finishAuthRestore が dispatch される', () => {
    // Given: 認証情報が missing を返すモック
    mockValidateStoredAuth.mockImplementation(() => ({
      isValid: false,
      reason: 'missing',
    }));

    // When: Provider をレンダリング
    render(
      <Provider services={mockServices}>
        <div>Test</div>
      </Provider>,
    );

    // Then: finishAuthRestore が dispatch される
    expect(mockValidateStoredAuth).toHaveBeenCalled();
    expect(mockFinishAuthRestore).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'auth/finishAuthRestore',
    });
  });

  test('認証情報が expired の場合、handleExpiredToken が dispatch される', () => {
    // Given: 認証情報が expired を返すモック
    mockValidateStoredAuth.mockImplementation(() => ({
      isValid: false,
      reason: 'expired',
    }));

    // When: Provider をレンダリング
    render(
      <Provider services={mockServices}>
        <div>Test</div>
      </Provider>,
    );

    // Then: handleExpiredToken が dispatch される
    expect(mockValidateStoredAuth).toHaveBeenCalled();
    expect(mockHandleExpiredToken).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'auth/handleExpiredToken',
    });
  });

  test('認証情報が invalid（その他のエラー）の場合、logout が dispatch される', () => {
    // Given: 認証情報が invalid を返すモック
    mockValidateStoredAuth.mockImplementation(() => ({
      isValid: false,
      reason: 'invalid',
    }));

    // When: Provider をレンダリング
    render(
      <Provider services={mockServices}>
        <div>Test</div>
      </Provider>,
    );

    // Then: logout が dispatch される
    expect(mockValidateStoredAuth).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'auth/logout',
    });
  });

  test('認証情報が有効な場合、restoreAuthState と setAuthToken が呼び出される', () => {
    // Given: 有効な認証情報を返すモック
    mockValidateStoredAuth.mockImplementation(() => ({
      isValid: true,
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' },
        isNewUser: false,
        access_token: 'test-token',
      },
    }));

    // When: Provider をレンダリング
    render(
      <Provider services={mockServices}>
        <div>Test</div>
      </Provider>,
    );

    // Then: restoreAuthState と setAuthToken が呼び出される
    expect(mockValidateStoredAuth).toHaveBeenCalled();
    expect(mockRestoreAuthState).toHaveBeenCalledWith({
      user: { id: 'test-user-id', email: 'test@example.com' },
      isNewUser: false,
    });
    expect(mockSetAuthToken).toHaveBeenCalledWith('test-token');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'auth/restoreAuthState',
    });
  });

  test('認証情報が有効だが access_token がない場合、setAuthToken は呼び出されない', () => {
    // Given: access_token がない有効な認証情報を返すモック
    mockValidateStoredAuth.mockImplementation(() => ({
      isValid: true,
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' },
        isNewUser: false,
      },
    }));

    // When: Provider をレンダリング
    render(
      <Provider services={mockServices}>
        <div>Test</div>
      </Provider>,
    );

    // Then: restoreAuthState は呼び出されるが、setAuthToken は呼び出されない
    expect(mockValidateStoredAuth).toHaveBeenCalled();
    expect(mockRestoreAuthState).toHaveBeenCalledWith({
      user: { id: 'test-user-id', email: 'test@example.com' },
      isNewUser: false,
    });
    expect(mockSetAuthToken).not.toHaveBeenCalled();
  });

  test('services 未指定時はデフォルトの services が使用される（後方互換性）', () => {
    // When: services を指定せずに Provider をレンダリング
    render(
      <Provider>
        <div data-testid="fallback-child">Fallback Test</div>
      </Provider>,
    );

    // Then: エラーなくレンダリングされる（デフォルトの services が使用される）
    expect(screen.getByTestId('fallback-child')).toBeDefined();
    expect(screen.getByText('Fallback Test')).toBeDefined();
  });
});
