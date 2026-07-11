'use client';

import { useState } from 'react';
import { useAuthServices } from '@/features/auth/services/AuthServicesContext';
import type { RequestPasswordResetResult } from '@/features/auth/services/authService';

export type ForgotPasswordStatus = 'idle' | 'loading' | 'sent' | 'error';

export interface UseForgotPasswordResult {
  isLoading: boolean;
  status: ForgotPasswordStatus;
  errorMessage: string | null;
  requestReset: (email: string) => Promise<void>;
}

/**
 * パスワードリセット依頼フック
 *
 * authServiceを使ってパスワードリセットメールの送信を依頼し、
 * 送信完了またはエラー状態をローカル状態で管理する。
 */
export function useForgotPassword(): UseForgotPasswordResult {
  const { authService } = useAuthServices();
  const [status, setStatus] = useState<ForgotPasswordStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestReset = async (email: string): Promise<void> => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const result: RequestPasswordResetResult =
        await authService.requestPasswordReset(email, redirectTo);

      if (result.status === 'sent') {
        setStatus('sent');
      } else {
        setStatus('error');
        setErrorMessage(result.errorMessage);
      }
    } catch {
      setStatus('error');
      setErrorMessage(
        'リクエストの送信に失敗しました。時間をおいて再度お試しください',
      );
    }
  };

  return {
    isLoading: status === 'loading',
    status,
    errorMessage,
    requestReset,
  };
}
