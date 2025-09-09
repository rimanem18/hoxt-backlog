/**
 * グローバルエラーメッセージ表示用のトーストコンポーネント
 * ネットワークエラーの検出と再試行機能を提供
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearError } from '@/features/auth/store/errorSlice';
import type { RootState } from '@/store';

/**
 * グローバルエラー表示コンポーネント
 * エラーメッセージの視覚的表示とインタラクションを提供
 */
export function GlobalErrorToast() {
  const dispatch = useDispatch();
  // 再試行ボタンのローディング状態管理
  const [isRetrying, setIsRetrying] = useState(false);
  // ブラウザAPIによるネットワーク状態監視
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  // クリーンアップ用のrefsでメモリリークを防止
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Redux storeからエラー状態を取得
  const { isVisible, message, type } = useSelector(
    (state: RootState) => state.error,
  );

  // ブラウザAPIを活用したネットワーク状態監視
  useEffect(() => {
    // ブラウザの現在のネットワーク状態を取得
    setIsOnline(navigator.onLine);

    // Network Information APIで接続タイプを検出（対応ブラウザのみ）
    if ('connection' in navigator) {
      // Navigator型ではNetwork Information APIが未定義のため一時的にany使用
      // 将来的にはdom.d.tsでNavigator.connection型が追加される予定
      const connection = (navigator as any).connection;
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || null);

        // 接続タイプ変更の監視
        const handleConnectionChange = () => {
          setConnectionType(
            connection.effectiveType || connection.type || null,
          );
          console.log(
            'Network connection type changed:',
            connection.effectiveType,
          );
        };

        connection.addEventListener('change', handleConnectionChange);
        return () =>
          connection.removeEventListener('change', handleConnectionChange);
      }
    }
  }, []);

  // ブラウザの標準APIでオンライン・オフライン状態を監視
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Network: Online status detected');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Network: Offline status detected');
    };

    // ネットワーク状態変化の監視開始
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // メモリリーク防止のためリスナーを削除
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // コンポーネントアンマウント時のリソース解放
  useEffect(() => {
    return () => {
      // 未完了のタイマーをクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // 未完了のネットワークリクエストをキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // エラーメッセージを非表示にする処理
  const handleClose = useCallback(() => {
    // エラー状態をクリア
    dispatch(clearError());
    console.log('T007: Error toast closed by user');
  }, [dispatch]);

  // エラーが発生していない場合は何も表示しない
  if (!isVisible || !message) {
    return null;
  }

  return (
    <>
      {/* ネットワーク接続エラーメッセージ表示 */}
      <div
        className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md"
        role="alert"
        aria-live="polite"
      >
        {/* Redux stateから取得したエラーメッセージを表示 */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* エラーアイコン */}
            <div className="flex items-center mb-2">
              <div className="w-5 h-5 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-2">
                <span className="text-sm font-bold">!</span>
              </div>
              <span className="font-semibold">
                {type === 'network' ? 'ネットワークエラー' : 'エラー'}
              </span>
            </div>

            {/* エラーメッセージ表示 */}
            <p className="text-sm">{message}</p>
          </div>

          {/* 閉じるボタン */}
          <button
            type="button"
            onClick={handleClose}
            className="ml-4 text-white hover:text-gray-200 transition-colors"
            aria-label="エラーメッセージを閉じる"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="閉じる"
            >
              <title>閉じる</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 再試行ボタン */}
      {type === 'network' && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <button
            type="button"
            onClick={async () => {
              // ブラウザAPIで接続状態を確認してから再試行
              if (!isOnline) {
                console.log(
                  'T007: Retry skipped - browser reports offline status',
                );
                return;
              }

              // ローディング状態管理付きの再試行機能
              setIsRetrying(true);
              console.log('T007: Network retry initiated with loading state');

              // 既存のリクエストをキャンセルして重複を防止
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              abortControllerRef.current = new AbortController();

              // ページリロードを廃止して局所的再試行でパフォーマンスとUXを向上
              try {
                // 特定のAPIリクエストのみ再実行
                const response = await fetch('/api/v1/users/me', {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    // CSRF攻撃対策ヘッダーを追加
                    'X-Requested-With': 'XMLHttpRequest',
                  },
                  credentials: 'same-origin',
                  signal: abortControllerRef.current.signal,
                });

                // ネットワーク接続の復旧を確認
                if (response.ok || response.status < 500) {
                  // エラー状態をクリアして成功フィードバック
                  dispatch(clearError());

                  // 成功メッセージの一時表示
                  console.log('T007: Network recovery successful');

                  // 2秒間成功メッセージを表示
                  timeoutRef.current = setTimeout(() => {
                    setIsRetrying(false);
                  }, 2000);
                } else {
                  // エラーが継続していることを通知
                  console.log('T007: Retry failed, network issue persists');
                  timeoutRef.current = setTimeout(
                    () => setIsRetrying(false),
                    1000,
                  );
                }
              } catch (error) {
                // 再試行失敗時のユーザーフィードバック
                if ((error as Error).name === 'AbortError') {
                  console.log('T007: Retry cancelled');
                } else {
                  console.log('T007: Retry failed:', error);
                }
                timeoutRef.current = setTimeout(
                  () => setIsRetrying(false),
                  1000,
                );
              }
            }}
            disabled={isRetrying}
            className="flex items-center space-x-2 hover:bg-blue-600 transition-colors px-2 py-1 rounded disabled:opacity-50"
          >
            {isRetrying ? (
              // 再試行中のローディングアイコン
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="読み込み中"
              >
                <title>読み込み中</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
                />
              </svg>
            ) : (
              // 再試行アイコン
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="再試行"
              >
                <title>再試行</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            <span>{isRetrying ? '再試行中...' : '再試行'}</span>
          </button>

          {/* 再試行中ローディングインジケータ */}
          {isRetrying && (
            <div
              data-testarea="retry-loading"
              className="mt-2 flex items-center justify-center text-sm"
            >
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span>接続を再試行しています...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* オフライン状態インジケータ */}
      {type === 'network' && (
        <div
          className="fixed bottom-4 left-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50"
          data-testarea="network-status"
        >
          <div className="flex items-center space-x-2">
            {/* ブラウザAPIベースのネットワーク状態表示 */}
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'
              }`}
            ></div>
            <span className="text-sm">
              {isOnline ? 'オンライン' : 'オフライン'}
              {/* Network Information API対応ブラウザでの詳細情報 */}
              {connectionType && isOnline && (
                <span className="ml-1 text-gray-300">({connectionType})</span>
              )}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalErrorToast;
