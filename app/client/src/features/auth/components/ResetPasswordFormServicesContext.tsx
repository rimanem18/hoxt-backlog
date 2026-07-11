'use client';

import { type ReactNode, useMemo } from 'react';
import { usePasswordReset } from '@/features/auth/hooks/usePasswordReset';
import { createFormServicesContext } from '@/shared/context/createFormServicesContext';

/**
 * ResetPasswordFormServicesContext に渡す usePasswordReset の型
 */
export type UsePasswordResetHook = typeof usePasswordReset;

interface ResetPasswordFormServices {
  usePasswordReset: UsePasswordResetHook;
}

const { Context: ResetPasswordFormServicesContext, useFormServices } =
  createFormServicesContext<ResetPasswordFormServices>(
    'useResetPasswordFormServices',
  );

export interface ResetPasswordFormServicesProviderProps {
  /** テスト用サービス注入（省略時はデフォルトのhookを使用） */
  services?: ResetPasswordFormServices;
  children: ReactNode;
}

/**
 * ResetPasswordFormが使用するサービスを提供するProvider
 *
 * @example
 * // テスト環境（mockを注入）
 * <ResetPasswordFormServicesProvider services={{ usePasswordReset: mockUsePasswordReset }}>
 *   <ResetPasswordForm />
 * </ResetPasswordFormServicesProvider>
 */
export function ResetPasswordFormServicesProvider(
  props: ResetPasswordFormServicesProviderProps,
): React.ReactNode {
  const defaultServices = useMemo(
    () => props.services || { usePasswordReset },
    [props.services],
  );

  return (
    <ResetPasswordFormServicesContext.Provider value={defaultServices}>
      {props.children}
    </ResetPasswordFormServicesContext.Provider>
  );
}

/**
 * ResetPasswordFormサービスを取得するフック
 *
 * @throws {Error} ResetPasswordFormServicesProviderが見つからない場合
 */
export function useResetPasswordFormServices(): ResetPasswordFormServices {
  return useFormServices();
}
