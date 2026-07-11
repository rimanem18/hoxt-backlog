'use client';

import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { ForgotPasswordFormServicesProvider } from '@/features/auth/components/ForgotPasswordFormServicesContext';

/**
 * パスワードリセット要求ページ
 */
export default function ForgotPasswordPage(): React.ReactNode {
  return (
    <div className="font-sans min-h-screen p-8 pb-20 sm:p-20">
      <main className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-gray-800">
                パスワードをリセット
              </h2>
              <p className="text-sm text-gray-500">
                登録済みのメールアドレスを入力してください。
              </p>
            </div>
            <ForgotPasswordFormServicesProvider>
              <ForgotPasswordForm />
            </ForgotPasswordFormServicesProvider>
          </div>
        </div>
      </main>
    </div>
  );
}
