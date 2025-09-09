/**
 * OAuth認証エラー表示専用コンポーネント
 *
 * ホームページから分離したOAuthエラー表示の専用コンポーネント。
 * セキュリティ対応（XSS対策・機密情報保護）とパフォーマンス最適化を実装。
 *
 * @example
 * ```typescript
 * <OAuthErrorDisplay
 *   onRetry={handleRetry}
 *   className="mt-4"
 * />
 * ```
 */

import React, { useCallback, useEffect } from 'react';
import {
  clearOAuthError,
  type OAuthErrorType,
  oauthErrorSelectors,
  setOAuthRetryState,
} from '@/features/auth/store/oauthErrorSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/**
 * OAuthエラー表示コンポーネントのProps型定義
 */
interface OAuthErrorDisplayProps {
  /** 再試行ボタンクリック時のハンドラー */
  onRetry?: () => void;
  /** カスタムCSSクラス */
  className?: string;
  /** テスト環境での識別用ID */
  testId?: string;
}

/**
 * エラータイプ別アイコンコンポーネント
 *
 * SVGアイコンの効率的なレンダリング
 */
const ErrorIcon: React.FC<{ type: OAuthErrorType; className?: string }> =
  React.memo(({ type, className = 'h-5 w-5' }) => {
    const iconProps = { className, fill: 'currentColor', viewBox: '0 0 20 20' };

    switch (type) {
      case 'cancelled':
        // ユーザーアクション（キャンセル）を表現
        return (
          <svg {...iconProps} aria-label="キャンセル">
            <title>キャンセル</title>
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'connection':
        // 接続問題を表現
        return (
          <svg {...iconProps} aria-label="接続エラー">
            <title>接続エラー</title>
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'config':
        // 設定問題を表現
        return (
          <svg {...iconProps} aria-label="設定エラー">
            <title>設定エラー</title>
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        // 汎用エラーアイコン
        return (
          <svg {...iconProps} aria-label="エラー">
            <title>エラー</title>
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  });
ErrorIcon.displayName = 'ErrorIcon';

/**
 * OAuth認証エラー表示コンポーネント
 *
 * Redux状態からエラー情報を取得し、適切な表示とリトライ機能を提供
 */
const OAuthErrorDisplay: React.FC<OAuthErrorDisplayProps> = React.memo(
  ({ onRetry, className = '', testId = 'oauth-error-display' }) => {
    // OAuth認証エラー状態の取得
    const dispatch = useAppDispatch();
    const hasError = useAppSelector(oauthErrorSelectors.hasError);
    const errorType = useAppSelector(oauthErrorSelectors.errorType);
    const errorMessage = useAppSelector(oauthErrorSelectors.errorMessage);
    const isRetrying = useAppSelector(oauthErrorSelectors.isRetrying);

    /**
     * 安全な再試行ハンドラー
     *
     * useCallbackによるメモ化で不要な再レンダリングを防止
     */
    const handleRetry = useCallback(async () => {
      try {
        // 再試行開始状態に設定
        dispatch(setOAuthRetryState({ isRetrying: true }));

        // 親コンポーネントの再試行処理を実行
        if (onRetry) {
          await onRetry();
        }

        // 一定時間後に再試行状態をクリア
        setTimeout(() => {
          dispatch(clearOAuthError());
        }, 1000);
      } catch (error) {
        // 再試行失敗時の安全な状態復旧
        dispatch(setOAuthRetryState({ isRetrying: false }));

        if (process.env.NODE_ENV === 'development') {
          console.error('OAuth retry failed:', error);
        }
      }
    }, [dispatch, onRetry]);

    /**
     * コンポーネントアンマウント時のクリーンアップ
     */
    useEffect(() => {
      return () => {
        // clearOAuthErrorはアンマウント時には実行しない（他で使用している可能性）
      };
    }, []);

    // エラーが発生していない場合は何も表示しない
    if (!hasError || !errorType) {
      return null;
    }

    /**
     * エラータイプ別のスタイリング
     */
    const getErrorStyles = (type: OAuthErrorType) => {
      switch (type) {
        case 'cancelled':
          return {
            container: 'bg-blue-50 border-blue-200 text-blue-800',
            icon: 'text-blue-400',
            button: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
          };
        case 'connection':
          return {
            container: 'bg-red-50 border-red-200 text-red-800',
            icon: 'text-red-400',
            button: 'bg-red-100 text-red-800 hover:bg-red-200',
          };
        case 'config':
          return {
            container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            icon: 'text-yellow-400',
            button: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
          };
        default:
          return {
            container: 'bg-gray-50 border-gray-200 text-gray-800',
            icon: 'text-gray-400',
            button: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
          };
      }
    };

    const styles = getErrorStyles(errorType);

    return (
      <div
        data-testarea={
          errorType === 'cancelled'
            ? 'auth-message'
            : errorType === 'connection'
              ? 'auth-error'
              : 'config-error'
        }
        data-testid={testId}
        data-error-type={errorType}
        data-error-severity={
          errorType === 'cancelled'
            ? 'info'
            : errorType === 'config'
              ? 'warning'
              : 'error'
        }
        role="alert"
        aria-live="polite"
        className={`p-4 border rounded-lg ${styles.container} ${className}`.trim()}
      >
        <div className="flex items-start">
          {/* タイプ別アイコンの表示 */}
          <div className="flex-shrink-0">
            <ErrorIcon type={errorType} className={`h-5 w-5 ${styles.icon}`} />
          </div>

          <div className="ml-3 flex-1">
            {/* サニタイズ済みメッセージの表示 */}
            <p className="text-sm font-medium">{errorMessage}</p>

            {/* 接続エラー時のみ再試行ボタンを表示 */}
            {errorType === 'connection' && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className={`text-sm px-3 py-1 rounded transition-colors ${styles.button}`}
                  aria-label="OAuth認証を再試行"
                >
                  {isRetrying ? (
                    <span
                      data-testarea="auth-loading"
                      className="flex items-center"
                    >
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-label="読み込み中"
                      >
                        <title>読み込み中</title>
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      再試行中...
                    </span>
                  ) : (
                    '再試行'
                  )}
                </button>
              </div>
            )}

            {/* 設定エラー時の開発環境限定情報 */}
            {errorType === 'config' &&
              process.env.NODE_ENV === 'development' && (
                <div
                  data-testarea="development-info"
                  className="mt-3 p-3 bg-yellow-100 rounded text-xs text-yellow-700"
                >
                  <p className="font-semibold">開発者情報:</p>
                  <p>.env.local ファイルに以下を設定してください:</p>
                  <code className="block mt-1 font-mono">
                    NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
                  </code>
                </div>
              )}
          </div>
        </div>
      </div>
    );
  },
);

OAuthErrorDisplay.displayName = 'OAuthErrorDisplay';

export default OAuthErrorDisplay;
