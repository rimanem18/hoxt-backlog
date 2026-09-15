import React from 'react';

interface TaskSectionHeaderProps {
  /** 見出しタイトル */
  title: string;
  /** タイトル右側に表示する操作（トグル等） */
  actions?: React.ReactNode;
  /** タイトル下に表示する補足情報 */
  children?: React.ReactNode;
}

/**
 * タスク一覧セクションの見出し。
 * 作者向け・閲覧者向けのタスク一覧で共通利用する。
 */
function TaskSectionHeader(props: TaskSectionHeaderProps): React.ReactNode {
  return (
    <div className="p-4 sm:p-6 border-b border-gray-200">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{props.title}</h2>
        {props.actions}
      </div>
      {props.children}
    </div>
  );
}

export default React.memo(TaskSectionHeader);
