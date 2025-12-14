/**
 * Taskサービスの依存注入用Context
 *
 * テスト時にCustom Hooksをモック化するため、Context APIを使用してDIを実現。
 * 既存のApiClientProviderパターンと統一した設計。
 */
'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { useTasks } from '../hooks/useTasks';

/**
 * Taskサービスの型定義
 *
 * 注意: 静的解析を維持するため、変数名は`use`で始めること
 */
export interface TaskServices {
  useTasks: typeof useTasks;
  useTaskMutations: typeof useTaskMutations;
}

const TaskServicesContext = createContext<TaskServices | null>(null);

export interface TaskServicesProviderProps {
  /** テスト用のサービス注入（省略時はデフォルトのhooksを使用） */
  services?: TaskServices;
  children: ReactNode;
}

/**
 * Taskサービスを提供するProvider
 *
 * @param services - カスタムサービス（テスト用、省略時はデフォルトのhooksを使用）
 * @param children - 子コンポーネント
 *
 * @example
 * ```tsx
 * // 本番環境（デフォルトのhooksを使用）
 * <TaskServicesProvider>
 *   <TaskList />
 * </TaskServicesProvider>
 *
 * // テスト環境（mockを注入）
 * const mockServices = {
 *   useTasks: mock(() => ({ data: [], isLoading: false, error: null })),
 *   useTaskMutations: mock(() => ({ deleteTask, changeStatus })),
 * };
 * <TaskServicesProvider services={mockServices}>
 *   <TaskList />
 * </TaskServicesProvider>
 * ```
 */
export function TaskServicesProvider({
  services,
  children,
}: TaskServicesProviderProps) {
  // servicesが未指定の場合はデフォルトのhooksを使用
  const defaultServices = useMemo(
    () =>
      services || {
        useTasks,
        useTaskMutations,
      },
    [services],
  );

  return (
    <TaskServicesContext.Provider value={defaultServices}>
      {children}
    </TaskServicesContext.Provider>
  );
}

/**
 * Taskサービスを取得するフック
 *
 * TaskServicesProvider内で使用する必要がある
 *
 * @returns TaskServices（useTasks、useTaskMutations）
 * @throws {Error} TaskServicesProviderが見つからない場合
 *
 * @example
 * ```tsx
 * function TaskList() {
 *   const { useTasks: useTasksHook, useTaskMutations: useTaskMutationsHook } = useTaskServices();
 *   const { data } = useTasksHook();
 *   const { deleteTask } = useTaskMutationsHook();
 * }
 * ```
 */
export function useTaskServices(): TaskServices {
  const services = useContext(TaskServicesContext);
  if (!services) {
    throw new Error(
      'useTaskServices must be used within TaskServicesProvider. ' +
        'Wrap your component with <TaskServicesProvider>.',
    );
  }
  return services;
}
