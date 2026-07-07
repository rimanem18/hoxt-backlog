'use client';

import { type ReactNode, useMemo } from 'react';
import { useForgotPassword } from '@/features/auth/hooks/useForgotPassword';
import { createFormServicesContext } from '@/shared/context/createFormServicesContext';

/**
 * ForgotPasswordFormServicesContext に渡す useForgotPassword の型
 */
export type UseForgotPasswordHook = typeof useForgotPassword;

interface ForgotPasswordFormServices {
  useForgotPassword: UseForgotPasswordHook;
}

const { Context: ForgotPasswordFormServicesContext, useFormServices } =
  createFormServicesContext<ForgotPasswordFormServices>(
    'useForgotPasswordFormServices',
  );

export interface ForgotPasswordFormServicesProviderProps {
  /** テスト用サービス注入（省略時はデフォルトのhookを使用） */
  services?: ForgotPasswordFormServices;
  children: ReactNode;
}

/**
 * ForgotPasswordFormが使用するサービスを提供するProvider
 *
 * @example
 * // テスト環境（mockを注入）
 * <ForgotPasswordFormServicesProvider services={{ useForgotPassword: mockUseForgotPassword }}>
 *   <ForgotPasswordForm />
 * </ForgotPasswordFormServicesProvider>
 */
export function ForgotPasswordFormServicesProvider(
  props: ForgotPasswordFormServicesProviderProps,
): React.ReactNode {
  const defaultServices = useMemo(
    () => props.services || { useForgotPassword },
    [props.services],
  );

  return (
    <ForgotPasswordFormServicesContext.Provider value={defaultServices}>
      {props.children}
    </ForgotPasswordFormServicesContext.Provider>
  );
}

/**
 * ForgotPasswordFormサービスを取得するフック
 *
 * @throws {Error} ForgotPasswordFormServicesProviderが見つからない場合
 */
export function useForgotPasswordFormServices(): ForgotPasswordFormServices {
  return useFormServices();
}
