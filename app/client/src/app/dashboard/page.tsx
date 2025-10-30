'use client';

import { useCallback, useEffect } from 'react';
import { UserProfile } from '@/features/auth/components/UserProfile';
import { handleExpiredToken } from '@/features/auth/store/authSlice';
import { showNetworkError } from '@/features/auth/store/errorSlice';
import { getSupabaseStorageKey } from '@/shared/utils/authValidation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/**
 * 認証済みユーザー専用のダッシュボードページ
 * AuthGuardによって認証が保証されているため、認証チェックは不要
 * JWT期限切れ検出とネットワークエラーハンドリングのみを担当
 *
 * @returns 認証済みユーザー向けダッシュボード画面
 */
export default function DashboardPage(): React.ReactNode {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // JWT期限切れ時の処理をメモ化して複数回実行を防止
  const handleTokenExpiration = useCallback(() => {
    dispatch(handleExpiredToken());
    // AuthGuardが自動的にリダイレクトするため、手動リダイレクトは不要
  }, [dispatch]);

  // ネットワークエラーを検出してユーザーフレンドリーなメッセージを表示
  const checkNetworkAndShowError = useCallback(async () => {
    try {
      // ユーザー情報APIでネットワーク状態を検証
      const response = await fetch('/api/v1/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 5秒のタイムアウトを設定
        signal: AbortSignal.timeout(5000),
      });

      // 500番台エラーはネットワークエラーと判定
      if (!response.ok && response.status >= 500) {
        throw new Error('Server error detected');
      }
    } catch (error) {
      // fetch失敗・タイムアウト・サーバーエラーをネットワークエラーとして処理
      if (
        error instanceof Error &&
        (error.name === 'TypeError' ||
          error.name === 'TimeoutError' ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('Server error'))
      ) {
        // エラー状態をRedux storeに設定
        dispatch(
          showNetworkError({
            message: 'ネットワーク接続を確認してください',
            correlationId: `err_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          }),
        );
      }
    }
  }, [dispatch]);

  // ページ読み込み時にネットワーク状態を確認
  useEffect(() => {
    // ネットワーク状態を自動確認
    checkNetworkAndShowError();
  }, [checkNetworkAndShowError]);

  // JWT期限切れの監視のみを実行（認証状態復元はprovider.tsxで実施）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = getSupabaseStorageKey();
      const savedAuthData = localStorage.getItem(storageKey);
      if (savedAuthData) {
        try {
          const parsedAuthData = JSON.parse(savedAuthData);
          const expiresAt = Number(parsedAuthData.expires_at);

          // 期限切れチェックのみ実行
          // expires_atは秒単位なのでミリ秒に変換して比較
          const expiresAtMs = expiresAt * 1000;
          if (Number.isNaN(expiresAt) || expiresAtMs <= Date.now()) {
            handleTokenExpiration();
          }
        } catch {
          handleTokenExpiration();
        }
      }
    }
  }, [handleTokenExpiration]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ダッシュボードタイトル */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">
            {user?.lastLoginAt
              ? 'おかえりなさい！あなたのアカウント情報です。'
              : 'ようこそ！あなたのアカウント情報です。'}
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="w-full max-w-md">
            {user && <UserProfile user={user} />}
          </div>
        </div>

        {/* 開発環境での認証状態デバッグ表示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-blue-800 mb-2">開発情報:</h3>
            <p className="text-blue-700">認証状態: 認証済み（AuthGuard保証）</p>
            <p className="text-blue-700">
              ユーザーID: {user?.id ? '設定済み' : '未設定'}
            </p>
            <p className="text-blue-700">
              最終ログイン: {user?.lastLoginAt ? '記録あり' : '未設定'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
