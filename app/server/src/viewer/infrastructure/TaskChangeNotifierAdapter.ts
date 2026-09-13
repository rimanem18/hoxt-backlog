import type {
  ITaskChangeNotifier,
  TaskChangeEvent,
} from '@/task/application/ports/ITaskChangeNotifier';
import type { IDispatchTaskEventNotificationsUseCase } from '@/viewer/application/IDispatchTaskEventNotificationsUseCase';

/**
 * taskドメインのITaskChangeNotifierポートに対するviewerドメイン側実装
 *
 * taskドメインから受け取ったイベントをDispatchTaskEventNotificationsUseCase
 * へそのまま委譲する薄いアダプター。
 */
export class TaskChangeNotifierAdapter implements ITaskChangeNotifier {
  constructor(
    private readonly dispatchUseCase: IDispatchTaskEventNotificationsUseCase,
  ) {}

  async notify(event: TaskChangeEvent): Promise<void> {
    await this.dispatchUseCase.execute(event);
  }
}
