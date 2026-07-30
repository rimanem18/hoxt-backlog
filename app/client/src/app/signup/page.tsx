'use client';

import { SignUpForm } from '@/features/auth/components/SignUpForm';
import { SignUpFormServicesProvider } from '@/features/auth/components/SignUpFormServicesContext';

/**
 * サインアップページ
 */
export default function SignUpPage(): React.ReactNode {
  return (
    <div className="font-sans min-h-screen p-8 pb-20 sm:p-20">
      <main className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-gray-800">
                アカウントを作成
              </h2>
              <p className="text-sm text-gray-500">
                メールアドレスとパスワードで登録してください。
              </p>
            </div>
            <SignUpFormServicesProvider>
              <SignUpForm />
            </SignUpFormServicesProvider>
          </div>
        </div>
      </main>
    </div>
  );
}
