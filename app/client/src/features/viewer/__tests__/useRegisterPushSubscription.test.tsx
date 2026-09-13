import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  mock,
  test,
} from 'bun:test';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { createApiClient } from '@/lib/api';
import { ApiClientProvider } from '@/lib/apiClientContext';
import { useRegisterPushSubscription } from '../hooks/useRegisterPushSubscription';

type MockFetch = Mock<[input: Request], Promise<Response>>;
let mockFetch: MockFetch;

/** ブラウザのNotification/ServiceWorker/PushManager APIをテスト用に定義する */
function setupSupportedBrowserApis(options: {
  permission: NotificationPermission;
  requestPermissionResult?: NotificationPermission;
  subscribeImpl?: () => Promise<{
    toJSON: () => {
      endpoint?: string;
      keys?: Record<string, string>;
    };
  }>;
}) {
  const mockRequestPermission = mock(() =>
    Promise.resolve(options.requestPermissionResult ?? options.permission),
  );

  Object.defineProperty(window, 'Notification', {
    value: {
      permission: options.permission,
      requestPermission: mockRequestPermission,
    },
    configurable: true,
  });

  Object.defineProperty(window, 'PushManager', {
    value: function PushManager() {},
    configurable: true,
  });

  const mockSubscribe = mock(
    options.subscribeImpl ??
      (() =>
        Promise.resolve({
          toJSON: () => ({
            endpoint: 'https://push.example.com/endpoint-1',
            keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
          }),
        })),
  );

  const mockRegister = mock(() =>
    Promise.resolve({ pushManager: { subscribe: mockSubscribe } }),
  );

  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register: mockRegister },
    configurable: true,
  });

  return { mockRequestPermission, mockRegister, mockSubscribe };
}

function cleanupBrowserApis() {
  Reflect.deleteProperty(window, 'Notification');
  Reflect.deleteProperty(window, 'PushManager');
  Reflect.deleteProperty(navigator, 'serviceWorker');
}

beforeEach(() => {
  mockFetch = mock();
});

afterEach(() => {
  cleanup();
  cleanupBrowserApis();
  mock.restore();
  mock.clearAllMocks();
});

