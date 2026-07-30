'use client';

import { type ReactNode, useMemo } from 'react';
import { useEmailSignup } from '@/features/auth/hooks/useEmailSignup';
import { createFormServicesContext } from '@/shared/context/createFormServicesContext';

/**
 * SignUpFormServicesContext に渡す useEmailSignup の型
 */
export type UseEmailSignupHook = typeof useEmailSignup;

interface SignUpFormServices {
  useEmailSignup: UseEmailSignupHook;
}

const { Context: SignUpFormServicesContext, useFormServices } =
  createFormServicesContext<SignUpFormServices>('useSignUpFormServices');

export interface SignUpFormServicesProviderProps {
  /** テスト用サービス注入（省略時はデフォルトのhookを使用） */
  services?: SignUpFormServices;
  children: ReactNode;
}

/**
 * SignUpFormが使用するサービスを提供するProvider
 *
 * @example
 * // テスト環境（mockを注入）
 * <SignUpFormServicesProvider services={{ useEmailSignup: mockUseEmailSignup }}>
 *   <SignUpForm />
 * </SignUpFormServicesProvider>
 */
export function SignUpFormServicesProvider(
  props: SignUpFormServicesProviderProps,
): React.ReactNode {
  const defaultServices = useMemo(
    () => props.services || { useEmailSignup },
    [props.services],
  );

  return (
    <SignUpFormServicesContext.Provider value={defaultServices}>
      {props.children}
    </SignUpFormServicesContext.Provider>
  );
}

/**
 * SignUpFormサービスを取得するフック
 *
 * @throws {Error} SignUpFormServicesProviderが見つからない場合
 */
export function useSignUpFormServices(): SignUpFormServices {
  return useFormServices();
}
