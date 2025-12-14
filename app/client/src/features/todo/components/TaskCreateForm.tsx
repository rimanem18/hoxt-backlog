'use client';

import React, { useCallback, useState } from 'react';
import { useTaskServices } from '../lib/TaskServicesContext';

/**
 * タスク作成フォームコンポーネント
 *
 * ユーザーがタスクのタイトルと優先度を入力してタスクを作成するためのインライン入力フォーム。
 * クライアント側バリデーション（空文字エラー表示、100文字制限）とエラーメッセージ表示機能を提供する。
 *
 * @example
 * ```tsx
 * <TaskServicesProvider>
 *   <TaskCreateForm />
 * </TaskServicesProvider>
 * ```
 */
function TaskCreateForm(): React.ReactNode {
  const services = useTaskServices();
  const { createTask } = services.useTaskMutations();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [error, setError] = useState('');
  const [hasRetry, setHasRetry] = useState(false);

  // タスク作成のロジックを集約したヘルパー関数
  const mutateTask = useCallback(
    (input: { title: string; priority: 'high' | 'medium' | 'low' }) => {
      createTask.mutate(input, {
        onSuccess: () => {
          setTitle('');
          setPriority('medium');
          setHasRetry(false);
          setError('');
        },
        onError: (err) => {
          setError(err.message);
          setHasRetry(true);
        },
      });
    },
    [createTask],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // エラークリア
    setError('');

    // クライアント側バリデーション：空文字チェック
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    // クライアント側バリデーション：文字数チェック（maxLengthで防止済みだが念のため）
    if (title.length > 100) {
      setError('タイトルは100文字以内で入力してください');
      return;
    }

    // API呼び出し（最新の入力値を使用）
    mutateTask({ title, priority });
  };

  // 再試行ハンドラ（常に最新の入力値を使用）
  const handleRetry = useCallback(() => {
    if (createTask.isPending) return;
    mutateTask({ title, priority });
  }, [title, priority, createTask.isPending, mutateTask]);

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タスクを入力..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00]"
          maxLength={100}
          aria-label="タスクのタイトル"
        />
        <select
          value={priority}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'high' || val === 'medium' || val === 'low') {
              setPriority(val);
            }
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00]"
          aria-label="優先度"
        >
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <button
          type="submit"
          className="px-6 py-2 bg-[#710000] text-white rounded-lg hover:bg-[#5a0000] disabled:opacity-50"
          disabled={!title.trim() || createTask.isPending}
          aria-label="追加"
        >
          追加
        </button>
      </form>

      {/* エラーメッセージ表示 */}
      {error && (
        <div
          className="mt-2 p-3 bg-red-100 text-red-700 rounded-lg flex items-center justify-between"
          role="alert"
          aria-live="polite"
        >
          <span>{error}</span>
          {hasRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={createTask.isPending}
              className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm disabled:opacity-50"
              aria-label="再試行"
              aria-disabled={createTask.isPending}
            >
              再試行
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(TaskCreateForm);
