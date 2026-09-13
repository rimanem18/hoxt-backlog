import type { TaskPriorityValue } from '@/task/domain/valueobjects/TaskPriority';
import type { TaskStatusValue } from '@/task/domain/valueobjects/TaskStatus';

/**
 * task変更イベント
 *
 * newStatusはtype === 'status_changed'、newPriorityはtype === 'priority_changed'
 * のときのみ設定される。
 */
export interface TaskChangeEvent {
  type: 'task_added' | 'status_changed' | 'priority_changed';
  taskId: string;
  taskTitle: string;
  projectId: string;
  newStatus?: TaskStatusValue;
  newPriority?: TaskPriorityValue;
}

/**
 * task変更をviewerドメインへ通知するためのポート
 *
 * taskドメインはこのインタフェースのみを知り、実装（viewerドメイン）を
 * importしない。実体の配線は合成ルート（entrypoints/index.ts）で行う。
 */
export interface ITaskChangeNotifier {
  notify(event: TaskChangeEvent): Promise<void>;
}
