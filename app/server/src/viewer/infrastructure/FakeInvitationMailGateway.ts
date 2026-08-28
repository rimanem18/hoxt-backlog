import type { IInvitationMailGateway } from '@/viewer/application/IInvitationMailGateway';
import { TestInvitationStore } from './TestInvitationStore';

/**
 * FakeInvitationMailGateway
 *
 * IInvitationMailGatewayのテスト用Fake実装。
 * 実際のメール送信は行わず、呼び出し内容を記録し、任意の失敗を注入できる。
 */
export class FakeInvitationMailGateway implements IInvitationMailGateway {
  private readonly calls: Array<{
    email: string;
    projectName: string;
    accessUrl: string;
  }> = [];

  private readonly failureQueue: Error[] = [];

  public async send(
    email: string,
    projectName: string,
    accessUrl: string,
  ): Promise<void> {
    this.calls.push({ email, projectName, accessUrl });

    const failure = this.failureQueue.shift();
    if (failure) {
      throw failure;
    }

    TestInvitationStore.getInstance().record({
      recipient: email,
      projectName,
      accessUrl,
      sentAt: new Date(),
    });
  }

  /**
   * これまでの呼び出し引数のコピーを取得する
   */
  public getCalls(): Array<{
    email: string;
    projectName: string;
    accessUrl: string;
  }> {
    return [...this.calls];
  }

  /**
   * 次回送信時にスローする失敗を1回分キューに追加する
   * @param error - スローするエラー
   */
  public queueFailure(error: Error): void {
    this.failureQueue.push(error);
  }
}
