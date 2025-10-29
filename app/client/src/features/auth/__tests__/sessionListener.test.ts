import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import * as sessionPersistenceModule from '@/features/auth/services/sessionPersistence';
import { authSlice } from '@/features/auth/store/authSlice';
import { authListenerMiddleware } from '@/features/auth/store/sessionListener';
import type { User } from '@/features/auth/types/auth';

describe('sessionListener', () => {
  let store: ReturnType<typeof configureStore>;
  let saveSpy: ReturnType<typeof mock>;
  let clearSpy: ReturnType<typeof mock>;
  let originalSave: typeof sessionPersistenceModule.sessionPersistence.save;
  let originalClear: typeof sessionPersistenceModule.sessionPersistence.clear;

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
    // 元の実装を保存
    originalSave = sessionPersistenceModule.sessionPersistence.save;
    originalClear = sessionPersistenceModule.sessionPersistence.clear;

    // sessionPersistence のメソッドをモック化
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
    // 元の実装を復元
    sessionPersistenceModule.sessionPersistence.save = originalSave;
    sessionPersistenceModule.sessionPersistence.clear = originalClear;
    mock.restore();
  });

  it('authSuccess時にLocalStorageへ保存される', () => {
    // Given: 初期状態

    // When: authSuccess アクションをディスパッチ
    store.dispatch(
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );

    // Then: sessionPersistence.save が呼ばれる
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(mockUser);
  });

  it('logout時にLocalStorageがクリアされる', () => {
    // Given: 認証済み状態
    store.dispatch(
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );

    // When: logout アクションをディスパッチ
    store.dispatch(authSlice.actions.logout());

    // Then: sessionPersistence.clear が呼ばれる
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('handleExpiredToken時にLocalStorageがクリアされる', () => {
    // Given: 認証済み状態
    store.dispatch(
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );

    // When: handleExpiredToken アクションをディスパッチ
    store.dispatch(authSlice.actions.handleExpiredToken());

    // Then: sessionPersistence.clear が呼ばれる
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
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('無関係なアクションではLocalStorageに影響しない', () => {
    // Given: 初期状態

    // When: authStart アクションをディスパッチ（副作用を持たないアクション）
    store.dispatch(authSlice.actions.authStart());

    // Then: sessionPersistence が呼ばれない
    expect(saveSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
