import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import {
  type AuthStateChangeClient,
  startTokenRefreshSync,
} from '../services/tokenRefreshSync';

type RefreshSession = Pick<Session, 'access_token'>;

/**
 * onAuthStateChange のコールバックを捕捉するフェイクの auth クライアントを作成する
 */
function createFakeAuthClient() {
  let capturedCallback:
    | ((event: AuthChangeEvent, session: RefreshSession | null) => void)
    | null = null;
  const unsubscribe = mock(() => {});

  const client: AuthStateChangeClient = {
    auth: {
      onAuthStateChange: mock((callback) => {
        capturedCallback = callback;
        return { data: { subscription: { unsubscribe } } };
      }),
    },
  };

  return {
    client,
    unsubscribe,
    emit(event: AuthChangeEvent, session: RefreshSession | null) {
      capturedCallback?.(event, session);
    },
  };
}

describe('startTokenRefreshSync', () => {
  afterEach(() => {
    mock.restore();
    mock.clearAllMocks();
  });

  test('TOKEN_REFRESHEDイベントで新しいアクセストークンがapplyTokenに渡される', () => {
    // Given: TOKEN_REFRESHED を捕捉できるフェイククライアント
    const fake = createFakeAuthClient();
    const applyToken = mock((_token: string) => {});
    startTokenRefreshSync(fake.client, applyToken);

    // When: 新しいセッション付きで TOKEN_REFRESHED が発火
    fake.emit('TOKEN_REFRESHED', { access_token: 'new-jwt-token' });

    // Then: 新しいアクセストークンで applyToken が呼ばれる
    expect(applyToken).toHaveBeenCalledTimes(1);
    expect(applyToken).toHaveBeenCalledWith('new-jwt-token');
  });

  test('セッションがnullのTOKEN_REFRESHEDではapplyTokenが呼ばれない', () => {
    // Given: TOKEN_REFRESHED を捕捉できるフェイククライアント
    const fake = createFakeAuthClient();
    const applyToken = mock((_token: string) => {});
    startTokenRefreshSync(fake.client, applyToken);

    // When: セッションが null の TOKEN_REFRESHED が発火
    fake.emit('TOKEN_REFRESHED', null);

    // Then: applyToken は呼ばれない
    expect(applyToken).not.toHaveBeenCalled();
  });

  test('access_tokenが空文字列のTOKEN_REFRESHEDではapplyTokenが呼ばれない', () => {
    // Given: TOKEN_REFRESHED を捕捉できるフェイククライアント
    const fake = createFakeAuthClient();
    const applyToken = mock((_token: string) => {});
    startTokenRefreshSync(fake.client, applyToken);

    // When: access_token が空文字列の TOKEN_REFRESHED が発火
    fake.emit('TOKEN_REFRESHED', { access_token: '' });

    // Then: applyToken は呼ばれない
    expect(applyToken).not.toHaveBeenCalled();
  });

  test('TOKEN_REFRESHED以外のイベントではapplyTokenが呼ばれない', () => {
    // Given: TOKEN_REFRESHED を捕捉できるフェイククライアント
    const fake = createFakeAuthClient();
    const applyToken = mock((_token: string) => {});
    startTokenRefreshSync(fake.client, applyToken);

    // When: SIGNED_OUT と PASSWORD_RECOVERY が発火
    fake.emit('SIGNED_OUT', null);
    fake.emit('PASSWORD_RECOVERY', { access_token: 'ignored-token' });

    // Then: applyToken は呼ばれない
    expect(applyToken).not.toHaveBeenCalled();
  });

  test('返却されたunsubscribeを呼ぶとsubscription.unsubscribeが呼ばれる', () => {
    // Given: 購読済みの startTokenRefreshSync
    const fake = createFakeAuthClient();
    const applyToken = mock((_token: string) => {});
    const unsub = startTokenRefreshSync(fake.client, applyToken);

    // When: 返却された解除関数を呼ぶ
    unsub();

    // Then: フェイクの unsubscribe が1回呼ばれる
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
