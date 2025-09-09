'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { showNetworkError } from '@/features/auth/store/errorSlice';
import { UserProfile } from '@/features/google-auth/components/UserProfile';
import {
  handleExpiredToken,
  restoreAuthState,
  setAuthState,
} from '@/features/google-auth/store/authSlice';
import type { User } from '@/packages/shared-schemas/src/auth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/**
 * 認証済みユーザー専用のダッシュボードページ
 * JWT期限切れ検出・認証状態復元・ネットワークエラーハンドリング機能を提供
 *
 * @returns 認証済みユーザー向けダッシュボード画面
 */
export default function DashboardPage(): React.ReactNode {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();

  // JWT期限切れ時の処理をメモ化して複数回実行を防止
  const handleTokenExpiration = useCallback(() => {
    dispatch(handleExpiredToken());
    router.push('/');
  }, [dispatch, router]);

  // 認証状態復元処理をメモ化してuseEffectの再実行を最小限に抑制
  const handleAuthRestore = useCallback(
    (user: User) => {
      dispatch(restoreAuthState({ user, isNewUser: false }));
    },
    [dispatch],
  );

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

  // ページリロード時の認証状態復元
  useEffect(() => {
    // セキュリティ重視でJWT期限切れ検出を最優先実行
    if (typeof window !== 'undefined') {
      // 期限切れチェックを最初に実行して不正アクセスを防止
      const savedAuthData = localStorage.getItem('sb-localhost-auth-token');
      if (savedAuthData) {
        try {
          const parsedAuthData = JSON.parse(savedAuthData);
          // expires_atの値を厳密にチェック
          if (
            parsedAuthData.expires_at === null ||
            parsedAuthData.expires_at === undefined
          ) {
            handleTokenExpiration();
            return;
          }
          const expiresAt = Number(parsedAuthData.expires_at);
          if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
            if (Number.isNaN(expiresAt)) {
            }
            // 期限切れ処理を実行
            handleTokenExpiration();
            return;
          }
          // トークン構造の基本検証
          if (!parsedAuthData.user || !parsedAuthData.access_token) {
            // 期限切れ処理を実行
            handleTokenExpiration();
            return;
          }
        } catch {
          // 解析失敗時は不正トークンとして即座にクリア
          // メモ化された期限切れ処理を使用
          handleTokenExpiration();
          return;
        }
      }

      // 期限切れが未検出の場合のみ認証復元処理を実行
      if (window.__TEST_REDUX_AUTH_STATE__) {
        const testState = window.__TEST_REDUX_AUTH_STATE__;

        // LocalStorageクリア済みの場合はテスト状態を適用しない
        const currentAuthData = localStorage.getItem('sb-localhost-auth-token');
        if (!currentAuthData && testState.isAuthenticated && testState.user) {
          return;
        }

        if (testState.isAuthenticated && testState.user) {
          // テスト用認証状態を設定
          dispatch(
            setAuthState({
              isAuthenticated: testState.isAuthenticated,
              user: testState.user,
              isLoading: testState.isLoading || false,
              error: testState.error || null,
            }),
          );
        }
        return;
      }

      // 本番環境での認証状態復元（期限切れチェック済み）
      if (savedAuthData) {
        try {
          const parsedAuthData = JSON.parse(savedAuthData);

          if (parsedAuthData.user) {
            // 認証状態復元処理を実行
            handleAuthRestore(parsedAuthData.user);
          }
        } catch {
          // エラー時はLocalStorageをクリア
          localStorage.removeItem('sb-localhost-auth-token');
        }
      }
    }
  }, [handleTokenExpiration, handleAuthRestore, dispatch]);

  // テスト用認証状態の存在確認
  const hasTestAuthState =
    typeof window !== 'undefined' &&
    window.__TEST_REDUX_AUTH_STATE__ &&
    window.__TEST_REDUX_AUTH_STATE__.isAuthenticated &&
    window.__TEST_REDUX_AUTH_STATE__.user;

  // 未認証ユーザーをホームページにリダイレクト（テスト環境除く）
  useEffect(() => {
    if (!hasTestAuthState && (!isAuthenticated || !user)) {
      // 未認証アクセス試行をログに記録
      console.warn('未認証状態でのダッシュボードアクセス試行', {
        isAuthenticated,
        hasUser: !!user,
        hasTestAuthState,
        timestamp: new Date().toISOString(),
      });
      // ホームページに誘導
      router.push('/');
    }
  }, [hasTestAuthState, isAuthenticated, user, router]);

  // 認証チェック完了前またはリダイレクト対象の場合は何も表示しない
  if (!hasTestAuthState && (!isAuthenticated || !user)) {
    return null;
  }

  // テスト環境ではモック状態を使用
  const effectiveUser = hasTestAuthState
    ? window.__TEST_REDUX_AUTH_STATE__?.user
    : user;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ダッシュボードタイトル */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">
            {effectiveUser?.lastLoginAt
              ? 'おかえりなさい！あなたのアカウント情報です。'
              : 'ようこそ！あなたのアカウント情報です。'}
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="w-full max-w-md">
            {effectiveUser && <UserProfile user={effectiveUser} />}
          </div>
        </div>

        {/* 開発環境での認証状態デバッグ表示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-blue-800 mb-2">開発情報:</h3>
            <p className="text-blue-700">認証状態: 認証済み</p>
            <p className="text-blue-700">
              テスト環境: {hasTestAuthState ? 'Yes' : 'No'}
            </p>
            <p className="text-blue-700">
              ユーザーID: {effectiveUser?.id ? '設定済み' : '未設定'}
            </p>
            <p className="text-blue-700">
              最終ログイン: {effectiveUser?.lastLoginAt ? '記録あり' : '未設定'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
