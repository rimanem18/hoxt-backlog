import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import { GetProjectByIdUseCase } from '../GetProjectByIdUseCase';

describe('GetProjectByIdUseCase', () => {
  type MockProjectRepository = {
    findById: ReturnType<typeof mock>;
  };

  let mockRepository: MockProjectRepository;
  let useCase: GetProjectByIdUseCase;
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const projectId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    // Given: モックリポジトリを初期化
    mockRepository = {
      findById: mock(() => Promise.resolve(null)),
    };
    useCase = new GetProjectByIdUseCase(
      mockRepository as unknown as IProjectRepository,
    );
  });

  describe('正常系', () => {
    test('自分のプロジェクト詳細が取得できる', async () => {
      // Given: リポジトリが自分のプロジェクトを返す
      const mockProject = { getId: () => projectId } as ProjectEntity;
      mockRepository.findById.mockResolvedValue(mockProject);

      // When: ユースケースを実行
      const result = await useCase.execute({ userId, projectId });

      // Then: 取得したプロジェクトが返る
      expect(result.getId()).toBe(projectId);
    });

    test('IProjectRepository.findById()にuserId・projectIdを渡して1回呼び出す', async () => {
      // Given: リポジトリが自分のプロジェクトを返す
      const mockProject = { getId: () => projectId } as ProjectEntity;
      mockRepository.findById.mockResolvedValue(mockProject);

      // When: ユースケースを実行
      await useCase.execute({ userId, projectId });

      // Then: findByIdがuserId・projectIdを引数に1回呼び出される
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockRepository.findById).toHaveBeenCalledWith(userId, projectId);
    });
  });

  describe('異常系', () => {
    test('他ユーザーのプロジェクト指定時にProjectNotFoundErrorが発生する', async () => {
      // Given: リポジトリがnullを返す（他ユーザーのプロジェクト）
      mockRepository.findById.mockResolvedValue(null);

      // When & Then: ProjectNotFoundErrorがスローされる
      await expect(useCase.execute({ userId, projectId })).rejects.toThrow(
        ProjectNotFoundError,
      );
    });

    test('存在しないプロジェクトID指定時にProjectNotFoundErrorが発生する', async () => {
      // Given: リポジトリがnullを返す（存在しないプロジェクト）
      mockRepository.findById.mockResolvedValue(null);

      // When & Then: ProjectNotFoundErrorがスローされる
      await expect(
        useCase.execute({ userId, projectId: 'non-existent-id' }),
      ).rejects.toThrow(ProjectNotFoundError);
    });
  });
});
