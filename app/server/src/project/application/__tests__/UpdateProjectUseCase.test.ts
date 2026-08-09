import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  InvalidProjectDataError,
  ProjectNotFoundError,
} from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { ProjectEntity } from '@/project/domain/ProjectEntity';
import { UpdateProjectUseCase } from '../UpdateProjectUseCase';

describe('UpdateProjectUseCase', () => {
  type MockProjectRepository = {
    findById: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };

  let mockRepository: MockProjectRepository;
  let useCase: UpdateProjectUseCase;
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const projectId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    // Given: 既存プロジェクトを返すモックリポジトリを初期化
    const existingProject = ProjectEntity.create({
      userId,
      name: '元の名前',
      description: '元の説明',
    });
    mockRepository = {
      findById: mock(() => Promise.resolve(existingProject)),
      update: mock(
        (_userId: string, _projectId: string, project: ProjectEntity) =>
          Promise.resolve(project),
      ),
    };
    useCase = new UpdateProjectUseCase(
      mockRepository as unknown as IProjectRepository,
    );
  });

  describe('正常系', () => {
    test('名称のみ更新できる', async () => {
      // When: 名前のみ更新
      const result = await useCase.execute({
        userId,
        projectId,
        name: '新しい名前',
      });

      // Then: 名前が更新され、説明文は元のまま
      expect(result.getName()).toBe('新しい名前');
      expect(result.getDescription()).toBe('元の説明');
    });

    test('説明文のみ更新できる', async () => {
      // When: 説明文のみ更新
      const result = await useCase.execute({
        userId,
        projectId,
        description: '新しい説明',
      });

      // Then: 説明文が更新され、名前は元のまま
      expect(result.getName()).toBe('元の名前');
      expect(result.getDescription()).toBe('新しい説明');
    });

    test('IProjectRepository.findById()にuserId・projectIdを渡して1回だけ呼び出す', async () => {
      // When: ユースケースを実行
      await useCase.execute({ userId, projectId, name: '新しい名前' });

      // Then: findByIdが1回のみ呼び出される（所有権検証はN+1にならない）
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockRepository.findById).toHaveBeenCalledWith(userId, projectId);
    });

    test('IProjectRepository.update()に検証済みEntityを渡して1回だけ呼び出す', async () => {
      // When: ユースケースを実行
      await useCase.execute({ userId, projectId, name: '新しい名前' });

      // Then: updateが1回のみ呼び出される
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      const [calledUserId, calledProjectId, calledProject] = mockRepository
        .update.mock.calls[0] as [string, string, ProjectEntity];
      expect(calledUserId).toBe(userId);
      expect(calledProjectId).toBe(projectId);
      expect(calledProject.getName()).toBe('新しい名前');
    });
  });

  describe('異常系', () => {
    test('空白のみの名前を指定するとInvalidProjectDataErrorが発生する', async () => {
      // When & Then: InvalidProjectDataErrorがスローされる
      await expect(
        useCase.execute({ userId, projectId, name: '   ' }),
      ).rejects.toThrow(InvalidProjectDataError);
    });

    test('101文字の名前を指定するとInvalidProjectDataErrorが発生する', async () => {
      // When & Then: InvalidProjectDataErrorがスローされる
      await expect(
        useCase.execute({ userId, projectId, name: 'a'.repeat(101) }),
      ).rejects.toThrow(InvalidProjectDataError);
    });

    test('他ユーザーのプロジェクト指定時にProjectNotFoundErrorが発生する', async () => {
      // Given: リポジトリがnullを返す（他ユーザーのプロジェクト）
      mockRepository.findById.mockResolvedValue(null);

      // When & Then: ProjectNotFoundErrorがスローされる
      await expect(
        useCase.execute({ userId, projectId, name: '新しい名前' }),
      ).rejects.toThrow(ProjectNotFoundError);
    });
  });
});
