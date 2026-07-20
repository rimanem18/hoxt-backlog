/**
 * ログアウト処理を担うボタンコンポーネント。
 * Supabaseからのログアウトと、Reduxストアの状態更新を行う。
 *
 * @example
 * ```tsx
 * <LogoutButton />
 * ```
 */

'use client';
import type React from 'react';
import { useCallback } from 'react';
import { logout } from '@/features/auth/store/authSlice';
import { supabase } from '@/lib/supabase';
import { debugLog } from '@/lib/utils/logger';
import { useAppDispatch } from '@/store/hooks';

export function LogoutButton(): React.ReactNode {
  const dispatch = useAppDispatch();

  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      debugLog.auth('ログアウト処理を開始...');

      const { error } = await supabase.auth.signOut();

      if (error) {
        debugLog.error('Supabaseログアウト失敗:', error);
        // サーバー側の signOut が失敗しても、クライアントが認証済み表示のまま
        // 残らないようローカルの認証状態は必ずクリアする（fail-closed）
        dispatch(logout());
        return;
      }

      dispatch(logout());
      debugLog.auth('ログアウト成功！');

      // 認証済みページに留まらないようホームへ遷移させる
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      debugLog.error('ログアウト処理エラー:', error);
      // signOut自体が例外を投げても、ローカルの認証状態は必ずクリアする（fail-closed）
      dispatch(logout());
    }
  }, [dispatch]);

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
    >
      ログアウト
    </button>
  );
}
