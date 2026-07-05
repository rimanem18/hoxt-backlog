'use client';

import { type FormEvent, useState } from 'react';
import { useSignUpFormServices } from '@/features/auth/components/SignUpFormServicesContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * メールパスワードサインアップフォーム
 */
export function SignUpForm(): React.ReactNode {
  const { useEmailSignup } = useSignUpFormServices();
  const { isLoading, status, errorMessage, signup } = useEmailSignup();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!EMAIL_PATTERN.test(email)) {
      setValidationError('メールアドレスの形式が正しくありません');
      return;
    }

    setValidationError(null);
    await signup(email, password);
  };

  const displayError = validationError ?? errorMessage;

  return (
    <div className="w-full space-y-5">
      {status === 'pending_confirmation' && (
        <p className="text-sm text-gray-700">
          確認メールを送信しました。受信トレイを確認してください。
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

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
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
          {isLoading ? '送信中...' : 'アカウントを作成'}
        </button>
      </form>

      <div className="text-center text-sm">
        <a href="/" className="block text-primary hover:underline">
          ログインはこちら
        </a>
      </div>
    </div>
  );
}
