import { describe, expect, mock, test } from 'bun:test';
import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { ProjectEntity } from '@/project/domain/ProjectEntity';
import { ViewerNotFoundError } from '@/viewer/domain/errors';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import { RevokeViewerUseCase } from '../RevokeViewerUseCase';

const testUserId = '123e4567-e89b-12d3-a456-426614174000';
const testProjectId = '223e4567-e89b-12d3-a456-426614174001';
const otherProjectId = '323e4567-e89b-12d3-a456-426614174002';
const testViewerId = '423e4567-e89b-12d3-a456-426614174003';

function createMockProject(): ProjectEntity {
  return ProjectEntity.create({
    userId: testUserId,
    name: 'テストプロジェクト',
  });
}

function createDeps() {
  const projectRepository: IProjectRepository = {
    save: mock(() => Promise.reject(new Error('not used'))),
    findById: mock(() => Promise.resolve(createMockProject())),
    findByUserId: mock(() => Promise.resolve([])),
    update: mock(() => Promise.resolve(null)),
    findByIds: mock(() => Promise.resolve([])),
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
  };

  return { projectRepository, projectViewerRepository };
}

describe('RevokeViewerUseCase', () => {
  test('指定projectの招待のみが取り消される', async () => {
    // Given: active状態の招待
    const deps = createDeps();
    const viewer = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: 'viewer@example.com',
    });
    (
      deps.projectViewerRepository.findById as ReturnType<typeof mock>
    ).mockResolvedValue(viewer);
    const useCase = new RevokeViewerUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
    );

    // When: 取り消しを実行
    await useCase.execute({
      userId: testUserId,
      projectId: testProjectId,
      viewerId: viewer.getId(),
    });

    // Then: revoked状態で保存される
    expect(deps.projectViewerRepository.save).toHaveBeenCalledTimes(1);
    const savedEntity = (
      deps.projectViewerRepository.save as ReturnType<typeof mock>
    ).mock.calls[0]?.[0] as ProjectViewerEntity;
    expect(savedEntity.getStatus()).toBe('revoked');
  });

  test('存在しないviewerIdの場合ViewerNotFoundErrorになる', async () => {
    // Given: 該当する招待が存在しない
    const deps = createDeps();
    (
      deps.projectViewerRepository.findById as ReturnType<typeof mock>
    ).mockResolvedValue(null);
    const useCase = new RevokeViewerUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
    );

    // When & Then: ViewerNotFoundErrorになる
    await expect(
      useCase.execute({
        userId: testUserId,
        projectId: testProjectId,
        viewerId: testViewerId,
      }),
    ).rejects.toBeInstanceOf(ViewerNotFoundError);
  });

  test('既にrevoked状態のviewerを取り消そうとするとViewerNotFoundErrorになる', async () => {
    // Given: 既にrevoked状態の招待
    const deps = createDeps();
    const viewer = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: 'viewer@example.com',
    });
    viewer.revoke();
    (
      deps.projectViewerRepository.findById as ReturnType<typeof mock>
    ).mockResolvedValue(viewer);
    const useCase = new RevokeViewerUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
    );

    // When & Then: ViewerNotFoundErrorになる
    await expect(
      useCase.execute({
        userId: testUserId,
        projectId: testProjectId,
        viewerId: viewer.getId(),
      }),
    ).rejects.toBeInstanceOf(ViewerNotFoundError);
  });

  test('他プロジェクトのviewerIdを指定した場合ViewerNotFoundErrorになる', async () => {
    // Given: 別プロジェクトに属する招待
    const deps = createDeps();
    const viewer = ProjectViewerEntity.create({
      projectId: otherProjectId,
      email: 'viewer@example.com',
    });
    (
      deps.projectViewerRepository.findById as ReturnType<typeof mock>
    ).mockResolvedValue(viewer);
    const useCase = new RevokeViewerUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
    );

    // When & Then: ViewerNotFoundErrorになる
    await expect(
      useCase.execute({
        userId: testUserId,
        projectId: testProjectId,
        viewerId: viewer.getId(),
      }),
    ).rejects.toBeInstanceOf(ViewerNotFoundError);
  });

  test('他ユーザーのプロジェクトへの取り消しはProjectNotFoundErrorになる', async () => {
    // Given: 所有権のないプロジェクトID（findByIdがnullを返す）
    const deps = createDeps();
    (
      deps.projectRepository.findById as ReturnType<typeof mock>
    ).mockResolvedValue(null);
    const useCase = new RevokeViewerUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
    );

    // When & Then: ProjectNotFoundErrorになる
    await expect(
      useCase.execute({
        userId: testUserId,
        projectId: testProjectId,
        viewerId: testViewerId,
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
