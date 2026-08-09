import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { User } from '@hoxt-backlog/shared-schemas/auth';
import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from '@/features/auth/store/authSlice';
import { authListenerMiddleware } from '@/features/auth/store/sessionListener';
import { VERIFIED_USER_DISPLAY_STORAGE_KEY } from '@/shared/utils/authValidation';

describe('sessionListener', () => {
  let store: ReturnType<typeof configureStore>;

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
    localStorage.clear();
  });

  it('authSuccess時にListenerが正常に動作する', () => {
    // Given: 初期状態

    // When: authSuccess アクションをディスパッチ
    store.dispatch(
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );

    // Then: エラーなく処理される
    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it('logout時にListenerが正常に動作する', () => {
    // Given: 認証済み状態
    store.dispatch(
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );

    // When: logout アクションをディスパッチ
    store.dispatch(authSlice.actions.logout());

    // Then: エラーなく処理される
    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('handleExpiredToken時にListenerが正常に動作する', () => {
    // Given: 認証済み状態
    store.dispatch(
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );

    // When: handleExpiredToken アクションをディスパッチ
    store.dispatch(authSlice.actions.handleExpiredToken());

    // Then: エラーなく処理される
    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('Reducerは純粋関数でありListenerで副作用が実行される', () => {
    // Given: 初期状態

    // When: Reducerを直接呼び出し（Listenerをバイパス）
    const state = authSlice.reducer(
      undefined,
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );

    // Then: Reducer内では状態のみ更新される
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it('無関係なアクションではListenerが反応しない', () => {
    // Given: 初期状態

    // When: authStart アクションをディスパッチ（Listenerが監視していないアクション）
    store.dispatch(authSlice.actions.authStart());

    // Then: エラーなく処理される
    const state = store.getState().auth;
    expect(state.isLoading).toBe(true);
  });

  it('authSuccess時に検証済みユーザー表示情報がlocalStorageにキャッシュされる', () => {
    // Given: 初期状態

    // When: authSuccess アクションをディスパッチ
    store.dispatch(
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }),
    );

    // Then: name/avatarUrlがexternalIdと紐づけてキャッシュされる
    const cached = JSON.parse(
      localStorage.getItem(VERIFIED_USER_DISPLAY_STORAGE_KEY) ?? 'null',
    );
    expect(cached).toEqual({
      externalId: mockUser.externalId,
      name: mockUser.name,
      avatarUrl: mockUser.avatarUrl,
    });
  });

  it('restoreAuthState時はキャッシュへの書き込みが行われない', () => {
    // Given: 別ユーザー宛の検証済みキャッシュが既に存在する
    const existingCache = {
      externalId: 'other-external-id',
      name: '既存キャッシュ',
      avatarUrl: null,
    };
    localStorage.setItem(
      VERIFIED_USER_DISPLAY_STORAGE_KEY,
      JSON.stringify(existingCache),
    );

    // When: restoreAuthState アクションをディスパッチ（リロード時の復元相当）
    store.dispatch(
      authSlice.actions.restoreAuthState({ user: mockUser, isNewUser: false }),
    );

    // Then: 既存キャッシュは上書きされない
    const cached = JSON.parse(
      localStorage.getItem(VERIFIED_USER_DISPLAY_STORAGE_KEY) ?? 'null',
    );
    expect(cached).toEqual(existingCache);
  });
});
