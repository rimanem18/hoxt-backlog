'use client';

import { useState } from 'react';
import { useAuthServices } from '@/features/auth/services/AuthServicesContext';
import { authSlice } from '@/features/auth/store/authSlice';
import { useAppDispatch } from '@/store/hooks';

export interface UseEmailSigninResult {
  isLoading: boolean;
  errorMessage: string | null;
  signIn: (email: string, password: string) => Promise<void>;
}

/**
 * メールパスワード認証フック
 *
 * authServiceを使ってメールとパスワードでサインインし、
 * 結果をRedux storeに反映する。
 */
export function useEmailSignin(): UseEmailSigninResult {
  const { authService } = useAuthServices();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signIn = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await authService.signInWithEmailPassword(email, password);

      if (!result.success) {
        setErrorMessage(result.errorMessage);
        dispatch(authSlice.actions.authFailure({ error: result.errorMessage }));
        return;
      }

      const verifyResult = await authService.verifySession(
        result.session.access_token,
      );
      dispatch(
        authSlice.actions.authSuccess({
          user: verifyResult.user,
          isNewUser: verifyResult.isNewUser,
        }),
      );
    } catch {
      const message =
        'サインインに失敗しました。時間をおいて再度お試しください';
      setErrorMessage(message);
      dispatch(authSlice.actions.authFailure({ error: message }));
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, errorMessage, signIn };
}
