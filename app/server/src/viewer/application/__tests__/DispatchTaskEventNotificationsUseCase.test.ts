import { describe, expect, mock, test } from 'bun:test';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { ProjectEntity } from '@/project/domain/ProjectEntity';
import type { TaskChangeEvent } from '@/task/application/ports/ITaskChangeNotifier';
import type {
  IPushNotificationGateway,
  PushSendResult,
} from '@/viewer/application/IPushNotificationGateway';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import type { IPushSubscriptionRepository } from '@/viewer/domain/IPushSubscriptionRepository';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';
import { DispatchTaskEventNotificationsUseCase } from '../DispatchTaskEventNotificationsUseCase';

const projectId = '223e4567-e89b-12d3-a456-426614174001';
const ownerUserId = '323e4567-e89b-12d3-a456-426614174002';

const testEvent: TaskChangeEvent = {
  type: 'task_added',
  taskId: '423e4567-e89b-12d3-a456-426614174003',
  taskTitle: 'テストタスク',
  projectId,
};

function createProject(): ProjectEntity {
  return ProjectEntity.create({
    userId: ownerUserId,
    name: 'テストプロジェクト',
  });
}

function createViewer(email: string, enabled = true): ProjectViewerEntity {
  const viewer = ProjectViewerEntity.create({ projectId, email });
  if (!enabled) {
    viewer.disableNotification();
  }
  return viewer;
}

function createSubscription(email: string, endpoint: string) {
  return PushSubscriptionEntity.create({
    email,
    endpoint,
    p256dhKey: 'p256dh-key',
    authKey: 'auth-key',
  });
}

function createDeps() {
  const projectRepository: IProjectRepository = {
    save: mock(() => Promise.reject(new Error('not implemented'))),
    findById: mock(() => Promise.resolve(null)),
    findByUserId: mock(() => Promise.resolve([])),
    findByIds: mock(() => Promise.resolve([createProject()])),
    update: mock(() => Promise.resolve(null)),
  };
  const projectViewerRepository: IProjectViewerRepository = {
    findByProjectAndEmail: mock(() => Promise.resolve(null)),
    save: mock((entity) => Promise.resolve(entity)),
    deleteById: mock(() => Promise.resolve()),
    revoke: mock(() => Promise.resolve()),
    restore: mock(() => Promise.resolve()),
    findActiveByProject: mock(() => Promise.resolve([])),
    findById: mock(() => Promise.resolve(null)),
    findActiveByEmail: mock(() => Promise.resolve([])),
    updateNotificationEnabled: mock(() => Promise.resolve(null)),
    findActiveByProjectAndEmail: mock(() => Promise.resolve(null)),
  };
  const pushSubscriptionRepository: IPushSubscriptionRepository = {
    findByEmail: mock(() => Promise.resolve([])),
    save: mock((entity) => Promise.resolve(entity)),
    deleteByEndpoint: mock(() => Promise.resolve()),
  };
  const pushNotificationGateway: IPushNotificationGateway = {
    send: mock(() => Promise.resolve({ outcome: 'sent' } as PushSendResult)),
  };

  return {
    projectRepository,
    projectViewerRepository,
    pushSubscriptionRepository,
    pushNotificationGateway,
  };
}

