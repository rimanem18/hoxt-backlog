'use client';

import { type FormEvent, useState } from 'react';
import { FormErrorAlert } from '@/features/auth/components/fields/FormErrorAlert';
import { PasswordField } from '@/features/auth/components/fields/PasswordField';
import { SubmitButton } from '@/features/auth/components/fields/SubmitButton';
import { useResetPasswordFormServices } from '@/features/auth/components/ResetPasswordFormServicesContext';
import { INVALID_RESET_LINK_MESSAGE } from '@/features/auth/services/emailPasswordErrorHandler';

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
        <FormErrorAlert message={errorMessage} />
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
        <PasswordField
          id="newPassword"
          label="新しいパスワード"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          disabled={isLoading}
        />

        {status === 'error' && <FormErrorAlert message={errorMessage} />}

        {status === 'error' &&
          errorMessage?.includes(INVALID_RESET_LINK_MESSAGE) && (
            <div className="text-center text-sm">
              <a
                href="/auth/forgot-password"
                className="text-primary hover:underline"
              >
                再度パスワードリセットを要求する
              </a>
            </div>
          )}

        <SubmitButton
          isLoading={isLoading}
          label="更新"
          loadingLabel="更新中..."
        />
      </form>
    </div>
  );
}
