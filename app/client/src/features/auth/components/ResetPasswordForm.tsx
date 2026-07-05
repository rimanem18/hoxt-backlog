'use client';

import { type FormEvent, useState } from 'react';
import { useResetPasswordFormServices } from '@/features/auth/components/ResetPasswordFormServicesContext';

const INVALID_LINK_MESSAGE = 'リンクが無効か期限切れです';

/**
 * パスワード再設定フォーム
 */
export function ResetPasswordForm(): React.ReactNode {
  const { usePasswordReset } = useResetPasswordFormServices();
  const { isReady, isLoading, status, errorMessage, updatePassword } =
    usePasswordReset();

  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await updatePassword(newPassword);
  };

  // 到達時点でリンク無効と判定された場合（PASSWORD_RECOVERY未受信）
  if (status === 'error' && !isReady) {
    return (
      <div className="w-full space-y-5">
        <div
          role="alert"
          aria-live="polite"
          className="px-3 py-2.5 bg-red-50 border border-red-200
            rounded-lg text-sm text-red-700"
        >
          {errorMessage}
        </div>
        <div className="text-center text-sm">
          <a
            href="/auth/forgot-password"
            className="text-primary hover:underline"
          >
            再度パスワードリセットを要求する
          </a>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="w-full space-y-5">
        <p className="text-sm text-gray-700">リンクを確認中...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="w-full space-y-5">
        <p className="text-sm text-gray-700">
          パスワードを更新しました。新しいパスワードでログインしてください。
        </p>
        <div className="text-center text-sm">
          <a href="/" className="block text-primary hover:underline">
            ホームに戻る
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1">
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700"
          >
            新しいパスワード
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            disabled={isLoading}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg
              text-sm focus:outline-none focus:ring-2 focus:ring-primary
              focus:border-transparent disabled:opacity-50"
          />
        </div>

        {status === 'error' && errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="px-3 py-2.5 bg-red-50 border border-red-200
              rounded-lg text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {status === 'error' && errorMessage?.includes(INVALID_LINK_MESSAGE) && (
          <div className="text-center text-sm">
            <a
              href="/auth/forgot-password"
              className="text-primary hover:underline"
            >
              再度パスワードリセットを要求する
            </a>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-primary text-white text-sm
            font-medium rounded-lg hover:opacity-90 active:opacity-80
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-opacity"
        >
          {isLoading ? '更新中...' : '更新'}
        </button>
      </form>
    </div>
  );
}
