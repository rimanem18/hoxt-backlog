import type { ITaskChangeNotifier } from '@/task/application/ports/ITaskChangeNotifier';

/**
 * 未配線時のデフォルト実装
 *
 * 合成ルートでsetNotifier()が呼ばれるまでの間、taskドメインが
 * viewerドメインの実装なしに動作できるようにする。
 */
class NoopTaskChangeNotifier implements ITaskChangeNotifier {
  async notify(): Promise<void> {
    // 未配線状態では何もしない
  }
}

/**
 * taskドメインからviewerドメインへの通知実装を差し替え可能にするレジストリ
 *
 * taskドメインはITaskChangeNotifierポートのみを知り、実装（viewerドメイン）を
 * importしない。実体の配線は合成ルート（entrypoints/index.ts）でsetNotifier()を
 * 呼び出して行う。
 */
export class TaskChangeNotifierRegistry {
  private static notifierInstance: ITaskChangeNotifier =
    new NoopTaskChangeNotifier();

  /**
   * 通知実装を差し替える
   */
  static setNotifier(notifier: ITaskChangeNotifier): void {
    TaskChangeNotifierRegistry.notifierInstance = notifier;
  }

  /**
   * 現在配線されている通知実装を返す
   */
  static getNotifier(): ITaskChangeNotifier {
    return TaskChangeNotifierRegistry.notifierInstance;
  }

  /**
   * テスト用のインスタンスリセット機能
   *
   * テスト環境専用。テスト間の配線汚染を防ぐ
   */
  public static resetForTesting(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('resetForTesting is only available in test environment');
    }

    TaskChangeNotifierRegistry.notifierInstance = new NoopTaskChangeNotifier();
  }
}
