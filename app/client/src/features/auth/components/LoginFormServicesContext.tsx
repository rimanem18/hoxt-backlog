'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useEmailSignin } from '@/features/auth/hooks/useEmailSignin';

/**
 * LoginFormServicesContext に渡す useEmailSignin の型
 */
export type UseEmailSigninHook = typeof useEmailSignin;

interface LoginFormServices {
  useEmailSignin: UseEmailSigninHook;
}

const LoginFormServicesContext = createContext<LoginFormServices | null>(null);

export interface LoginFormServicesProviderProps {
  /** テスト用サービス注入（省略時はデフォルトのhookを使用） */
  services?: LoginFormServices;
  children: ReactNode;
}

/**
 * LoginFormが使用するサービスを提供するProvider
 *
 * @example
 * // テスト環境（mockを注入）
 * <LoginFormServicesProvider services={{ useEmailSignin: mockUseEmailSignin }}>
 *   <LoginForm />
 * </LoginFormServicesProvider>
 */
export function LoginFormServicesProvider({
  services,
  children,
}: LoginFormServicesProviderProps): React.ReactNode {
  const defaultServices = useMemo(
    () => services || { useEmailSignin },
    [services],
  );

  return (
    <LoginFormServicesContext.Provider value={defaultServices}>
      {children}
    </LoginFormServicesContext.Provider>
  );
}

/**
 * LoginFormサービスを取得するフック
 *
 * @throws {Error} LoginFormServicesProviderが見つからない場合
 */
export function useLoginFormServices(): LoginFormServices {
  const services = useContext(LoginFormServicesContext);
  if (!services) {
    throw new Error(
      'useLoginFormServices must be used within LoginFormServicesProvider. ' +
        'Wrap your component with <LoginFormServicesProvider>.',
    );
  }
  return services;
}
