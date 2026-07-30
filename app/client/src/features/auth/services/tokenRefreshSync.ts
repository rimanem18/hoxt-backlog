import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { setAuthToken } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/**
 * Supabase の onAuthStateChange を購読するために必要な最小構造
 *
 * access_token のみ使用するため、Session を丸ごと要求せず
 * Pick で絞り込む（テストで不完全な Session をキャストせずに済む）
 */
export interface AuthStateChangeClient {
  auth: {
    onAuthStateChange: (
      callback: (
        event: AuthChangeEvent,
        session: Pick<Session, 'access_token'> | null,
      ) => void,
    ) => {
      data: { subscription: { unsubscribe: () => void } };
    };
  };
}

/**
 * TOKEN_REFRESHED イベントを購読し、新しいアクセストークンを
 * applyToken に橋渡しする購読ブリッジ
 *
 * @returns 購読解除のための関数
 */
export function startTokenRefreshSync(
  authClient: AuthStateChangeClient,
  applyToken: (token: string) => void,
): () => void {
  const {
    data: { subscription },
  } = authClient.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' && session?.access_token) {
      applyToken(session.access_token);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * アプリ本番用の Supabase クライアント・API クライアントを結び付けた
 * トークン更新購読を開始する
 *
 * @returns 購読解除のための関数
 */
export function startDefaultTokenRefreshSync(): () => void {
  return startTokenRefreshSync(supabase, setAuthToken);
}
