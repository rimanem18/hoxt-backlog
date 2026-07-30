'use client';

import { type FormEvent, useState } from 'react';
import { DemoLoginButton } from '@/features/auth/components/DemoLoginButton';
import { EmailField } from '@/features/auth/components/fields/EmailField';
import { FormErrorAlert } from '@/features/auth/components/fields/FormErrorAlert';
import { PasswordField } from '@/features/auth/components/fields/PasswordField';
import { SubmitButton } from '@/features/auth/components/fields/SubmitButton';
import { LoginButton } from '@/features/auth/components/LoginButton';
import { useLoginFormServices } from '@/features/auth/components/LoginFormServicesContext';
import { loginEmailRequiredSchema } from '@/features/auth/validation/authFormSchemas';

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
    const result = loginEmailRequiredSchema.safeParse({ email });
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? null);
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
        <EmailField
          id="email"
          value={email}
          onChange={setEmail}
          disabled={isLoading}
        />

        <PasswordField
          id="password"
          label="パスワード"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={isLoading}
        />

        <FormErrorAlert message={displayError} />

        <SubmitButton
          isLoading={isLoading}
          label="サインイン"
          loadingLabel="サインイン中..."
        />
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

      <DemoLoginButton signIn={signIn} isLoading={isLoading} />
    </div>
  );
}
