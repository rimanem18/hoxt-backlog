import { describe, expect, mock, test } from 'bun:test';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { ProjectEntity } from '@/project/domain/ProjectEntity';
import { ProjectName } from '@/project/domain/valueobjects/ProjectName';
import type { ITaskRepository } from '@/task/domain/ITaskRepository';
import { TaskEntity } from '@/task/domain/TaskEntity';
import { TaskPriority } from '@/task/domain/valueobjects/TaskPriority';
import { TaskStatus } from '@/task/domain/valueobjects/TaskStatus';
import { TaskTitle } from '@/task/domain/valueobjects/TaskTitle';
import type { IUserRepository } from '@/user/domain/IUserRepository';
import type { User } from '@/user/domain/UserEntity';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import { GetViewerAccessibleProjectsUseCase } from '../GetViewerAccessibleProjectsUseCase';

const viewerEmail = 'viewer@example.com';
const projectId1 = '123e4567-e89b-12d3-a456-426614174000';
const projectId2 = '223e4567-e89b-12d3-a456-426614174001';

function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'owner-user-id',
    externalId: 'google-oauth2|123456789',
    provider: 'google',
    email: 'owner@example.com',
    name: 'オーナー太郎',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    ...overrides,
  };
}

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
  };
  const projectRepository: IProjectRepository = {
    save: mock(() => Promise.reject(new Error('not used'))),
    findById: mock(() => Promise.resolve(null)),
    findByUserId: mock(() => Promise.resolve([])),
    update: mock(() => Promise.resolve(null)),
    findByIds: mock(() => Promise.resolve([])),
  };
  const taskRepository: ITaskRepository = {
    save: mock(() => Promise.reject(new Error('not used'))),
    findByUserId: mock(() => Promise.resolve([])),
    findById: mock(() => Promise.resolve(null)),
    update: mock(() => Promise.resolve(null)),
    delete: mock(() => Promise.resolve(false)),
    updateStatus: mock(() => Promise.resolve(null)),
    findByProjectIds: mock(() => Promise.resolve([])),
  };
  const userRepository: IUserRepository = {
    findByExternalId: mock(() => Promise.resolve(null)),
    findById: mock(() => Promise.resolve(null)),
    findByEmail: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.reject(new Error('not used'))),
    update: mock(() => Promise.reject(new Error('not used'))),
    delete: mock(() => Promise.resolve()),
  };

  return {
    projectViewerRepository,
    projectRepository,
    taskRepository,
    userRepository,
  };
}

