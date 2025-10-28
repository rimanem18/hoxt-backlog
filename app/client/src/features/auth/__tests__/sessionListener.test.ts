import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import * as sessionPersistenceModule from '@/features/auth/services/sessionPersistence';
import { authSlice } from '@/features/auth/store/authSlice';
import { authListenerMiddleware } from '@/features/auth/store/sessionListener';
import type { User } from '@/packages/shared-schemas/src/auth';

describe('sessionListener', () => {
  let store: ReturnType<typeof configureStore>;
  let saveSpy: ReturnType<typeof mock>;
  let clearSpy: ReturnType<typeof mock>;

  const mockUser: User = {
    id: 'test-user-id',
    externalId: 'test-external-id',
    provider: 'google',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: '2025-01-27T00:00:00Z',
    updatedAt: '2025-01-27T00:00:00Z',
    lastLoginAt: '2025-01-27T00:00:00Z',
  };

  beforeEach(() => {
    // sessionPersistenceのメソッドをモック化
    saveSpy = mock(() => {});
    clearSpy = mock(() => {});
    sessionPersistenceModule.sessionPersistence.save = saveSpy;
    sessionPersistenceModule.sessionPersistence.clear = clearSpy;

    // テスト用のストアを作成
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(authListenerMiddleware.middleware),
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it('authSuccess時にLocalStorageへ保存される', async () => {
    // When: authSuccessアクションをディスパッチ
    store.dispatch(
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );

    // Then: 非同期処理を待機してsessionPersistence.saveが呼ばれる
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(mockUser);
  });

  it('logout時にLocalStorageがクリアされる', async () => {
    // Given: 認証済み状態
    store.dispatch(
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));

    // When: logoutアクションをディスパッチ
    store.dispatch(authSlice.actions.logout());

    // Then: sessionPersistence.clearが呼ばれる
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('handleExpiredToken時にLocalStorageがクリアされる', async () => {
    // Given: 認証済み状態
    store.dispatch(
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));

    // When: handleExpiredTokenアクションをディスパッチ
    store.dispatch(authSlice.actions.handleExpiredToken());

    // Then: sessionPersistence.clearが呼ばれる
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('Reducerは純粋関数でありLocalStorage操作を含まない', () => {
    // Given: モックがまだ呼ばれていない
    expect(saveSpy).not.toHaveBeenCalled();

    // When: Reducerを直接呼び出し（Listenerをバイパス）
    const state = authSlice.reducer(
      undefined,
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );

    // Then: Reducer内では副作用が実行されない（Listenerで実行される）
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    // Listenerは非同期で実行されるため、この時点ではまだ呼ばれていない
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
