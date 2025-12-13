import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import type { Task, TaskStatus } from '@/packages/shared-schemas/src/tasks';

/**
 * TaskItemコンポーネント
 *
 * タスク一覧内の個別タスク表示を担当するプレゼンテーションコンポーネント。
 * タスク情報（タイトル、説明、優先度、ステータス）の表示と
 * 編集・削除・ステータス変更操作のコールバック呼び出しを提供。
 * ビジネスロジックは親コンポーネント（TaskList）が担当。
 */

interface TaskItemProps {
  /** 表示するタスク情報 */
  task: Task;
  /** 編集ボタンクリック時のコールバック */
  onEdit: (task: Task) => void;
  /** 削除ボタンクリック時のコールバック */
  onDelete: (id: string) => void;
  /** ステータス変更時のコールバック（型安全性を確保） */
  onStatusChange: (id: string, status: TaskStatus) => void;
}

/** 優先度に応じたテキストカラーとスタイルのマップ */
const priorityColorMap = {
  high: 'text-[#ff6a00] font-bold',
  medium: 'text-gray-700',
  low: 'text-gray-400',
} as const;

/** ステータスに応じたバッジスタイルのマップ */
const statusBadgeMap = {
  not_started: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-200 text-blue-700',
  in_review: 'bg-yellow-200 text-yellow-700',
  completed: 'bg-green-200 text-green-700',
} as const;

/** ステータス値から表示ラベルへの変換マップ */
const statusLabelMap = {
  not_started: '未着手',
  in_progress: '進行中',
  in_review: 'レビュー中',
  completed: '完了',
} as const;

function TaskItem(props: TaskItemProps): React.ReactNode {
  // 優先度色をメモ化（無駄な再計算を防止）
  const priorityColor = useMemo(
    () => priorityColorMap[props.task.priority] || 'text-gray-700',
    [props.task.priority],
  );

  // ステータスバッジスタイルをメモ化
  const statusBadge = useMemo(
    () => statusBadgeMap[props.task.status] || 'bg-gray-200 text-gray-700',
    [props.task.status],
  );

  /**
   * ステータス変更ハンドラ
   * 同じ値の場合は親コンポーネントへ通知しない（不要なAPI呼び出しを回避）
   */
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as TaskStatus;
    if (newStatus !== props.task.status) {
      props.onStatusChange(props.task.id, newStatus);
    }
  };

  return (
    <div className="border-l-4 border-[#710000] bg-white p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* タスクタイトル。長い場合は省略記号で表示 */}
          <h3 className="text-lg font-semibold truncate">{props.task.title}</h3>

          {/* Markdown形式の説明。null/空文字列時は非表示、2行制限で表示 */}
          {props.task.description && props.task.description.trim() !== '' && (
            <div
              className="text-gray-600 text-sm mt-1"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
              >
                {props.task.description}
              </ReactMarkdown>
            </div>
          )}

          {/* 優先度バッジとステータスバッジ */}
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-sm ${priorityColor}`}>
              {props.task.priority === 'high'
                ? '高'
                : props.task.priority === 'medium'
                  ? '中'
                  : '低'}
            </span>

            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded ${statusBadge}`}
            >
              {statusLabelMap[props.task.status]}
            </span>
          </div>
        </div>

        {/* ステータス変更、編集、削除の操作ボタン */}
        <div className="flex items-center gap-2">
          {/* ステータス選択ドロップダウン */}
          <select
            value={props.task.status}
            onChange={handleStatusChange}
            aria-label="ステータスを変更"
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff6a00]"
          >
            <option value="not_started">未着手</option>
            <option value="in_progress">進行中</option>
            <option value="in_review">レビュー中</option>
            <option value="completed">完了</option>
          </select>

          {/* 編集ボタン。ホバー時はアクセントカラー */}
          <button
            type="button"
            onClick={() => props.onEdit(props.task)}
            aria-label="タスクを編集"
            className="px-3 py-1 text-sm text-gray-700 hover:text-[#ff6a00] transition-colors"
          >
            編集
          </button>

          {/* 削除ボタン。ベースカラーの背景 */}
          <button
            type="button"
            onClick={() => props.onDelete(props.task.id)}
            aria-label="タスクを削除"
            className="px-3 py-1 text-sm text-white bg-[#710000] hover:bg-opacity-80 rounded transition-colors"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(TaskItem);
