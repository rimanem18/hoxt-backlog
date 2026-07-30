'use client';

import { useState } from 'react';
import { useAuthServices } from '@/features/auth/services/AuthServicesContext';
import type { SignupResult } from '@/features/auth/services/authService';

export type SignupStatus =
  | 'idle'
  | 'loading'
  | 'pending_confirmation'
  | 'error';

export interface UseEmailSignupResult {
  isLoading: boolean;
  status: SignupStatus;
  errorMessage: string | null;
  signup: (email: string, password: string) => Promise<void>;
}

/**
 * メールパスワードサインアップフック
 *
 * authServiceを使ってメールとパスワードでサインアップし、
 * 確認メール送信完了またはエラー状態をローカル状態で管理する。
 */
export function useEmailSignup(): UseEmailSignupResult {
  const { authService } = useAuthServices();
  const [status, setStatus] = useState<SignupStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signup = async (email: string, password: string): Promise<void> => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const result: SignupResult = await authService.signup(email, password);

      if (result.status === 'pending_confirmation') {
        setStatus('pending_confirmation');
      } else {
        setStatus('error');
        setErrorMessage(result.errorMessage);
      }
    } catch {
      setStatus('error');
      setErrorMessage(
        'サインアップに失敗しました。時間をおいて再度お試しください',
      );
    }
  };

  return {
    isLoading: status === 'loading',
    status,
    errorMessage,
    signup,
  };
}
