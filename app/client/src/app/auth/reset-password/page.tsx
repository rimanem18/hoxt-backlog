'use client';

import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { ResetPasswordFormServicesProvider } from '@/features/auth/components/ResetPasswordFormServicesContext';

/**
 * パスワード再設定ページ
 */
export default function ResetPasswordPage(): React.ReactNode {
  return (
    <div className="font-sans min-h-screen p-8 pb-20 sm:p-20">
      <main className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-gray-800">
                新しいパスワードを設定
              </h2>
              <p className="text-sm text-gray-500">
                新しいパスワードを入力してください。
              </p>
            </div>
            <ResetPasswordFormServicesProvider>
              <ResetPasswordForm />
            </ResetPasswordFormServicesProvider>
          </div>
        </div>
      </main>
    </div>
  );
}
