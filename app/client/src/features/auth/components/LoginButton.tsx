/**
 * プロバイダー非依存のログインボタンコンポーネント
 *
 * useMemoによるレンダリング最適化とカスタムフックによる状態管理分離を実装。
 * 単一責任原則に従い、UI表示とイベントハンドリングのみを担当する。
 */

import type React from 'react';
import { useCallback, useMemo } from 'react';
import { AuthLoadingSpinner } from '@/features/auth/components/LoadingSpinner';
import {
  AUTH_MESSAGES,
  AUTH_PROVIDER_CONFIG,
  type AuthProvider,
  createSecureRedirectUrl,
} from '@/features/auth/config/authConfig';
import { useAuthLoading } from '@/features/auth/hooks/useAuthLoading';
import {
  type AuthServiceInterface,
  defaultAuthService,
} from '@/features/auth/services/authService';

/**
 * LoginButtonコンポーネントのProps定義
 */
interface LoginButtonProps {
  /** 認証プロバイダーの指定 */
  provider: AuthProvider;

  /** ボタンの無効化フラグ */
  disabled?: boolean;

  /** 認証開始時のコールバック */
  onAuthStart?: () => void;

  /** 認証成功時のコールバック */
  onAuthSuccess?: (data: unknown) => void;

  /** 認証エラー時のコールバック */
  onAuthError?: (errorMessage: string) => void;

  /** 追加のスタイルクラス */
  className?: string;

  /** 認証サービス（DI用、テスト時にモックを注入） */
  authService?: AuthServiceInterface;
}

/**
 * LoginButtonコンポーネントの実装
 *
 * @param provider - 認証プロバイダーの種類
 * @param disabled - ボタンの無効化フラグ
 * @param onAuthStart - 認証開始時のコールバック関数
 * @param onAuthSuccess - 認証成功時のコールバック関数
 * @param onAuthError - 認証エラー時のコールバック関数
 * @param className - 追加スタイルクラス
 * @returns 認証ボタンコンポーネント
 */
export const LoginButton: React.FC<LoginButtonProps> = ({
  provider,
  disabled = false,
  onAuthStart,
  onAuthSuccess,
  onAuthError,
  className = '',
  authService = defaultAuthService,
}) => {
  // ローディング状態管理をカスタムフックに分離して再利用性を向上
  const { isLoading, showLongProcessMessage, startLoading, stopLoading } =
    useAuthLoading();

  const providerConfig = AUTH_PROVIDER_CONFIG[provider];

  // メモ化でレンダリング毎のラベル再計算を回避
  const buttonLabel = useMemo(() => {
    return isLoading ? providerConfig.loadingLabel : providerConfig.buttonLabel;
  }, [isLoading, providerConfig.loadingLabel, providerConfig.buttonLabel]);

  // ARIAラベルもメモ化してパフォーマンス最適化
  const ariaLabel = useMemo(() => {
    return isLoading ? providerConfig.loadingLabel : providerConfig.buttonLabel;
  }, [isLoading, providerConfig.loadingLabel, providerConfig.buttonLabel]);

  // OAuth認証処理を実行し、セキュアリダイレクトとエラーハンドリングを提供
  const handleAuth = useCallback(async (): Promise<void> => {
    // カスタムフックでダブルクリックを防止
    if (!startLoading()) {
      return; // 連続クリック時は処理を中断
    }

    try {
      onAuthStart?.();

      // Host Header Attack対策で安全なリダイレクトURLを生成
      const secureRedirectUrl = createSecureRedirectUrl();

      const { data, error } = await authService.signInWithOAuth(
        providerConfig.supabaseProvider,
        {
          redirectTo: secureRedirectUrl,
        },
      );

      if (error) {
        onAuthError?.(error.message);
      } else {
        onAuthSuccess?.(data);
      }
    } catch (error) {
      // 予期しないエラーはデフォルトメッセージで処理
      const errorMessage =
        error instanceof Error
          ? error.message
          : AUTH_MESSAGES.DEFAULT_ERROR_MESSAGE;
      onAuthError?.(errorMessage);
    } finally {
      stopLoading();
    }
  }, [
    providerConfig.supabaseProvider,
    onAuthStart,
    onAuthSuccess,
    onAuthError,
    startLoading,
    stopLoading,
    authService,
  ]);

  // 動的スタイルをメモ化してパフォーマンス最適化
  const buttonClasses = useMemo(() => {
    const baseClasses =
      'px-6 py-3 rounded-md font-medium text-white transition-all duration-200';
    const stateClasses = isLoading
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800';

    return [baseClasses, stateClasses, className].filter(Boolean).join(' ');
  }, [isLoading, className]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleAuth}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-label={ariaLabel}
        className={buttonClasses}
      >
        <div className="flex items-center justify-center gap-2">
          {isLoading && <AuthLoadingSpinner />}
          <span>{buttonLabel}</span>
        </div>
      </button>

      {/* 10秒経過時の長時間処理メッセージ */}
      {showLongProcessMessage && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          {AUTH_MESSAGES.LONG_PROCESS_MESSAGE}
        </div>
      )}
    </div>
  );
};

/**
 * LoginButtonProps型を外部で使用可能にエクスポート
 */
export type { LoginButtonProps };
