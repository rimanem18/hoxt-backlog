import { afterEach, describe, expect, mock, test } from 'bun:test';
import type {
  ITaskChangeNotifier,
  TaskChangeEvent,
} from '@/task/application/ports/ITaskChangeNotifier';
import { TaskChangeNotifierRegistry } from '../TaskChangeNotifierRegistry';

const testEvent: TaskChangeEvent = {
  type: 'task_added',
  taskId: '123e4567-e89b-12d3-a456-426614174000',
  taskTitle: 'テストタスク',
  projectId: '223e4567-e89b-12d3-a456-426614174001',
};

describe('TaskChangeNotifierRegistry', () => {
  afterEach(() => {
    TaskChangeNotifierRegistry.resetForTesting();
  });

  test('未配線の状態ではNoop実装が例外を投げずPromiseを返す', async () => {
    // Given: setNotifier()を呼んでいない未配線の状態
    // When: デフォルトのNoop実装でnotify()を呼ぶ
    // Then: 例外を投げずに解決する
    await expect(
      TaskChangeNotifierRegistry.getNotifier().notify(testEvent),
    ).resolves.toBeUndefined();
  });

  test('setNotifier()後は差し替えた実装が呼ばれる', async () => {
    // Given: モック実装を注入する
    const notify = mock(() => Promise.resolve());
    const mockNotifier: ITaskChangeNotifier = { notify };
    TaskChangeNotifierRegistry.setNotifier(mockNotifier);

    // When: getNotifier()経由でnotify()を呼ぶ
    await TaskChangeNotifierRegistry.getNotifier().notify(testEvent);

    // Then: 注入した実装のnotify()がそのイベントで呼ばれる
    expect(notify).toHaveBeenCalledWith(testEvent);
  });

  test('resetForTesting()後は再びNoop実装に戻る', async () => {
    // Given: モック実装を注入した後にリセットする
    const notify = mock(() => Promise.resolve());
    TaskChangeNotifierRegistry.setNotifier({ notify });
    TaskChangeNotifierRegistry.resetForTesting();

    // When: notify()を呼ぶ
    await TaskChangeNotifierRegistry.getNotifier().notify(testEvent);

    // Then: 差し替えたモックは呼ばれない（Noopに戻っている）
    expect(notify).not.toHaveBeenCalled();
  });
});
