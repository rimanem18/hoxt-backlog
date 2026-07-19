'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import { createFormServicesContext } from '@/shared/context/createFormServicesContext';

export type NavigateFn = (path: string) => void;

export interface HomeShellServices {
  navigate: NavigateFn;
}

const { Context: HomeShellServicesContext, useFormServices } =
  createFormServicesContext<HomeShellServices>('useHomeShellServices');

export interface HomeShellServicesProviderProps {
  /** テスト用サービス注入（省略時はデフォルトの実装を使用） */
  services?: HomeShellServices;
  children: ReactNode;
}

// services未指定時のみ useRouter を呼び出すためのラッパー。
// React hooksのルール上、useRouter を条件付きで呼べないため
// コンポーネント自体を分離する。
function DefaultHomeShellServicesProvider(props: {
  children: ReactNode;
}): React.ReactNode {
  const router = useRouter();
  const value = useMemo<HomeShellServices>(
    () => ({ navigate: (path: string) => router.replace(path) }),
    [router],
  );

  return (
    <HomeShellServicesContext.Provider value={value}>
      {props.children}
    </HomeShellServicesContext.Provider>
  );
}

/**
 * ホームページが使用するサービスを提供するProvider
 *
 * @example
 * // 本番環境（デフォルトのuseRouterを使用）
 * <HomeShellServicesProvider>
 *   <HomeAuthShell />
 * </HomeShellServicesProvider>
 *
 * // テスト環境（mockを注入）
 * <HomeShellServicesProvider services={{ navigate: mockNavigate }}>
 *   <HomeAuthShell />
 * </HomeShellServicesProvider>
 */
export function HomeShellServicesProvider(
  props: HomeShellServicesProviderProps,
): React.ReactNode {
  if (props.services) {
    return (
      <HomeShellServicesContext.Provider value={props.services}>
        {props.children}
      </HomeShellServicesContext.Provider>
    );
  }

  return (
    <DefaultHomeShellServicesProvider>
      {props.children}
    </DefaultHomeShellServicesProvider>
  );
}

/**
 * ホームページのサービスを取得するフック
 *
 * HomeShellServicesProvider内で使用する必要がある
 *
 * @throws {Error} HomeShellServicesProviderが見つからない場合
 */
export function useHomeShellServices(): HomeShellServices {
  return useFormServices();
}
