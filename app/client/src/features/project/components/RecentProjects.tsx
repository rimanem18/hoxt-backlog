'use client';

import type { Project } from '@hoxt-backlog/shared-schemas/projects';
import React from 'react';
import { useProjectServices } from '../lib/ProjectServicesContext';

/**
 * RecentProjectsコンポーネント
 *
 * 最近のプロジェクト（最大3件）を表示するコンテナコンポーネント。
 * ProjectServicesContext経由でhooksを取得し、ローディング・エラー・空状態の
 * 処理を行い、各projectをリスト形式で表示する。
 */
function RecentProjects(): React.ReactNode {
  const { useProjects } = useProjectServices();
  const { data: projects, isLoading, error } = useProjects();

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-4">最近のプロジェクト</h2>
      {renderBody(projects, isLoading, error)}
    </div>
  );
}

function renderBody(
  projects: Project[] | undefined,
  isLoading: boolean,
  error: Error | null,
): React.ReactNode {
  // ローディング状態
  if (isLoading) {
    return (
      <div className="text-center py-4 text-sm sm:text-base" aria-live="polite">
        読み込み中...
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div
        className="text-center py-4 text-red-600 text-sm sm:text-base"
        aria-live="assertive"
      >
        エラーが発生しました
      </div>
    );
  }

  // 空状態
  if (!projects || projects.length === 0) {
    return (
      <div
        className="text-center py-4 text-gray-500 text-sm sm:text-base"
        aria-live="polite"
      >
        <p className="mb-4">まだプロジェクトがありません</p>
        <a
          href="/dashboard/projects"
          className="text-primary hover:underline font-semibold"
        >
          プロジェクト一覧へ
        </a>
      </div>
    );
  }

  // 最大3件のみ表示
  const displayProjects = projects.slice(0, 3);

  return (
    <div className="divide-y divide-gray-200">
      {displayProjects.map((project) => (
        <a
          key={project.id}
          href={`/dashboard/projects/${project.id}`}
          className="block py-3 text-base font-medium text-primary hover:underline hover:bg-gray-50 transition-colors truncate"
        >
          {project.name}
        </a>
      ))}
    </div>
  );
}

export default React.memo(RecentProjects);
