'use client';

/**
 * ViewerManagementサービスの依存注入用Context
 *
 * テスト時にCustom Hooksをモック化するため、Context APIを使用してDIを実現。
 * 既存のProjectServicesContextパターンと統一した設計。
 */

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useInviteViewer } from '../hooks/useInviteViewer';
import { useProjectViewers } from '../hooks/useProjectViewers';
import { useRevokeViewer } from '../hooks/useRevokeViewer';

/**
 * ViewerManagementサービスの型定義
 *
 * 注意: 静的解析を維持するため、変数名は`use`で始めること
 */
export interface ViewerManagementServices {
  useInviteViewer: typeof useInviteViewer;
  useProjectViewers: typeof useProjectViewers;
  useRevokeViewer: typeof useRevokeViewer;
}

const ViewerManagementServicesContext =
  createContext<ViewerManagementServices | null>(null);

export interface ViewerManagementServicesProviderProps {
  /** テスト用のサービス注入（省略時はデフォルトのhooksを使用） */
  services?: ViewerManagementServices;
  children: ReactNode;
}

/**
 * ViewerManagementサービスを提供するProvider
 *
 * @param services - カスタムサービス（テスト用、省略時はデフォルトのhooksを使用）
 * @param children - 子コンポーネント
 *
 * @example
 * ```tsx
 * // 本番環境（デフォルトのhooksを使用）
 * <ViewerManagementServicesProvider>
 *   <ViewerInviteForm projectId={projectId} />
 * </ViewerManagementServicesProvider>
 *
 * // テスト環境（mockを注入）
 * const mockServices = {
 *   useInviteViewer: mock(() => ({ mutate: mock(() => {}), isPending: false })),
 * };
 * <ViewerManagementServicesProvider services={mockServices}>
 *   <ViewerInviteForm projectId={projectId} />
 * </ViewerManagementServicesProvider>
 * ```
 */
export function ViewerManagementServicesProvider({
  services,
  children,
}: ViewerManagementServicesProviderProps) {
  // servicesが未指定の場合はデフォルトのhooksを使用
  const defaultServices = useMemo(
    () =>
      services || {
        useInviteViewer,
        useProjectViewers,
        useRevokeViewer,
      },
    [services],
  );

  return (
    <ViewerManagementServicesContext.Provider value={defaultServices}>
      {children}
    </ViewerManagementServicesContext.Provider>
  );
}

/**
 * ViewerManagementサービスを取得するフック
 *
 * ViewerManagementServicesProvider内で使用する必要がある
 *
 * @returns ViewerManagementServices
 * @throws {Error} ViewerManagementServicesProviderが見つからない場合
 */
export function useViewerManagementServices(): ViewerManagementServices {
  const services = useContext(ViewerManagementServicesContext);
  if (!services) {
    throw new Error(
      'useViewerManagementServices must be used within ViewerManagementServicesProvider. ' +
        'Wrap your component with <ViewerManagementServicesProvider>.',
    );
  }
  return services;
}
