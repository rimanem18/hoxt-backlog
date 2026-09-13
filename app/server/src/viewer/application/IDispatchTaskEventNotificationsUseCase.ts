import type { TaskChangeEvent } from '@/task/application/ports/ITaskChangeNotifier';

/**
 * task変更イベント配信ユースケースインターフェース
 */
export interface IDispatchTaskEventNotificationsUseCase {
  execute(event: TaskChangeEvent): Promise<void>;
}
