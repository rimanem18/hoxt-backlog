'use client';

import { type FormEvent, useState } from 'react';
import { useForgotPasswordFormServices } from '@/features/auth/components/ForgotPasswordFormServicesContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * パスワードリセット依頼フォーム
 */
export function ForgotPasswordForm(): React.ReactNode {
  const { useForgotPassword } = useForgotPasswordFormServices();
  const { isLoading, status, errorMessage, requestReset } = useForgotPassword();

  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!EMAIL_PATTERN.test(email)) {
      setValidationError('メールアドレスの形式が正しくありません');
      return;
    }

    setValidationError(null);
    await requestReset(email);
  };

  const displayError = validationError ?? errorMessage;

  return (
    <div className="w-full space-y-5">
      {status === 'sent' && (
        <p className="text-sm text-gray-700">
          パスワードリセットメールを送信しました。受信トレイを確認してください。
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            disabled={isLoading}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg
              text-sm focus:outline-none focus:ring-2 focus:ring-primary
              focus:border-transparent disabled:opacity-50"
          />
        </div>

        {displayError && (
          <div
            role="alert"
            aria-live="polite"
            className="px-3 py-2.5 bg-red-50 border border-red-200
              rounded-lg text-sm text-red-700"
          >
            {displayError}
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
          {isLoading ? '送信中...' : '送信'}
        </button>
      </form>

      <div className="text-center text-sm">
        <a href="/" className="block text-primary hover:underline">
          ログインに戻る
        </a>
      </div>
    </div>
  );
}
