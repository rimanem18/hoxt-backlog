'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { resetFilters } from '../store/taskSlice';
import TaskFilter from './TaskFilter';
import TaskSort from './TaskSort';

interface TaskFilterPanelProps {
  projectId: string;
}

/**
 * project単位でタスクの絞り込み・並び替えUIをまとめるコンポーネント
 *
 * taskSliceのフィルタ・ソート状態はprojectに紐付かないグローバルな
 * Reduxステートのため、projectIdが変わるたびに初期状態へリセットし、
 * 別プロジェクトへ条件が引き継がれないようにする。
 *
 * @example
 * ```tsx
 * <TaskFilterPanel projectId={projectId} />
 * ```
 */
function TaskFilterPanel(props: TaskFilterPanelProps): React.ReactNode {
  const dispatch = useAppDispatch();

  // biome-ignore lint/correctness/useExhaustiveDependencies: projectIdはeffect内で参照しないが、変更検知のためdeps配列に含める
  useEffect(() => {
    dispatch(resetFilters());
  }, [dispatch, props.projectId]);

  return (
    <>
      <TaskFilter />
      <TaskSort />
    </>
  );
}

export default TaskFilterPanel;
