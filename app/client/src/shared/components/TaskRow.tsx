import React from 'react';

interface TaskRowProps {
  /** trueの場合、ホバー時の背景色変化を付与する（操作可能な行向け） */
  interactive?: boolean;
  children: React.ReactNode;
}

/**
 * タスク1件分の行コンテナ。
 * 作者向け・閲覧者向けのタスク一覧で共通利用する。
 */
function TaskRow(props: TaskRowProps): React.ReactNode {
  const interactiveClassName = props.interactive
    ? ' hover:bg-gray-50 transition-colors'
    : '';

  return (
    <div
      className={`border-l-4 border-primary bg-white p-4 sm:p-5 md:p-6${interactiveClassName}`}
    >
      {props.children}
    </div>
  );
}

export default React.memo(TaskRow);
