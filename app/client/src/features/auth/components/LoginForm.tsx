'use client';

import { type FormEvent, useState } from 'react';
import { LoginButton } from '@/features/auth/components/LoginButton';
import { useLoginFormServices } from '@/features/auth/components/LoginFormServicesContext';

/**
 * メールパスワード + Google OAuth ログインフォーム
 */
export function LoginForm(): React.ReactNode {
  const { useEmailSignin } = useLoginFormServices();
  const { isLoading, errorMessage, signIn } = useEmailSignin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!email) {
      setValidationError('メールアドレスを入力してください');
      return;
    }
    setValidationError(null);
    await signIn(email, password);
  };

  const displayError = validationError ?? errorMessage;

  return (
    <div className="w-full space-y-5">
      <LoginButton provider="google" className="w-full" />

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">または</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

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
            autoComplete="current-password"
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
          {isLoading ? 'サインイン中...' : 'サインイン'}
        </button>
      </form>

      <div className="space-y-2 text-center text-sm">
        <a
          href="/auth/forgot-password"
          className="block text-primary hover:underline"
        >
          パスワードを忘れた方はこちら
        </a>
        <a href="/signup" className="block text-gray-500 hover:underline">
          アカウントをお持ちでない方はこちら
        </a>
      </div>
    </div>
  );
}
