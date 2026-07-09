'use client';

import type { DemoCredentials } from '@/features/auth/config/authConfig';
import { getDemoCredentials } from '@/features/auth/config/authConfig';

interface DemoLoginButtonProps {
  signIn: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  credentials?: DemoCredentials | null;
}

export function DemoLoginButton(props: DemoLoginButtonProps): React.ReactNode {
  const credentials =
    props.credentials === undefined
      ? getDemoCredentials()
      : props.credentials;

  if (!credentials) {
    return null;
  }

  const handleClick = async () => {
    await props.signIn(credentials.email, credentials.password);
  };

  return (
    <div className="border-t border-gray-100 pt-4 mt-2 space-y-2">
      <p className="text-xs text-gray-400 text-center">
        動作確認用のデモアカウントでログインします
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={props.isLoading}
        className="w-full py-3 px-4 rounded-lg border border-purple-600
          bg-purple-600 text-white text-sm font-semibold shadow-sm
          hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50
          disabled:cursor-not-allowed transition-colors"
      >
        {props.isLoading ? 'ログイン中...' : 'デモユーザーとしてログイン'}
      </button>
    </div>
  );
}
