'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useProjectServices } from '@/features/project/lib/ProjectServicesContext';
import type { Task } from '@/packages/shared-schemas/src/tasks';
import { useTaskServices } from '../lib/TaskServicesContext';

/**
 * タスク編集モーダルコンポーネント
 *
 * 既存タスクの詳細情報（タイトル・説明・優先度）をモーダルダイアログで編集するコンポーネント。
 * クライアント側バリデーション（空文字エラー表示、100文字制限）とエラーメッセージ表示機能を提供する。
 *
 * @example
 * ```tsx
 * const [editingTask, setEditingTask] = useState<Task | null>(null);
 * return (
 *   <TaskServicesProvider>
 *     <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} />
 *   </TaskServicesProvider>
 * );
 * ```
 */
function TaskEditModal(props: {
  task: Task | null;
  onClose: () => void;
}): React.ReactNode {
  const services = useTaskServices();
  const { updateTask } = services.useTaskMutations();
  const { useProjects } = useProjectServices();
  // モーダル非表示中（task === null）は不要なため取得しない
  const { data: projects, isLoading: isProjectsLoading } = useProjects({
    enabled: props.task !== null,
  });

  const [title, setTitle] = useState(props.task?.title || '');
  const [description, setDescription] = useState<string | null>(
    props.task?.description ?? null,
  );
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(
    props.task?.priority || 'medium',
  );
  const [projectId, setProjectId] = useState(props.task?.projectId ?? '');
  const [error, setError] = useState('');

  // props.taskの変化に応じてstateをリセット
  useEffect(() => {
    if (props.task) {
      setTitle(props.task.title);
      setDescription(props.task.description ?? null);
      setPriority(props.task.priority);
      setProjectId(props.task.projectId ?? '');
      setError('');
    }
  }, [props.task]);

  // Escapeキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose();
      }
    };

    if (props.task) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [props.task, props.onClose]);

  // モーダル表示時に最初の入力フィールドにフォーカス
  useEffect(() => {
    if (props.task) {
      const titleInput = document.getElementById('edit-title');
      if (titleInput) {
        titleInput.focus();
      }
    }
  }, [props.task]);

  // タイトルのバリデーション結果を返すヘルパー関数
  const validateTitle = useCallback(
    (titleToValidate: string): string | null => {
      if (!titleToValidate.trim()) {
        return 'タイトルを入力してください';
      }
      if (titleToValidate.length > 100) {
        return 'タイトルは100文字以内で入力してください';
      }
      return null;
    },
    [],
  );

  // フォーム送信時のロジックを集約したヘルパー関数
  const mutateTask = useCallback(
    (input: {
      title: string;
      description: string | null;
      priority: 'high' | 'medium' | 'low';
      projectId?: string;
    }) => {
      if (!props.task) return;

      updateTask.mutate(
        {
          id: props.task.id,
          input,
        },
        {
          onSuccess: () => {
            props.onClose();
          },
          onError: (err) => {
            setError(err.message);
          },
        },
      );
    },
    [updateTask, props],
  );

  if (!props.task) return null;
  const task = props.task;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setError('');

    const validationError = validateTitle(title);
    if (validationError) {
      setError(validationError);
      return;
    }

    // 未所属（空文字）はバックエンドのnull送信に非対応のため、変更時のみ送信する
    const initialProjectId = task.projectId ?? '';
    const hasProjectChanged = projectId !== initialProjectId;

    mutateTask({
      title,
      description,
      priority,
      ...(hasProjectChanged ? { projectId } : {}),
    });
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
        aria-labelledby="modal-title"
      >
        <h2
          id="modal-title"
          className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4"
        >
          タスクを編集
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label
                htmlFor="edit-title"
                className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
              >
                タイトル
              </label>
              <input
                id="edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                maxLength={100}
                aria-label="タイトル"
              />
            </div>
            <div>
              <label
                htmlFor="edit-description"
                className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
              >
                説明（Markdown）
              </label>
              <textarea
                id="edit-description"
                value={description ?? ''}
                onChange={(e) => setDescription(e.target.value || null)}
                className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent h-24 sm:h-32"
                aria-label="説明（Markdown）"
              />
            </div>
            <div>
              <label
                htmlFor="edit-priority"
                className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
              >
                優先度
              </label>
              <select
                id="edit-priority"
                value={priority}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'high' || val === 'medium' || val === 'low') {
                    setPriority(val);
                  }
                }}
                className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label="優先度"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="edit-project"
                className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
              >
                プロジェクト
              </label>
              {isProjectsLoading ? (
                <p aria-live="polite">プロジェクトを読み込み中...</p>
              ) : (
                <select
                  id="edit-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  aria-label="プロジェクト"
                >
                  {/* 所属済みtaskでは未所属に戻す操作を不可にする（バックエンドがprojectIdのnull送信に非対応のため） */}
                  {!task.projectId && <option value="">未所属</option>}
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* エラーメッセージ表示 */}
          {error && (
            <div
              className="mt-3 sm:mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm"
              role="alert"
              aria-live="polite"
            >
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-6">
            <button
              type="submit"
              className="flex-1 px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-opacity-80 disabled:opacity-50 transition-colors"
              disabled={updateTask.isPending}
              aria-label="保存"
            >
              保存
            </button>
            <button
              type="button"
              onClick={props.onClose}
              className="flex-1 px-4 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="キャンセル"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default React.memo(TaskEditModal);
