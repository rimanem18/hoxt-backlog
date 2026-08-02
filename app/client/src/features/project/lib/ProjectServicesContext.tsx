'use client';

/**
 * Projectサービスの依存注入用Context
 *
 * テスト時にCustom Hooksをモック化するため、Context APIを使用してDIを実現。
 * 既存のTaskServicesContextパターンと統一した設計。
 */

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useProjectMutations } from '../hooks/useProjectMutations';
import { useProjects } from '../hooks/useProjects';

/**
 * Projectサービスの型定義
 *
 * 注意: 静的解析を維持するため、変数名は`use`で始めること
 */
export interface ProjectServices {
  useProjects: typeof useProjects;
  useProjectMutations: typeof useProjectMutations;
}

const ProjectServicesContext = createContext<ProjectServices | null>(null);

export interface ProjectServicesProviderProps {
  /** テスト用のサービス注入（省略時はデフォルトのhooksを使用） */
  services?: ProjectServices;
  children: ReactNode;
}

/**
 * Projectサービスを提供するProvider
 *
 * @param services - カスタムサービス（テスト用、省略時はデフォルトのhooksを使用）
 * @param children - 子コンポーネント
 *
 * @example
 * ```tsx
 * // 本番環境（デフォルトのhooksを使用）
 * <ProjectServicesProvider>
 *   <TaskCreateForm />
 * </ProjectServicesProvider>
 *
 * // テスト環境（mockを注入）
 * const mockServices = {
 *   useProjects: mock(() => ({ data: [], isLoading: false, error: null })),
 * };
 * <ProjectServicesProvider services={mockServices}>
 *   <TaskCreateForm />
 * </ProjectServicesProvider>
 * ```
 */
export function ProjectServicesProvider({
  services,
  children,
}: ProjectServicesProviderProps) {
  // servicesが未指定の場合はデフォルトのhooksを使用
  const defaultServices = useMemo(
    () =>
      services || {
        useProjects,
        useProjectMutations,
      },
    [services],
  );

  return (
    <ProjectServicesContext.Provider value={defaultServices}>
      {children}
    </ProjectServicesContext.Provider>
  );
}

/**
 * Projectサービスを取得するフック
 *
 * ProjectServicesProvider内で使用する必要がある
 *
 * @returns ProjectServices（useProjects）
 * @throws {Error} ProjectServicesProviderが見つからない場合
 */
export function useProjectServices(): ProjectServices {
  const services = useContext(ProjectServicesContext);
  if (!services) {
    throw new Error(
      'useProjectServices must be used within ProjectServicesProvider. ' +
        'Wrap your component with <ProjectServicesProvider>.',
    );
  }
  return services;
}
