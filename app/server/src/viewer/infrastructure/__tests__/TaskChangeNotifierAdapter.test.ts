import { describe, expect, mock, test } from 'bun:test';
import type { TaskChangeEvent } from '@/task/application/ports/ITaskChangeNotifier';
import type { IDispatchTaskEventNotificationsUseCase } from '@/viewer/application/IDispatchTaskEventNotificationsUseCase';
import { TaskChangeNotifierAdapter } from '../TaskChangeNotifierAdapter';

const testEvent: TaskChangeEvent = {
  type: 'task_added',
  taskId: '123e4567-e89b-12d3-a456-426614174000',
  taskTitle: 'テストタスク',
  projectId: '223e4567-e89b-12d3-a456-426614174001',
};

describe('TaskChangeNotifierAdapter', () => {
  test('notify()がDispatchTaskEventNotificationsUseCase.execute()へイベントをそのまま渡す', async () => {
    // Given: execute()をモック化したDispatchTaskEventNotificationsUseCase
    const execute = mock(() => Promise.resolve());
    const dispatchUseCase: IDispatchTaskEventNotificationsUseCase = {
      execute,
    };
    const adapter = new TaskChangeNotifierAdapter(dispatchUseCase);

    // When: notify()を呼ぶ
    await adapter.notify(testEvent);

    // Then: execute()がそのイベントで呼ばれる
    expect(execute).toHaveBeenCalledWith(testEvent);
  });
});
