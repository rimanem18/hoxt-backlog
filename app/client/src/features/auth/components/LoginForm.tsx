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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!email) {
      setValidationError('メールアドレスを入力してください');
      return;
    }
    setValidationError(null);
    await signIn(email, password);
  };

  return (
    <div>
      <LoginButton provider="google" />
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {(validationError ?? errorMessage) && (
          <div>{validationError ?? errorMessage}</div>
        )}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'サインイン中' : 'サインイン'}
        </button>
      </form>
      <a href="/signup">アカウントをお持ちでない方はこちら</a>
      <a href="/auth/forgot-password">パスワードを忘れた方はこちら</a>
    </div>
  );
}
