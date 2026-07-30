'use client';

/**
 * Dashboardサービスの依存注入用Context
 *
 * テスト時にネットワーク状態確認処理をモック化するため、Context APIを使用してDIを実現。
 * 既存のHomeShellServicesContextパターン（createFormServicesContext利用）と統一した設計。
 */

import type { ReactNode } from 'react';
import { createFormServicesContext } from '@/shared/context/createFormServicesContext';

/**
 * ユーザー情報APIを呼び出し、ネットワーク状態を検証する
 *
 * 注意: 静的解析を維持するため、変数名は`use`ではなく`fetch`で始まる
 */
async function fetchUserStatus(): Promise<Response> {
  return fetch('/api/v1/users/me', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    // 5秒のタイムアウトを設定
    signal: AbortSignal.timeout(5000),
  });
}

/**
 * Dashboardサービスの型定義
 */
export interface DashboardServices {
  fetchUserStatus: () => Promise<Response>;
}

const defaultDashboardServices: DashboardServices = { fetchUserStatus };

const { Context: DashboardServicesContext, useFormServices } =
  createFormServicesContext<DashboardServices>('useDashboardServices');

export interface DashboardServicesProviderProps {
  /** テスト用のサービス注入（省略時はデフォルトの実装を使用） */
  services?: DashboardServices;
  children: ReactNode;
}

/**
 * Dashboardサービスを提供するProvider
 *
 * @example
 * ```tsx
 * // 本番環境（デフォルトの実装を使用）
 * <DashboardServicesProvider>
 *   <DashboardShell />
 * </DashboardServicesProvider>
 *
 * // テスト環境（mockを注入）
 * const mockServices = {
 *   fetchUserStatus: mock(() => Promise.resolve(new Response(null, { status: 200 }))),
 * };
 * <DashboardServicesProvider services={mockServices}>
 *   <DashboardShell />
 * </DashboardServicesProvider>
 * ```
 */
export function DashboardServicesProvider(
  props: DashboardServicesProviderProps,
): React.ReactNode {
  return (
    <DashboardServicesContext.Provider
      value={props.services ?? defaultDashboardServices}
    >
      {props.children}
    </DashboardServicesContext.Provider>
  );
}

/**
 * Dashboardサービスを取得するフック
 *
 * DashboardServicesProvider内で使用する必要がある
 *
 * @returns DashboardServices（fetchUserStatus）
 * @throws {Error} DashboardServicesProviderが見つからない場合
 */
export function useDashboardServices(): DashboardServices {
  return useFormServices();
}
