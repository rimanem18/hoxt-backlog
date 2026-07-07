'use client';

import { type FormEvent, useState } from 'react';
import { EmailField } from '@/features/auth/components/fields/EmailField';
import { FormErrorAlert } from '@/features/auth/components/fields/FormErrorAlert';
import { PasswordField } from '@/features/auth/components/fields/PasswordField';
import { SubmitButton } from '@/features/auth/components/fields/SubmitButton';
import { useSignUpFormServices } from '@/features/auth/components/SignUpFormServicesContext';
import { emailFormatSchema } from '@/features/auth/validation/authFormSchemas';

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

    const result = emailFormatSchema.safeParse({ email });
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? null);
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
          autoComplete="new-password"
          disabled={isLoading}
        />

        <FormErrorAlert message={displayError} />

        <SubmitButton
          isLoading={isLoading}
          label="アカウントを作成"
          loadingLabel="送信中..."
        />
      </form>

      <div className="text-center text-sm">
        <a href="/" className="block text-primary hover:underline">
          ログインはこちら
        </a>
      </div>
    </div>
  );
}
