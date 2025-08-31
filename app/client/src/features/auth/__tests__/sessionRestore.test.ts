import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

describe('セッション復元機能', () => {
  const FIXED_TIME = 1756562945000;

  beforeEach(() => {
    // Date.nowを固定値にモックしてテストの安定性を確保
    global.Date.now = mock(() => FIXED_TIME);
  });

  afterAll(() => {
    // テスト終了後にDate.nowを復元
    global.Date.now = Date.now;
  });
  test('ページリロード時の自動認証状態復元', () => {
    // Given: 有効なセッションデータの準備
    const _mockSessionData = {
      accessToken: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
      },
      expiresAt: FIXED_TIME + 3600000, // 1時間後の有効期限
    };

    // When: SessionRestoreServiceのインスタンス化
    const {
      SessionRestoreService,
    } = require('../services/sessionRestoreService');
    const sessionService = new SessionRestoreService();

    // Then: 必要メソッドの存在確認
    expect(typeof sessionService.restoreSession).toBe('function');
    expect(typeof sessionService.clearSession).toBe('function');
  });

  test('有効期限切れセッションの自動クリア', () => {
    // Given: 期限切れのセッションデータ
    const expiredSessionData = {
      accessToken: 'expired-jwt-token',
      refreshToken: 'expired-refresh-token',
      user: {
        id: '456',
        externalId: '456',
        provider: 'google' as const,
        email: 'expired@example.com',
        name: 'Expired User',
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
      },
      expiresAt: FIXED_TIME - 3600000, // 1時間前（期限切れ）
    };

    // When: セッション有効性確認と期限切れセッションのクリア
    const {
      SessionRestoreService,
    } = require('../services/sessionRestoreService');
    const sessionService = new SessionRestoreService();

    const isValid = sessionService.isSessionValid(expiredSessionData);
    const clearResult = sessionService.clearExpiredSession();

    // Then: 期限切れセッションが無効と判定され、クリア処理が成功することを確認
    expect(isValid).toBe(false);
    expect(clearResult.success).toBe(true);
  });

  test('セッション復元とRedux状態の同期', () => {
    // Given: モックReduxストアと有効なセッションデータ
    const mockStore = {
      dispatch: mock(() => {}),
      getState: () => ({
        auth: {
          isAuthenticated: false,
          user: null,
          isLoading: true,
          error: null,
        },
      }),
    };

    const validSessionData = {
      accessToken: 'valid-jwt-token',
      refreshToken: 'valid-refresh-token',
      user: {
        id: '789',
        externalId: '789',
        provider: 'google' as const,
        email: 'restored@example.com',
        name: 'Restored User',
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
      },
      expiresAt: FIXED_TIME + 3600000, // 1時間後の有効期限
    };

    // When: Reduxストア連携でセッション復元を実行
    const {
      SessionRestoreService,
    } = require('../services/sessionRestoreService');
    const sessionService = new SessionRestoreService(mockStore);
    const restoreResult =
      sessionService.restoreSessionWithRedux(validSessionData);

    // Then: セッション復元が成功し、適切なReduxアクションがdispatchされることを確認
    expect(restoreResult.success).toBe(true);
    expect(mockStore.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth/authSuccess',
        payload: expect.objectContaining({
          user: expect.objectContaining({
            id: validSessionData.user.id,
            email: validSessionData.user.email,
            name: validSessionData.user.name,
            avatarUrl: null,
          }),
          isNewUser: false,
        }),
      }),
    );
  });

  test('セッションリフレッシュトークンによる自動更新', () => {
    // Given: 期限切れ間近のセッションと期待される新しいトークンデータ
    const sessionNearExpiry = {
      accessToken: 'expiring-jwt-token',
      refreshToken: 'valid-refresh-token',
      expiresAt: FIXED_TIME + 300000, // 5分後（更新が必要な状態）
      user: {
        id: '999',
        externalId: '999',
        provider: 'google' as const,
        email: 'refresh@example.com',
        name: 'Refresh User',
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
      },
    };

    const expectedNewTokens = {
      accessToken: 'new-jwt-token',
      refreshToken: 'new-refresh-token',
      expiresAt: FIXED_TIME + 3600000, // 新しい有効期限
    };

    // When: リフレッシュトークンを使用してセッション更新を実行
    const {
      SessionRestoreService,
    } = require('../services/sessionRestoreService');
    const sessionService = new SessionRestoreService();
    const refreshResult = sessionService.refreshSession(
      sessionNearExpiry.refreshToken,
    );

    // Then: セッションリフレッシュが成功し、新しいトークンが取得されることを確認
    expect(refreshResult.success).toBe(true);
    expect(refreshResult.newTokens).toEqual(expectedNewTokens);
    expect(typeof sessionService.scheduleTokenRefresh).toBe('function');
  });
});
