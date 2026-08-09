'use client';

import React from 'react';
import { useProjectServices } from '../lib/ProjectServicesContext';

/**
 * ProjectListコンポーネント
 *
 * project一覧を表示するコンテナコンポーネント。
 * ProjectServicesContext経由でhooksを取得し、ローディング・エラー・空状態の
 * 処理を行い、各projectをカード形式で表示する。
 */
function ProjectList(): React.ReactNode {
  const { useProjects } = useProjectServices();
  const { data: projects, isLoading, error } = useProjects();

  // ローディング状態
  if (isLoading) {
    return (
      <div
        className="text-center py-8 sm:py-12 text-sm sm:text-base"
        aria-live="polite"
      >
        読み込み中...
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div
        className="text-center py-8 sm:py-12 text-red-600 text-sm sm:text-base"
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
        className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base"
        aria-live="polite"
      >
        まだプロジェクトがありません。新しいプロジェクトを作成しましょう。
      </div>
    );
  }

  return (
    <div className="space-y-0 divide-y divide-gray-200">
      {projects.map((project) => (
        <div
          key={project.id}
          className="border-l-4 border-primary bg-white p-4 sm:p-5 md:p-6 hover:bg-gray-50 transition-colors"
        >
          <a href={`/dashboard/projects/${project.id}`} className="block">
            <h3 className="text-base sm:text-lg font-semibold truncate">
              {project.name}
            </h3>
          </a>

          {project.description && (
            <div className="text-gray-600 text-xs sm:text-sm mt-1 sm:mt-2">
              {project.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default React.memo(ProjectList);
