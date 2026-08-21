'use client';

/**
 * Viewerサービスの依存注入用Context
 *
 * テスト時にCustom Hooksをモック化するため、Context APIを使用してDIを実現。
 * 既存のViewerManagementServicesContextパターンと統一した設計。
 */

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useViewerAccessibleProjects } from '../hooks/useViewerAccessibleProjects';

/**
 * Viewerサービスの型定義
 *
 * 注意: 静的解析を維持するため、変数名は`use`で始めること
 */
export interface ViewerServices {
  useViewerAccessibleProjects: typeof useViewerAccessibleProjects;
}

const ViewerServicesContext = createContext<ViewerServices | null>(null);

export interface ViewerServicesProviderProps {
  /** テスト用のサービス注入（省略時はデフォルトのhooksを使用） */
  services?: ViewerServices;
  children: ReactNode;
}

/**
 * Viewerサービスを提供するProvider
 *
 * @param services - カスタムサービス（テスト用、省略時はデフォルトのhooksを使用）
 * @param children - 子コンポーネント
 *
 * @example
 * ```tsx
 * // 本番環境（デフォルトのhooksを使用）
 * <ViewerServicesProvider>
 *   <ViewerTaskBoardContent />
 * </ViewerServicesProvider>
 *
 * // テスト環境（mockを注入）
 * const mockServices = {
 *   useViewerAccessibleProjects: mock(() => ({ data: [], isLoading: false, error: null })),
 * };
 * <ViewerServicesProvider services={mockServices}>
 *   <ViewerTaskBoardContent />
 * </ViewerServicesProvider>
 * ```
 */
export function ViewerServicesProvider(props: ViewerServicesProviderProps) {
  // servicesが未指定の場合はデフォルトのhooksを使用
  const defaultServices = useMemo(
    () =>
      props.services || {
        useViewerAccessibleProjects,
      },
    [props.services],
  );

  return (
    <ViewerServicesContext.Provider value={defaultServices}>
      {props.children}
    </ViewerServicesContext.Provider>
  );
}

/**
 * Viewerサービスを取得するフック
 *
 * ViewerServicesProvider内で使用する必要がある
 *
 * @returns ViewerServices
 * @throws {Error} ViewerServicesProviderが見つからない場合
 */
export function useViewerServices(): ViewerServices {
  const services = useContext(ViewerServicesContext);
  if (!services) {
    throw new Error(
      'useViewerServices must be used within ViewerServicesProvider. ' +
        'Wrap your component with <ViewerServicesProvider>.',
    );
  }
  return services;
}
