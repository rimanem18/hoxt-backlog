'use client';

import { useEffect, useState } from 'react';
import { useAuthServices } from '@/features/auth/services/AuthServicesContext';
import type { UpdatePasswordResult } from '@/features/auth/services/authService';
import { INVALID_RESET_LINK_MESSAGE } from '@/features/auth/services/emailPasswordErrorHandler';

export type PasswordResetStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UsePasswordResetResult {
  isReady: boolean;
  isLoading: boolean;
  status: PasswordResetStatus;
  errorMessage: string | null;
  updatePassword: (newPassword: string) => Promise<void>;
}

/**
 * パスワード再設定フック
 *
 * Supabaseが発行するPASSWORD_RECOVERYイベントの受信を待ち、
 * 受信後にupdatePasswordでパスワードの更新を行う。
 */
export function usePasswordReset(): UsePasswordResetResult {
  const { authService } = useAuthServices();
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<PasswordResetStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });

    return unsubscribe;
  }, [authService]);

  // Supabaseは無効・期限切れリンクの場合PASSWORD_RECOVERYを発火せず、
  // 代わりにerror_codeクエリパラメータ付きでリダイレクトするため、
  // 到達時点でこれを検出してREQ-305のエラー表示に遷移させる
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const errorCode = search.get('error_code') ?? hash.get('error_code');

    if (errorCode) {
      setStatus('error');
      setErrorMessage(INVALID_RESET_LINK_MESSAGE);
    }
  }, []);

  const updatePassword = async (newPassword: string): Promise<void> => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const result: UpdatePasswordResult =
        await authService.updatePassword(newPassword);

      if (result.status === 'success') {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(result.errorMessage);
      }
    } catch {
      setStatus('error');
      setErrorMessage(
        'パスワードの更新に失敗しました。時間をおいて再度お試しください',
      );
    }
  };

  return {
    isReady,
    isLoading: status === 'loading',
    status,
    errorMessage,
    updatePassword,
  };
}
