'use client';

import { useEffect } from 'react';
import { handleExpiredToken } from '@/features/auth/store/authSlice';
import { showNetworkError } from '@/features/auth/store/errorSlice';
import { useDashboardServices } from '@/features/dashboard/lib/DashboardServicesContext';
import { getSupabaseStorageKey } from '@/shared/utils/authValidation';
import { useAppDispatch } from '@/store/hooks';

/**
 * ダッシュボード表示中のセッション監視を担当するClient Component
 * JWT期限切れ検出とネットワークエラーハンドリングを行い、表示は持たない
 *
 * @returns 表示を持たないコンポーネント（null）
 */
export function DashboardSessionMonitor(): React.ReactNode {
  const dispatch = useAppDispatch();
  const { fetchUserStatus } = useDashboardServices();

  useEffect(() => {
    async function checkNetworkAndShowError() {
      try {
        const response = await fetchUserStatus();

        // 4xxは認証・入力起因の可能性があるため、5xxのみネットワーク異常として扱う
        if (!response.ok && response.status >= 500) {
          throw new Error('Server error detected');
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'TypeError' ||
            error.name === 'TimeoutError' ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('Server error'))
        ) {
          dispatch(
            showNetworkError({
              message: 'ネットワーク接続を確認してください',
            }),
          );
        }
      }
    }

    checkNetworkAndShowError();
  }, [dispatch, fetchUserStatus]);

  // JWT期限切れの監視のみを実行（認証状態復元はprovider.tsxで実施）
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storageKey = getSupabaseStorageKey();
    const savedAuthData = localStorage.getItem(storageKey);
    if (!savedAuthData) return;

    try {
      const parsedAuthData = JSON.parse(savedAuthData);
      const expiresAt = Number(parsedAuthData.expires_at);

      // expires_atは秒単位なのでミリ秒に変換して比較
      const expiresAtMs = expiresAt * 1000;
      if (Number.isNaN(expiresAt) || expiresAtMs <= Date.now()) {
        dispatch(handleExpiredToken());
        // AuthGuardが自動的にリダイレクトするため、手動リダイレクトは不要
      }
    } catch {
      dispatch(handleExpiredToken());
    }
  }, [dispatch]);

  return null;
}
