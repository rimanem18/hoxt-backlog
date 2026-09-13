import {
  taskPriorityLabels,
  taskStatusLabels,
} from '@/packages/shared-schemas/src/tasks';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { TaskChangeEvent } from '@/task/application/ports/ITaskChangeNotifier';
import type {
  IPushNotificationGateway,
  PushNotificationPayload,
} from '@/viewer/application/IPushNotificationGateway';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import type { IPushSubscriptionRepository } from '@/viewer/domain/IPushSubscriptionRepository';
import type { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';
import type { IDispatchTaskEventNotificationsUseCase } from './IDispatchTaskEventNotificationsUseCase';

/**
 * task変更イベントを通知ONのviewerへWeb Push配信するユースケース
 *
 * active招待かつ通知ONのviewerのみを対象に、購読ごとに送信する。
 * 個別の送信結果は他の送信に影響させず、410/404相当（gone）の
 * 購読のみクリーンアップする。
 */
export class DispatchTaskEventNotificationsUseCase
  implements IDispatchTaskEventNotificationsUseCase
{
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly projectViewerRepository: IProjectViewerRepository,
    private readonly pushSubscriptionRepository: IPushSubscriptionRepository,
    private readonly pushNotificationGateway: IPushNotificationGateway,
  ) {}

  public async execute(event: TaskChangeEvent): Promise<void> {
    const [project] = await this.projectRepository.findByIds([event.projectId]);
    if (!project) {
      return;
    }

    const payload = this.buildPayload(event, project.getName());
    if (!payload) {
      return;
    }

    const viewers = (
      await this.projectViewerRepository.findActiveByProject(event.projectId)
    ).filter((viewer) => viewer.isNotificationEnabled());

    const sendTasks: Promise<void>[] = [];
    for (const viewer of viewers) {
      const subscriptions = await this.pushSubscriptionRepository.findByEmail(
        viewer.getEmail(),
      );
      for (const subscription of subscriptions) {
        sendTasks.push(
          this.sendAndCleanup(viewer.getEmail(), subscription, payload),
        );
      }
    }

    await Promise.allSettled(sendTasks);
  }

  private buildPayload(
    event: TaskChangeEvent,
    projectName: string,
  ): PushNotificationPayload | null {
    switch (event.type) {
      case 'task_added':
        return {
          title: projectName,
          body: `「${event.taskTitle}」が追加されました`,
          taskId: event.taskId,
        };
      case 'status_changed': {
        if (!event.newStatus) {
          return null;
        }
        const label = taskStatusLabels[event.newStatus];
        return {
          title: projectName,
          body: `「${event.taskTitle}」のステータスが${label}に変更されました`,
          taskId: event.taskId,
        };
      }
      case 'priority_changed': {
        if (!event.newPriority) {
          return null;
        }
        const label = taskPriorityLabels[event.newPriority];
        return {
          title: projectName,
          body: `「${event.taskTitle}」の優先度が${label}に変更されました`,
          taskId: event.taskId,
        };
      }
      default:
        return null;
    }
  }

  private async sendAndCleanup(
    viewerEmail: string,
    subscription: PushSubscriptionEntity,
    payload: PushNotificationPayload,
  ): Promise<void> {
    const result = await this.pushNotificationGateway.send(
      subscription,
      payload,
    );
    if (result.outcome === 'gone') {
      await this.pushSubscriptionRepository.deleteByEndpoint(
        viewerEmail,
        subscription.getEndpoint(),
      );
    }
  }
}