function renderUseRegisterPushSubscription() {
  const mockClient = createApiClient('http://localhost:3001/api', undefined, {
    fetch: mockFetch as unknown as typeof fetch,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
  );

  return renderHook(() => useRegisterPushSubscription('test-token-abc'), {
    wrapper,
  });
}

describe('useRegisterPushSubscription', () => {
  test('Notification等のAPIが存在しない環境ではunsupportedになる', () => {
    // Given & When: ブラウザAPIを一切定義しない環境でレンダリング
    const { result } = renderUseRegisterPushSubscription();

    // Then: 未対応状態を返す
    expect(result.current.permissionState).toBe('unsupported');
  });

  test('初期表示時に許可済み状態がpermissionStateへ反映される', () => {
    // Given: Notification.permissionが'granted'の環境
    // （マウント時に自動実行される購読登録が例外にならないよう応答を用意する）
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: '9f7f0e1a-1b2c-4d3e-8f5a-1234567890ab',
            email: 'viewer@example.com',
            endpoint: 'https://push.example.com/endpoint-1',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    setupSupportedBrowserApis({ permission: 'granted' });

    // When: レンダリング
    const { result } = renderUseRegisterPushSubscription();

    // Then: 初期状態がgrantedになる
    expect(result.current.permissionState).toBe('granted');
  });

  test('初期表示時に拒否済み状態がpermissionStateへ反映される', () => {
    // Given: Notification.permissionが'denied'の環境
    setupSupportedBrowserApis({ permission: 'denied' });

    // When: レンダリング
    const { result } = renderUseRegisterPushSubscription();

    // Then: 初期状態がdeniedになる
    expect(result.current.permissionState).toBe('denied');
  });

  test('初期表示時に未許可状態がpermissionStateへ反映される', () => {
    // Given: Notification.permissionが'default'の環境
    setupSupportedBrowserApis({ permission: 'default' });

    // When: レンダリング
    const { result } = renderUseRegisterPushSubscription();

    // Then: 初期状態がdefaultになる
    expect(result.current.permissionState).toBe('default');
  });

  test('許可された場合はService Worker登録から購読登録APIまで実行され成功する', async () => {
    // Given: 未許可状態から許可されるとpushManager.subscribeが成功する環境
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: '9f7f0e1a-1b2c-4d3e-8f5a-1234567890ab',
            email: 'viewer@example.com',
            endpoint: 'https://push.example.com/endpoint-1',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { mockRegister, mockSubscribe } = setupSupportedBrowserApis({
      permission: 'default',
      requestPermissionResult: 'granted',
    });

    const { result } = renderUseRegisterPushSubscription();

    // When: 通知許可をリクエスト
    result.current.requestPermission();

    // Then: Service Worker登録・購読・API呼び出しが行われ、状態がgrantedになる
    // isRegisteringの初期値もfalseのため、完了の判定にはmockFetchの呼び出しを待つ
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const request = mockFetch.mock.calls[0]?.[0] as Request;
    const body = await request.json();
    expect(body).toEqual({
      endpoint: 'https://push.example.com/endpoint-1',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    });

    await waitFor(() => expect(result.current.isRegistering).toBe(false));
    expect(result.current.permissionState).toBe('granted');
    expect(mockRegister).toHaveBeenCalledWith('/sw.js');
    expect(mockSubscribe).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  test('拒否された場合は購読登録APIが呼ばれずpermissionStateがdeniedになる', async () => {
    // Given: 未許可状態から拒否される環境
    setupSupportedBrowserApis({
      permission: 'default',
      requestPermissionResult: 'denied',
    });

    const { result } = renderUseRegisterPushSubscription();

    // When: 通知許可をリクエスト
    result.current.requestPermission();

    // Then: permissionStateがdeniedになり、購読登録APIは呼ばれない
    await waitFor(() => expect(result.current.permissionState).toBe('denied'));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('購読取得に失敗した場合はエラー状態になり購読登録APIは呼ばれない', async () => {
    // Given: PushManager.subscribeが失敗する環境
    const { mockRegister } = setupSupportedBrowserApis({
      permission: 'default',
      requestPermissionResult: 'granted',
      subscribeImpl: () => Promise.reject(new Error('subscribe failed')),
    });

    const { result } = renderUseRegisterPushSubscription();

    // When: 通知許可をリクエスト
    result.current.requestPermission();

    // Then: エラー状態になり、購読登録APIは呼ばれない
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(mockRegister).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.isRegistering).toBe(false);
  });

  test('未対応環境でrequestPermissionを呼んでも何も起きない', () => {
    // Given: ブラウザAPI未定義（unsupported）環境
    const { result } = renderUseRegisterPushSubscription();

    // When: 通知許可をリクエスト
    result.current.requestPermission();

    // Then: 何も呼ばれず状態も変化しない
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.permissionState).toBe('unsupported');
  });

  test('初期状態がgrantedの場合はマウント時に自動で購読登録まで実行される', async () => {
    // Given: 既に通知が許可済み（前回訪問時に許可した等）の環境
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: '9f7f0e1a-1b2c-4d3e-8f5a-1234567890ab',
            email: 'viewer@example.com',
            endpoint: 'https://push.example.com/endpoint-1',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { mockRegister, mockSubscribe } = setupSupportedBrowserApis({
      permission: 'granted',
    });

    // When: レンダリング（許可要求ボタンのクリックは行わない）
    renderUseRegisterPushSubscription();

    // Then: 許可要求なしでService Worker登録・購読・API呼び出しが実行される
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockRegister).toHaveBeenCalledWith('/sw.js');
    expect(mockSubscribe).toHaveBeenCalled();
  });

  test('許可済み状態で購読登録に失敗した場合、requestPermissionの再呼び出しで再試行できる', async () => {
    // Given: 許可済みだが最初のsubscribeが失敗し、2回目は成功する環境
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: '9f7f0e1a-1b2c-4d3e-8f5a-1234567890ab',
            email: 'viewer@example.com',
            endpoint: 'https://push.example.com/endpoint-1',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    let callCount = 0;
    setupSupportedBrowserApis({
      permission: 'granted',
      subscribeImpl: () => {
        callCount += 1;
        if (callCount === 1) {
          return Promise.reject(new Error('subscribe failed'));
        }
        return Promise.resolve({
          toJSON: () => ({
            endpoint: 'https://push.example.com/endpoint-1',
            keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
          }),
        });
      },
    });
    const { result } = renderUseRegisterPushSubscription();

    // Then: マウント時の自動実行でエラー状態になる
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(mockFetch).not.toHaveBeenCalled();

    // When: requestPermissionを再度呼び出す（許可済みなのでプロンプトは出ない）
    result.current.requestPermission();

    // Then: 再試行が成功し、エラーがクリアされて購読登録APIが呼ばれる
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
