import { describe, expect, mock, test } from 'bun:test';
import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { ProjectEntity } from '@/project/domain/ProjectEntity';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import { ListProjectViewersUseCase } from '../ListProjectViewersUseCase';

const testUserId = '123e4567-e89b-12d3-a456-426614174000';
const testProjectId = '223e4567-e89b-12d3-a456-426614174001';

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

describe('ListProjectViewersUseCase', () => {
  test('active招待をemail昇順で取得できる', async () => {
    // Given: 複数のactive招待
    const deps = createDeps();
    const viewers = [
      ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'a@example.com',
      }),
      ProjectViewerEntity.create({
        projectId: testProjectId,
        email: 'b@example.com',
      }),
    ];
    (
      deps.projectViewerRepository.findActiveByProject as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(viewers);
    const useCase = new ListProjectViewersUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
    );

    // When: 一覧を取得
    const result = await useCase.execute({
      userId: testUserId,
      projectId: testProjectId,
    });

    // Then: リポジトリの結果がそのまま返る
    expect(result).toBe(viewers);
    expect(
      deps.projectViewerRepository.findActiveByProject,
    ).toHaveBeenCalledWith(testProjectId);
  });

  test('viewerが0件の場合は空配列を返す（境界値）', async () => {
    // Given: viewerが1件も存在しないプロジェクト
    const deps = createDeps();
    const useCase = new ListProjectViewersUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
    );

    // When: 一覧を取得
    const result = await useCase.execute({
      userId: testUserId,
      projectId: testProjectId,
    });

    // Then: 空配列が返る
    expect(result).toEqual([]);
  });

  test('他ユーザーのプロジェクトへのアクセスはProjectNotFoundErrorになる', async () => {
    // Given: 所有権のないプロジェクトID（findByIdがnullを返す）
    const deps = createDeps();
    (
      deps.projectRepository.findById as ReturnType<typeof mock>
    ).mockResolvedValue(null);
    const useCase = new ListProjectViewersUseCase(
      deps.projectRepository,
      deps.projectViewerRepository,
    );

    // When & Then: ProjectNotFoundErrorになる
    await expect(
      useCase.execute({ userId: testUserId, projectId: testProjectId }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
