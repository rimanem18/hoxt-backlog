'use client';

import React, { useEffect, useState } from 'react';
import type { Project } from '@/packages/shared-schemas/src/projects';
import { useProjectServices } from '../lib/ProjectServicesContext';

/**
 * プロジェクト編集フォームコンポーネント
 *
 * 既存プロジェクトの名称・説明文をモーダルダイアログで編集するコンポーネント。
 * クライアント側バリデーション（空文字・101文字超のエラー表示）とエラーメッセージ
 * 表示機能を提供する。
 *
 * @example
 * ```tsx
 * const [editingProject, setEditingProject] = useState<Project | null>(null);
 * return (
 *   <ProjectServicesProvider>
 *     <ProjectEditForm project={editingProject} onClose={() => setEditingProject(null)} />
 *   </ProjectServicesProvider>
 * );
 * ```
 */
function ProjectEditForm(props: {
  project: Project | null;
  onClose: () => void;
}): React.ReactNode {
  const { useProjectMutations } = useProjectServices();
  const { updateProject } = useProjectMutations();

  const [name, setName] = useState(props.project?.name ?? '');
  const [description, setDescription] = useState(
    props.project?.description ?? '',
  );
  const [error, setError] = useState('');

  // props.projectの変化に応じてstateをリセット
  useEffect(() => {
    if (props.project) {
      setName(props.project.name);
      setDescription(props.project.description ?? '');
      setError('');
    }
  }, [props.project]);

  // Escapeキーでモーダルを閉じる（TaskEditModal.tsxと同一パターン）
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose();
      }
    };

    if (props.project) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [props.project, props.onClose]);

  if (!props.project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setError('');

    // クライアント側バリデーション：API側（trim後1〜100文字）と同一基準で検証
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('プロジェクト名を入力してください');
      return;
    }

    if (trimmedName.length > 100) {
      setError('プロジェクト名は100文字以内で入力してください');
      return;
    }

    if (!props.project) return;

    updateProject.mutate(
      {
        id: props.project.id,
        input: {
          name: trimmedName,
          // 部分更新API: descriptionを省略すると「変更しない」と解釈されるため、
          // 空欄にして説明文をクリアできるよう常にtrim後の値を送信する
          description: description.trim(),
        },
      },
      {
        onSuccess: () => {
          props.onClose();
        },
        onError: (err: Error) => {
          setError(err.message);
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="presentation"
    >
      <div
        className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-project-modal-title"
      >
        <h2
          id="edit-project-modal-title"
          className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4"
        >
          プロジェクトを編集
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="edit-project-name"
              className="text-sm sm:text-base font-medium"
            >
              プロジェクト名
            </label>
            <input
              id="edit-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="edit-project-description"
              className="text-sm sm:text-base font-medium"
            >
              説明文
            </label>
            <textarea
              id="edit-project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* エラーメッセージ表示 */}
          {error && (
            <div
              className="p-3 bg-red-100 text-red-700 rounded-lg"
              role="alert"
              aria-live="polite"
            >
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              className="flex-1 px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-opacity-80 disabled:opacity-50 transition-colors"
              disabled={updateProject.isPending}
            >
              保存
            </button>
            <button
              type="button"
              onClick={props.onClose}
              className="flex-1 px-4 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default React.memo(ProjectEditForm);
