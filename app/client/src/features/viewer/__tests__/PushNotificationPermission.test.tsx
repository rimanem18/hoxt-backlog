import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PushNotificationPermission } from '../components/PushNotificationPermission';
import type { useRegisterPushSubscription } from '../hooks/useRegisterPushSubscription';
import { useUpdateNotificationSetting } from '../hooks/useUpdateNotificationSetting';
import { useViewerAccessibleProjects } from '../hooks/useViewerAccessibleProjects';
import { ViewerServicesProvider } from '../lib/ViewerServicesContext';

function renderWithMock(
  useRegisterPushSubscriptionMock: typeof useRegisterPushSubscription,
) {
  return render(
    <ViewerServicesProvider
      services={{
        useViewerAccessibleProjects,
        useUpdateNotificationSetting,
        useRegisterPushSubscription: useRegisterPushSubscriptionMock,
      }}
    >
      <PushNotificationPermission />
    </ViewerServicesProvider>,
  );
}

describe('PushNotificationPermission', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('許可済みの場合は許可済みメッセージのみ表示される', () => {
    // Given: 許可済み状態のモック
    renderWithMock(
      mock(() => ({
        permissionState: 'granted',
        isRegistering: false,
        error: null,
        requestPermission: mock(() => {}),
      })),
    );

    // When & Then: 許可済みメッセージが表示され、ボタンは表示されない
    expect(screen.getByText('通知は許可されています')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('未許可の場合は許可を求めるボタンが表示される', () => {
    // Given: 未許可状態のモック
    renderWithMock(
      mock(() => ({
        permissionState: 'default',
        isRegistering: false,
        error: null,
        requestPermission: mock(() => {}),
      })),
    );

    // When & Then: 許可を求めるボタンが表示される
    expect(
      screen.getByRole('button', { name: '通知を許可する' }),
    ).toBeDefined();
  });

  test('ボタンをクリックするとrequestPermissionが呼ばれる', async () => {
    // Given: 未許可状態のモック
    const user = userEvent.setup();
    const mockRequestPermission = mock(() => {});
    renderWithMock(
      mock(() => ({
        permissionState: 'default',
        isRegistering: false,
        error: null,
        requestPermission: mockRequestPermission,
      })),
    );

    // When: 許可を求めるボタンをクリック
    await user.click(screen.getByRole('button', { name: '通知を許可する' }));

    // Then: requestPermissionが呼ばれる
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  test('拒否済みの場合は拒否メッセージが表示されボタンは表示されない', () => {
    // Given: 拒否済み状態のモック
    renderWithMock(
      mock(() => ({
        permissionState: 'denied',
        isRegistering: false,
        error: null,
        requestPermission: mock(() => {}),
      })),
    );

    // When & Then: 拒否メッセージが表示され、ボタンは表示されない
    expect(
      screen.getByText(
        '通知が拒否されています。ブラウザの設定から許可してください',
      ),
    ).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('許可済みだが購読登録に失敗した場合は再試行ボタンが表示される', () => {
    // Given: 許可済みだが購読登録エラーがある状態のモック
    renderWithMock(
      mock(() => ({
        permissionState: 'granted',
        isRegistering: false,
        error: new Error('購読の登録に失敗しました'),
        requestPermission: mock(() => {}),
      })),
    );

    // When & Then: 許可済みメッセージは表示されず、再試行ボタンが表示される
    expect(screen.queryByText('通知は許可されています')).toBeNull();
    expect(screen.getByRole('button', { name: '再試行する' })).toBeDefined();
    expect(screen.getByText('購読の登録に失敗しました')).toBeDefined();
  });

  test('許可済みで再試行ボタンをクリックするとrequestPermissionが呼ばれる', async () => {
    // Given: 許可済みだが購読登録エラーがある状態のモック
    const user = userEvent.setup();
    const mockRequestPermission = mock(() => {});
    renderWithMock(
      mock(() => ({
        permissionState: 'granted',
        isRegistering: false,
        error: new Error('購読の登録に失敗しました'),
        requestPermission: mockRequestPermission,
      })),
    );

    // When: 再試行ボタンをクリック
    await user.click(screen.getByRole('button', { name: '再試行する' }));

    // Then: requestPermissionが呼ばれる
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  test('未対応環境では何も表示されない', () => {
    // Given: 未対応状態のモック
    const { container } = renderWithMock(
      mock(() => ({
        permissionState: 'unsupported',
        isRegistering: false,
        error: null,
        requestPermission: mock(() => {}),
      })),
    );

    // When & Then: 何も表示されない
    expect(container).toBeEmptyDOMElement();
  });

  test('登録中はボタンが無効化され登録中である旨が表示される', () => {
    // Given: 登録処理中状態のモック
    renderWithMock(
      mock(() => ({
        permissionState: 'default',
        isRegistering: true,
        error: null,
        requestPermission: mock(() => {}),
      })),
    );

    // When & Then: ボタンが無効化され登録中の文言が表示される
    expect(screen.getByRole('button', { name: '登録中...' })).toBeDisabled();
  });

  test('購読登録が失敗した場合はエラーメッセージが表示される', () => {
    // Given: エラー状態のモック
    renderWithMock(
      mock(() => ({
        permissionState: 'default',
        isRegistering: false,
        error: new Error('購読の登録に失敗しました'),
        requestPermission: mock(() => {}),
      })),
    );

    // When & Then: エラーメッセージが表示される
    expect(screen.getByText('購読の登録に失敗しました')).toBeDefined();
  });
});
