'use client';

import type { AuthResponse } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useMemo } from 'react';

export type ExchangeCodeFn = (code: string) => Promise<AuthResponse>;

export interface ConfirmPageServices {
  exchangeCode: ExchangeCodeFn;
  code: string | undefined;
}

export const ConfirmPageServicesContext =
  createContext<ConfirmPageServices | null>(null);

// supabase はテスト環境での不要なロードを避けるため動的インポートを使用
export const defaultExchangeCode: ExchangeCodeFn = async (code: string) => {
  const { supabase } = await import('@/lib/supabase');
  return supabase.auth.exchangeCodeForSession(code);
};

export interface ConfirmPageServicesProviderProps {
  /** テスト用サービス注入（省略時はデフォルトの実装を使用） */
  services?: { exchangeCode: ExchangeCodeFn };
  /** URLのsearchParams（テスト用） */
  searchParams?: Record<string, string>;
  children: ReactNode;
}

/**
 * メールアドレス確認ページが使用するサービスを提供するProvider
 *
 * @example
 * // テスト環境（mockを注入）
 * <ConfirmPageServicesProvider
 *   services={{ exchangeCode: mockExchangeCode }}
 *   searchParams={{ code: 'valid-code' }}
 * >
 *   <EmailConfirmPage />
 * </ConfirmPageServicesProvider>
 */
export function ConfirmPageServicesProvider(
  props: ConfirmPageServicesProviderProps,
): React.ReactNode {
  const code = props.searchParams?.['code'];

  const value = useMemo(
    () => ({
      exchangeCode: props.services?.exchangeCode ?? defaultExchangeCode,
      code,
    }),
    [props.services, code],
  );

  return (
    <ConfirmPageServicesContext.Provider value={value}>
      {props.children}
    </ConfirmPageServicesContext.Provider>
  );
}

/**
 * メールアドレス確認ページのサービスを取得するフック
 *
 * ConfirmPageServicesProvider 内でのみ使用する。
 * Provider なし（本番ルート直接マウント）では null を返す。
 */
export function useConfirmPageServices(): ConfirmPageServices | null {
  return useContext(ConfirmPageServicesContext);
}
