'use client';

import { type FormEvent, useState } from 'react';
import { useForgotPasswordFormServices } from '@/features/auth/components/ForgotPasswordFormServicesContext';
import { EmailField } from '@/features/auth/components/fields/EmailField';
import { FormErrorAlert } from '@/features/auth/components/fields/FormErrorAlert';
import { SubmitButton } from '@/features/auth/components/fields/SubmitButton';
import { emailFormatSchema } from '@/features/auth/validation/authFormSchemas';

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

    const result = emailFormatSchema.safeParse({ email });
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? null);
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
        <EmailField
          id="email"
          value={email}
          onChange={setEmail}
          disabled={isLoading}
        />

        <FormErrorAlert message={displayError} />

        <SubmitButton
          isLoading={isLoading}
          label="送信"
          loadingLabel="送信中..."
        />
      </form>

      <div className="text-center text-sm">
        <a href="/" className="block text-primary hover:underline">
          ログインに戻る
        </a>
      </div>
    </div>
  );
}