function createProject(
  id: string,
  name: string,
  userId = 'owner-user-id',
): ProjectEntity {
  return ProjectEntity.reconstruct({
    id,
    userId,
    name: ProjectName.create(name),
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function createTask(projectId: string, title: string): TaskEntity {
  return TaskEntity.reconstruct({
    id: `task-${title}`,
    userId: 'owner-user-id',
    title: TaskTitle.create(title),
    description: 'desc',
    priority: TaskPriority.create('high'),
    status: TaskStatus.create('not_started'),
    createdAt: new Date(),
    updatedAt: new Date(),
    projectId,
  });
}

describe('GetViewerAccessibleProjectsUseCase', () => {
  test('active招待のあるproject群をtask込みでグルーピングして返す', async () => {
    // Given: 2つのprojectへactive招待があり、それぞれtaskが存在する
    const deps = createDeps();
    deps.projectViewerRepository.findActiveByEmail = mock(() =>
      Promise.resolve([projectId1, projectId2]),
    );
    deps.projectRepository.findByIds = mock(() =>
      Promise.resolve([
        createProject(projectId1, 'プロジェクト1'),
        createProject(projectId2, 'プロジェクト2'),
      ]),
    );
    deps.taskRepository.findByProjectIds = mock(() =>
      Promise.resolve([
        createTask(projectId1, 'タスク1'),
        createTask(projectId2, 'タスク2'),
      ]),
    );
    const useCase = new GetViewerAccessibleProjectsUseCase(
      deps.projectViewerRepository,
      deps.projectRepository,
      deps.taskRepository,
      deps.userRepository,
    );

    // When: viewerEmailで実行
    const result = await useCase.execute({ viewerEmail });

    // Then: projectごとにグルーピングされ、各taskの主要項目が含まれる
    expect(result).toHaveLength(2);
    const project1Result = result.find((p) => p.projectId === projectId1);
    expect(project1Result?.projectName).toBe('プロジェクト1');
    expect(project1Result?.tasks).toHaveLength(1);
    expect(project1Result?.tasks[0]).toMatchObject({
      title: 'タスク1',
      description: 'desc',
      status: 'not_started',
      priority: 'high',
    });
  });

  test('active招待が0件の場合はエラーにせず空配列を返す（空状態）', async () => {
    // Given: active招待が1件もないviewerEmail
    const deps = createDeps();
    deps.projectViewerRepository.findActiveByEmail = mock(() =>
      Promise.resolve([]),
    );
    const useCase = new GetViewerAccessibleProjectsUseCase(
      deps.projectViewerRepository,
      deps.projectRepository,
      deps.taskRepository,
      deps.userRepository,
    );

    // When: viewerEmailで実行
    const result = await useCase.execute({ viewerEmail });

    // Then: 空配列が返り、findByIds/findByProjectIdsは呼ばれない
    expect(result).toEqual([]);
    expect(deps.projectRepository.findByIds).not.toHaveBeenCalled();
    expect(deps.taskRepository.findByProjectIds).not.toHaveBeenCalled();
  });

  test('taskが存在しないprojectは空のtasks配列を持つ', async () => {
    // Given: active招待のあるprojectにtaskが1件もない
    const deps = createDeps();
    deps.projectViewerRepository.findActiveByEmail = mock(() =>
      Promise.resolve([projectId1]),
    );
    deps.projectRepository.findByIds = mock(() =>
      Promise.resolve([createProject(projectId1, 'プロジェクト1')]),
    );
    deps.taskRepository.findByProjectIds = mock(() => Promise.resolve([]));
    const useCase = new GetViewerAccessibleProjectsUseCase(
      deps.projectViewerRepository,
      deps.projectRepository,
      deps.taskRepository,
      deps.userRepository,
    );

    // When: viewerEmailで実行
    const result = await useCase.execute({ viewerEmail });

    // Then: projectは返るがtasksは空配列
    expect(result).toHaveLength(1);
    expect(result[0]?.tasks).toEqual([]);
  });

  test('projectごとにオーナーの表示名がownerNameへ入る', async () => {
    // Given: 異なるオーナーが所有する2つのprojectへactive招待がある
    const ownerUserId1 = 'owner-user-id';
    const ownerUserId2 = 'owner-user-id-2';
    const deps = createDeps();
    deps.projectViewerRepository.findActiveByEmail = mock(() =>
      Promise.resolve([projectId1, projectId2]),
    );
    deps.projectRepository.findByIds = mock(() =>
      Promise.resolve([
        createProject(projectId1, 'プロジェクト1', ownerUserId1),
        createProject(projectId2, 'プロジェクト2', ownerUserId2),
      ]),
    );
    deps.taskRepository.findByProjectIds = mock(() => Promise.resolve([]));
    deps.userRepository.findById = mock((id: string) =>
      Promise.resolve(
        id === ownerUserId1
          ? createMockUser({ id: ownerUserId1, name: '太郎' })
          : createMockUser({ id: ownerUserId2, name: '花子' }),
      ),
    );
    const useCase = new GetViewerAccessibleProjectsUseCase(
      deps.projectViewerRepository,
      deps.projectRepository,
      deps.taskRepository,
      deps.userRepository,
    );

    // When: viewerEmailで実行
    const result = await useCase.execute({ viewerEmail });

    // Then: projectごとに対応するオーナー名が入る
    const project1Result = result.find((p) => p.projectId === projectId1);
    const project2Result = result.find((p) => p.projectId === projectId2);
    expect(project1Result?.ownerName).toBe('太郎');
    expect(project2Result?.ownerName).toBe('花子');
  });

  test('オーナーユーザーが見つからない場合はownerNameがnullになる', async () => {
    // Given: オーナーのuserIdに対応するユーザーが存在しない
    const deps = createDeps();
    deps.projectViewerRepository.findActiveByEmail = mock(() =>
      Promise.resolve([projectId1]),
    );
    deps.projectRepository.findByIds = mock(() =>
      Promise.resolve([createProject(projectId1, 'プロジェクト1')]),
    );
    deps.taskRepository.findByProjectIds = mock(() => Promise.resolve([]));
    deps.userRepository.findById = mock(() => Promise.resolve(null));
    const useCase = new GetViewerAccessibleProjectsUseCase(
      deps.projectViewerRepository,
      deps.projectRepository,
      deps.taskRepository,
      deps.userRepository,
    );

    // When: viewerEmailで実行
    const result = await useCase.execute({ viewerEmail });

    // Then: 例外にならずownerNameがnullになる
    expect(result[0]?.ownerName).toBeNull();
  });
});
