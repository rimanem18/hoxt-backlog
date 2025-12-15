'use client';

import React, { useCallback, useEffect, useState } from 'react';
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

  const [title, setTitle] = useState(props.task?.title || '');
  const [description, setDescription] = useState<string | null>(
    props.task?.description ?? null,
  );
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(
    props.task?.priority || 'medium',
  );
  const [error, setError] = useState('');

  // props.taskの変化に応じてstateをリセット
  useEffect(() => {
    if (props.task) {
      setTitle(props.task.title);
      setDescription(props.task.description ?? null);
      setPriority(props.task.priority);
      setError('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setError('');

    const validationError = validateTitle(title);
    if (validationError) {
      setError(validationError);
      return;
    }

    mutateTask({ title, description, priority });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="presentation"
    >
      <div
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="text-2xl font-bold mb-4">
          タスクを編集
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="edit-title"
                className="block text-sm font-medium mb-1"
              >
                タイトル
              </label>
              <input
                id="edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00]"
                maxLength={100}
                aria-label="タイトル"
              />
            </div>
            <div>
              <label
                htmlFor="edit-description"
                className="block text-sm font-medium mb-1"
              >
                説明（Markdown）
              </label>
              <textarea
                id="edit-description"
                value={description ?? ''}
                onChange={(e) => setDescription(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00] h-32"
                aria-label="説明（Markdown）"
              />
            </div>
            <div>
              <label
                htmlFor="edit-priority"
                className="block text-sm font-medium mb-1"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00]"
                aria-label="優先度"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          {/* エラーメッセージ表示 */}
          {error && (
            <div
              className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg"
              role="alert"
              aria-live="polite"
            >
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              className="flex-1 px-6 py-2 bg-[#710000] text-white rounded-lg hover:bg-[#5a0000] disabled:opacity-50"
              disabled={updateTask.isPending}
              aria-label="保存"
            >
              保存
            </button>
            <button
              type="button"
              onClick={props.onClose}
              className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