describe('DispatchTaskEventNotificationsUseCase', () => {
  test('通知ON・購読済みのviewerへtask_added通知が送信される', async () => {
    // Given: 通知ONのviewerが1件、購読が1件存在する
    const deps = createDeps();
    const viewer = createViewer('viewer@example.com');
    const subscription = createSubscription(
      'viewer@example.com',
      'https://push.example.com/endpoint-1',
    );
    (
      deps.projectViewerRepository.findActiveByProject as ReturnType<
        typeof mock
      >
    ).mockResolvedValue([viewer]);
    (
      deps.pushSubscriptionRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue([subscription]);
    const useCase = new DispatchTaskEventNotificationsUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
      deps.pushSubscriptionRepository,
      deps.pushNotificationGateway,
    );

    // When: task_addedイベントを配信
    await useCase.execute(testEvent);

    // Then: project名・task名を含む通知本文で送信される
    expect(deps.pushNotificationGateway.send).toHaveBeenCalledWith(
      subscription,
      {
        title: 'テストプロジェクト',
        body: '「テストタスク」が追加されました',
        taskId: testEvent.taskId,
      },
    );
  });

  test('招待取り消し済み（active以外）のviewerには送信されない（AC-04）', async () => {
    // Given: findActiveByProjectは元々activeのみを返す前提のため、
    // revoked分は0件として表現される
    const deps = createDeps();
    (
      deps.projectViewerRepository.findActiveByProject as ReturnType<
        typeof mock
      >
    ).mockResolvedValue([]);
    const useCase = new DispatchTaskEventNotificationsUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
      deps.pushSubscriptionRepository,
      deps.pushNotificationGateway,
    );

    // When: task_addedイベントを配信
    await useCase.execute(testEvent);

    // Then: 送信もfindByEmailも呼ばれない
    expect(deps.pushSubscriptionRepository.findByEmail).not.toHaveBeenCalled();
    expect(deps.pushNotificationGateway.send).not.toHaveBeenCalled();
  });

  test('購読が0件のviewerには何も送信されない（AC-05）', async () => {
    // Given: 通知ONのviewerが1件だが購読が0件
    const deps = createDeps();
    const viewer = createViewer('viewer@example.com');
    (
      deps.projectViewerRepository.findActiveByProject as ReturnType<
        typeof mock
      >
    ).mockResolvedValue([viewer]);
    (
      deps.pushSubscriptionRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue([]);
    const useCase = new DispatchTaskEventNotificationsUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
      deps.pushSubscriptionRepository,
      deps.pushNotificationGateway,
    );

    // When: task_addedイベントを配信
    await useCase.execute(testEvent);

    // Then: 送信は行われない
    expect(deps.pushNotificationGateway.send).not.toHaveBeenCalled();
  });

  test('通知OFFのviewerには送信されない（REQ-304）', async () => {
    // Given: 通知OFFのviewerのみが存在する
    const deps = createDeps();
    const viewer = createViewer('viewer@example.com', false);
    (
      deps.projectViewerRepository.findActiveByProject as ReturnType<
        typeof mock
      >
    ).mockResolvedValue([viewer]);
    const useCase = new DispatchTaskEventNotificationsUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
      deps.pushSubscriptionRepository,
      deps.pushNotificationGateway,
    );

    // When: task_addedイベントを配信
    await useCase.execute(testEvent);

    // Then: 通知OFFのviewerの購読は取得されず送信もされない
    expect(deps.pushSubscriptionRepository.findByEmail).not.toHaveBeenCalled();
    expect(deps.pushNotificationGateway.send).not.toHaveBeenCalled();
  });

  test('送信結果が410/404の場合のみ購読を削除する（REQ-302）', async () => {
    // Given: 2つの購読があり、片方は410、もう片方は500で失敗する
    const deps = createDeps();
    const viewer = createViewer('viewer@example.com');
    const goneSubscription = createSubscription(
      'viewer@example.com',
      'https://push.example.com/gone-endpoint',
    );
    const failedSubscription = createSubscription(
      'viewer@example.com',
      'https://push.example.com/failed-endpoint',
    );
    (
      deps.projectViewerRepository.findActiveByProject as ReturnType<
        typeof mock
      >
    ).mockResolvedValue([viewer]);
    (
      deps.pushSubscriptionRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue([goneSubscription, failedSubscription]);
    (
      deps.pushNotificationGateway.send as ReturnType<typeof mock>
    ).mockImplementation((subscription: PushSubscriptionEntity) =>
      Promise.resolve(
        subscription.getEndpoint() === goneSubscription.getEndpoint()
          ? { outcome: 'gone' }
          : { outcome: 'failed' },
      ),
    );
    const useCase = new DispatchTaskEventNotificationsUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
      deps.pushSubscriptionRepository,
      deps.pushNotificationGateway,
    );

    // When: task_addedイベントを配信
    await useCase.execute(testEvent);

    // Then: 410の購読のみ削除され、その他は削除されない
    expect(
      deps.pushSubscriptionRepository.deleteByEndpoint,
    ).toHaveBeenCalledTimes(1);
    expect(
      deps.pushSubscriptionRepository.deleteByEndpoint,
    ).toHaveBeenCalledWith(
      'viewer@example.com',
      goneSubscription.getEndpoint(),
    );
  });

  test('複数購読への送信は個別に扱われ1件の失敗が他に影響しない', async () => {
    // Given: 1件は例外をスローする購読、もう1件は成功する購読
    const deps = createDeps();
    const viewer = createViewer('viewer@example.com');
    const failingSubscription = createSubscription(
      'viewer@example.com',
      'https://push.example.com/failing-endpoint',
    );
    const succeedingSubscription = createSubscription(
      'viewer@example.com',
      'https://push.example.com/succeeding-endpoint',
    );
    (
      deps.projectViewerRepository.findActiveByProject as ReturnType<
        typeof mock
      >
    ).mockResolvedValue([viewer]);
    (
      deps.pushSubscriptionRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue([failingSubscription, succeedingSubscription]);
    (
      deps.pushNotificationGateway.send as ReturnType<typeof mock>
    ).mockImplementation((subscription: PushSubscriptionEntity) =>
      subscription.getEndpoint() === failingSubscription.getEndpoint()
        ? Promise.reject(new Error('予期しない失敗'))
        : Promise.resolve({ outcome: 'sent' }),
    );
    const useCase = new DispatchTaskEventNotificationsUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
      deps.pushSubscriptionRepository,
      deps.pushNotificationGateway,
    );

    // When & Then: 例外を投げずに完了し、成功した購読への送信は実施される
    await expect(useCase.execute(testEvent)).resolves.toBeUndefined();
    expect(deps.pushNotificationGateway.send).toHaveBeenCalledTimes(2);
  });
});
