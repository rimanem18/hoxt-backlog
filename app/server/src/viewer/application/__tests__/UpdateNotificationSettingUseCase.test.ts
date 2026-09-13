import { describe, expect, mock, test } from 'bun:test';
import { ViewerNotFoundError } from '@/viewer/domain/errors';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import { UpdateNotificationSettingUseCase } from '../UpdateNotificationSettingUseCase';

const testProjectId = '223e4567-e89b-12d3-a456-426614174001';
const otherProjectId = '323e4567-e89b-12d3-a456-426614174002';
const testEmail = 'viewer@example.com';

function createDeps() {
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

  return { projectViewerRepository };
}

describe('UpdateNotificationSettingUseCase', () => {
  test('active招待の通知をONからOFFに変更できる', async () => {
    // Given: 通知ONの招待が存在する
    const deps = createDeps();
    const target = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: testEmail,
    });
    const updated = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: testEmail,
    });
    updated.disableNotification();
    (
      deps.projectViewerRepository.findActiveByProjectAndEmail as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(target);
    (
      deps.projectViewerRepository.updateNotificationEnabled as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(updated);
    const useCase = new UpdateNotificationSettingUseCase(
      deps.projectViewerRepository,
    );

    // When: 通知をOFFに変更
    const result = await useCase.execute({
      viewerEmail: testEmail,
      projectId: testProjectId,
      enabled: false,
    });

    // Then: 更新後のエンティティが返り、対象IDでの更新が呼ばれる
    expect(result.isNotificationEnabled()).toBe(false);
    expect(
      deps.projectViewerRepository.updateNotificationEnabled,
    ).toHaveBeenCalledWith(target.getId(), false);
  });

  test('active招待の通知をOFFからONに変更できる', async () => {
    // Given: 通知OFFの招待が存在する
    const deps = createDeps();
    const target = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: testEmail,
    });
    target.disableNotification();
    const updated = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: testEmail,
    });
    (
      deps.projectViewerRepository.findActiveByProjectAndEmail as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(target);
    (
      deps.projectViewerRepository.updateNotificationEnabled as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(updated);
    const useCase = new UpdateNotificationSettingUseCase(
      deps.projectViewerRepository,
    );

    // When: 通知をONに変更
    const result = await useCase.execute({
      viewerEmail: testEmail,
      projectId: testProjectId,
      enabled: true,
    });

    // Then: 更新後のエンティティが返り、対象IDでの更新が呼ばれる
    expect(result.isNotificationEnabled()).toBe(true);
    expect(
      deps.projectViewerRepository.updateNotificationEnabled,
    ).toHaveBeenCalledWith(target.getId(), true);
  });

  test('active招待が存在しない場合ViewerNotFoundErrorになる（fail-closed）', async () => {
    // Given: active招待が存在しない
    const deps = createDeps();
    const useCase = new UpdateNotificationSettingUseCase(
      deps.projectViewerRepository,
    );

    // When & Then: ViewerNotFoundErrorになる
    await expect(
      useCase.execute({
        viewerEmail: testEmail,
        projectId: testProjectId,
        enabled: false,
      }),
    ).rejects.toBeInstanceOf(ViewerNotFoundError);
    expect(
      deps.projectViewerRepository.updateNotificationEnabled,
    ).not.toHaveBeenCalled();
  });

  test('更新対象が更新直前に削除された場合ViewerNotFoundErrorになる（fail-closed）', async () => {
    // Given: active招待の検索直後にレコードが削除され、更新が0件ヒットした
    const deps = createDeps();
    const target = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: testEmail,
    });
    (
      deps.projectViewerRepository.findActiveByProjectAndEmail as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(target);
    (
      deps.projectViewerRepository.updateNotificationEnabled as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(null);
    const useCase = new UpdateNotificationSettingUseCase(
      deps.projectViewerRepository,
    );

    // When & Then: nullを握りつぶさずViewerNotFoundErrorになる
    await expect(
      useCase.execute({
        viewerEmail: testEmail,
        projectId: testProjectId,
        enabled: false,
      }),
    ).rejects.toBeInstanceOf(ViewerNotFoundError);
  });

  test('対象project以外の通知設定は変更されない', async () => {
    // Given: 対象projectのactive招待のみが存在する
    const deps = createDeps();
    const target = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: testEmail,
    });
    const updated = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: testEmail,
    });
    updated.disableNotification();
    (
      deps.projectViewerRepository.findActiveByProjectAndEmail as ReturnType<
        typeof mock
      >
    ).mockImplementation((projectId: string) =>
      Promise.resolve(projectId === testProjectId ? target : null),
    );
    (
      deps.projectViewerRepository.updateNotificationEnabled as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(updated);
    const useCase = new UpdateNotificationSettingUseCase(
      deps.projectViewerRepository,
    );

    // When: 対象projectの通知をOFFに変更
    await useCase.execute({
      viewerEmail: testEmail,
      projectId: testProjectId,
      enabled: false,
    });

    // Then: findActiveByProjectAndEmailは対象projectIdのみで呼ばれる
    expect(
      deps.projectViewerRepository.findActiveByProjectAndEmail,
    ).toHaveBeenCalledWith(testProjectId, testEmail);
    expect(
      deps.projectViewerRepository.findActiveByProjectAndEmail,
    ).not.toHaveBeenCalledWith(otherProjectId, testEmail);
  });
});
