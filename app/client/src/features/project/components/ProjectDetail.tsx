'use client';

import React, { useState } from 'react';
import { useProjectServices } from '../lib/ProjectServicesContext';
import ProjectEditForm from './ProjectEditForm';

interface ProjectDetailProps {
  projectId: string;
  /** そのprojectに紐づくtask一覧（features/todoへの依存を避けるため、page側から注入する） */
  taskListSection: React.ReactNode;
  /** そのprojectへのtask追加フォーム（features/todoへの依存を避けるため、page側から注入する） */
  taskCreateSection?: React.ReactNode;
}

/**
 * ProjectDetailコンポーネント
 *
 * project詳細を表示するコンテナコンポーネント。
 * ProjectServicesContext経由でhooksを取得し、ローディング・エラーの
 * 処理を行い、project情報・編集・task一覧セクションを表示する。
 */
function ProjectDetail(props: ProjectDetailProps): React.ReactNode {
  const { useProject } = useProjectServices();
  const { data: project, isLoading, error } = useProject(props.projectId);
  const [isEditing, setIsEditing] = useState(false);

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

  // エラー状態（404は権限なしと存在しないの違いを表現しないよう
  // useProject側で「プロジェクトが見つかりません」に正規化済みのメッセージを表示する）
  if (error) {
    return (
      <div
        className="text-center py-8 sm:py-12 text-red-600 text-sm sm:text-base"
        aria-live="assertive"
      >
        {error.message}
      </div>
    );
  }

  if (!project) {
    return (
      <div
        className="text-center py-8 sm:py-12 text-red-600 text-sm sm:text-base"
        aria-live="assertive"
      >
        プロジェクトが見つかりません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold truncate">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-gray-600 text-xs sm:text-sm mt-1 sm:mt-2">
              {project.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="shrink-0 px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          編集
        </button>
      </div>

      {props.taskCreateSection}

      {props.taskListSection}

      <ProjectEditForm
        project={isEditing ? project : null}
        onClose={() => setIsEditing(false)}
      />
    </div>
  );
}

export default React.memo(ProjectDetail);
