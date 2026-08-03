'use client';

import React, { useCallback, useState } from 'react';
import { useProjectServices } from '@/features/project/lib/ProjectServicesContext';
import { useTaskServices } from '../lib/TaskServicesContext';

export interface TaskCreateFormProps {
  /** 指定時はプロジェクト選択を省略し、このprojectIdでタスクを作成する */
  fixedProjectId?: string;
}

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
function TaskCreateForm(props: TaskCreateFormProps = {}): React.ReactNode {
  const services = useTaskServices();
  const { createTask } = services.useTaskMutations();
  const { useProjects } = useProjectServices();
  // fixedProjectId指定時はproject選択セレクトを表示しないため、一覧取得は不要
  const { data: projects } = useProjects({ enabled: !props.fixedProjectId });

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState('');
  const [hasRetry, setHasRetry] = useState(false);

  // fixedProjectId指定時はプロジェクト選択を省略するため、送信対象のprojectIdを一本化する
  const effectiveProjectId = props.fixedProjectId ?? projectId;

  // タスク作成のロジックを集約したヘルパー関数
  const mutateTask = useCallback(
    (input: {
      title: string;
      priority: 'high' | 'medium' | 'low';
      projectId: string;
    }) => {
      createTask.mutate(input, {
        onSuccess: () => {
          // 同じprojectへの連続追加が多いため、projectIdは維持する
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

    // クライアント側バリデーション：project未選択チェック
    if (!effectiveProjectId) {
      setError('プロジェクトを選択してください');
      return;
    }

    // API呼び出し（最新の入力値を使用）
    mutateTask({ title, priority, projectId: effectiveProjectId });
  };

  // 再試行ハンドラ（常に最新の入力値を使用）
  const handleRetry = useCallback(() => {
    if (createTask.isPending || !effectiveProjectId) return;
    mutateTask({ title, priority, projectId: effectiveProjectId });
  }, [title, priority, effectiveProjectId, createTask.isPending, mutateTask]);

  return (
    <div className="mb-4 sm:mb-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:gap-2 sm:flex-row"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タスクを入力..."
          className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          maxLength={100}
          aria-label="タスクのタイトル"
        />
        {!props.fixedProjectId && (
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="プロジェクト"
          >
            <option value="">プロジェクトを選択</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={priority}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'high' || val === 'medium' || val === 'low') {
              setPriority(val);
            }
          }}
          className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="優先度"
        >
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <button
          type="submit"
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-opacity-80 disabled:opacity-50 transition-colors whitespace-nowrap"
          disabled={!title.trim() || createTask.isPending}
          aria-label="追加"
        >
          追加
        </button>
      </form>

      {/* エラーメッセージ表示 */}
      {error && (
        <div
          className="mt-2 sm:mt-3 p-3 bg-red-100 text-red-700 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
          role="alert"
          aria-live="polite"
        >
          <span className="text-sm">{error}</span>
          {hasRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={createTask.isPending}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs sm:text-sm disabled:opacity-50 transition-colors whitespace-nowrap"
              aria-label="再試行"
              aria-disabled={createTask.isPending}
            >
              再試行
            </button>
          )}
        </div>
      )}

      {/* プロジェクト作成画面への導線（projectが0件の場合） */}
      {!props.fixedProjectId && projects?.length === 0 && (
        <a
          href="/dashboard/projects"
          className="mt-2 sm:mt-3 p-3 text-sm text-center bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors block"
        >
          プロジェクトを作成する
        </a>
      )}
    </div>
  );
}

export default React.memo(TaskCreateForm);
