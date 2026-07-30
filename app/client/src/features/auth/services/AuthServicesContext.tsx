'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { type AuthServiceInterface, defaultAuthService } from './authService';

interface AuthServices {
  authService: AuthServiceInterface;
}

const AuthServicesContext = createContext<AuthServices | null>(null);

export interface AuthServicesProviderProps {
  /** テスト用サービス注入（省略時はデフォルトのauthServiceを使用） */
  services?: AuthServices;
  children: ReactNode;
}

/**
 * 認証サービスを提供するProvider
 *
 * @example
 * // テスト環境（mockを注入）
 * <AuthServicesProvider services={{ authService: mockAuthService }}>
 *   <ComponentUnderTest />
 * </AuthServicesProvider>
 */
export function AuthServicesProvider({
  services,
  children,
}: AuthServicesProviderProps): React.ReactNode {
  const defaultServices = useMemo(
    () => services || { authService: defaultAuthService },
    [services],
  );

  return (
    <AuthServicesContext.Provider value={defaultServices}>
      {children}
    </AuthServicesContext.Provider>
  );
}

/**
 * 認証サービスを取得するフック
 *
 * @throws {Error} AuthServicesProviderが見つからない場合
 */
export function useAuthServices(): AuthServices {
  const services = useContext(AuthServicesContext);
  if (!services) {
    throw new Error(
      'useAuthServices must be used within AuthServicesProvider. ' +
        'Wrap your component with <AuthServicesProvider>.',
    );
  }
  return services;
}
