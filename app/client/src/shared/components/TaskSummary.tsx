import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import {
  getTaskPriorityDisplay,
  getTaskStatusDisplay,
} from '../utils/taskDisplay';

interface TaskSummaryProps {
  /** タスクタイトル */
  title: string;
  /** タスクの説明（Markdown形式） */
  description: string | null;
  /** 優先度 */
  priority: string;
  /** ステータス */
  status: string;
}

/**
 * タスクのタイトル・説明・優先度・ステータスを表示するプレゼンテーションコンポーネント。
 * 作者向け・閲覧者向けのタスク一覧で共通利用する。
 */
function TaskSummary(props: TaskSummaryProps): React.ReactNode {
  const priorityDisplay = getTaskPriorityDisplay(props.priority);
  const statusDisplay = getTaskStatusDisplay(props.status);

  return (
    <div className="flex-1 min-w-0 w-full">
      <h3 className="text-base sm:text-lg font-semibold truncate">
        {props.title}
      </h3>

      {props.description && props.description.trim() !== '' && (
        <div
          className="text-gray-600 text-xs sm:text-sm mt-1 sm:mt-2"
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
            {props.description}
          </ReactMarkdown>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 sm:mt-3 flex-wrap">
        <span className={`text-xs sm:text-sm ${priorityDisplay.className}`}>
          {priorityDisplay.label}
        </span>

        <span
          className={`inline-block px-2 py-1 text-xs font-medium rounded ${statusDisplay.className}`}
        >
          {statusDisplay.label}
        </span>
      </div>
    </div>
  );
}

export default React.memo(TaskSummary);
