'use client';

import type { ViewerAccessibleProject } from '@hoxt-backlog/shared-schemas/viewers';
import type React from 'react';
import { useMemo } from 'react';
import { createApiClient } from '@/lib/api';
import { ApiClientProvider } from '@/lib/apiClientContext';
import { getApiBaseUrl } from '@/lib/env';
import { formatJapaneseDate } from '../lib/formatJapaneseDate';
import {
  useViewerServices,
  ViewerServicesProvider,
} from '../lib/ViewerServicesContext';

/**
 * 優先度に応じたテキストカラーとスタイルのマップ
 *
 * viewer DTOのpriorityは型付きenumではなく生文字列のため、未知値は`??`でフォールバックする
 */
const priorityColorMap: Record<string, string> = {
  high: 'text-accent font-bold',
  medium: 'text-gray-700',
  low: 'text-gray-400',
};

/** 優先度値から表示ラベルへの変換マップ */
const priorityLabelMap: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

/** ステータスに応じたバッジスタイルのマップ */
const statusBadgeMap: Record<string, string> = {
  not_started: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-200 text-blue-700',
  in_review: 'bg-yellow-200 text-yellow-700',
  completed: 'bg-green-200 text-green-700',
};

/** ステータス値から表示ラベルへの変換マップ */
const statusLabelMap: Record<string, string> = {
  not_started: '未着手',
  in_progress: '進行中',
  in_review: 'レビュー中',
  completed: '完了',
};

/**
 * viewer向けtask一覧の表示コンポーネント
 *
 * projectごとにtaskをグルーピングして表示するプレゼンテーションコンポーネント。
 * 無効なトークンの場合でも再発行導線（リンク・ボタン）は表示しない（REQ-306）。
 */
export function ViewerTaskBoardContent(): React.ReactNode {
  const { useViewerAccessibleProjects } = useViewerServices();
  const { data, isLoading, error } = useViewerAccessibleProjects();

  if (isLoading) {
    return (
      <div aria-live="polite">
        <span className="text-sm text-gray-500">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div aria-live="assertive">
        <span className="text-sm text-red-700">{error.message}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div aria-live="polite">
        <span className="text-sm text-gray-500">
          閲覧できるprojectがありません
        </span>
      </div>
    );
  }

  const { viewerEmail, tokenExpiresAt, projects } = data;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <span className="text-sm text-gray-500">
        {viewerEmail} として閲覧しています。
      </span>

      <span className="text-sm text-gray-500">
        このURLの有効期限は{formatJapaneseDate(tokenExpiresAt)}までです。
      </span>

      {projects.length === 0 && (
        <div aria-live="polite">
          <span className="text-sm text-gray-500">
            閲覧できるprojectがありません
          </span>
        </div>
      )}

      {projects.map((project: ViewerAccessibleProject) => (
        <div
          key={project.projectId}
          className="bg-white rounded-lg shadow p-4 sm:p-6"
        >
          <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">
            {project.projectName}
          </h2>

          {project.ownerName && (
            <p className="text-sm text-gray-500 -mt-2 mb-2 sm:mb-4">
              {project.ownerName}さんのタスク
            </p>
          )}

          <div className="flex flex-col divide-y divide-gray-200">
            {project.tasks.map((task) => (
              <div key={task.id} className="py-3 sm:py-4 first:pt-0">
                <h3 className="text-base sm:text-lg font-semibold truncate">
                  {task.title}
                </h3>

                {task.description && task.description.trim() !== '' && (
                  <p className="text-gray-600 text-xs sm:text-sm mt-1 sm:mt-2">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2 sm:mt-3 flex-wrap">
                  <span
                    className={`text-xs sm:text-sm ${priorityColorMap[task.priority] ?? 'text-gray-700'}`}
                  >
                    {priorityLabelMap[task.priority] ?? task.priority}
                  </span>

                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded ${statusBadgeMap[task.status] ?? 'bg-gray-200 text-gray-700'}`}
                  >
                    {statusLabelMap[task.status] ?? task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ViewerTaskBoardProps {
  /** viewerアクセストークン */
  token: string;
}

/**
 * viewer向けtask一覧画面（本番用エントリポイント）
 *
 * propsのtokenからviewer専用APIクライアントを構築し、DI用Providerで
 * ViewerTaskBoardContentへ供給する。
 *
 * @example
 * ```tsx
 * <ViewerTaskBoard token={token} />
 * ```
 */
export default function ViewerTaskBoard(
  props: ViewerTaskBoardProps,
): React.ReactNode {
  const apiClient = useMemo(
    () =>
      createApiClient(getApiBaseUrl(), { 'Viewer-Access-Token': props.token }),
    [props.token],
  );

  return (
    <ApiClientProvider client={apiClient}>
      <ViewerServicesProvider>
        <ViewerTaskBoardContent />
      </ViewerServicesProvider>
    </ApiClientProvider>
  );
}
