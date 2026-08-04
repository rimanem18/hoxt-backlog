import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import { GetProjectsUseCase } from '../GetProjectsUseCase';

describe('GetProjectsUseCase', () => {
  type MockProjectRepository = {
    findByUserId: ReturnType<typeof mock>;
  };

  let mockRepository: MockProjectRepository;
  let useCase: GetProjectsUseCase;
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    // Given: モックリポジトリを初期化
    mockRepository = {
      findByUserId: mock(() => Promise.resolve([])),
    };
    useCase = new GetProjectsUseCase(
      mockRepository as unknown as IProjectRepository,
    );
  });

  describe('正常系', () => {
    test('ユーザーのプロジェクト一覧が取得できる', async () => {
      // Given: リポジトリが複数のプロジェクトを返す
      const mockProjects = [
        { getId: () => 'p1' } as ProjectEntity,
        { getId: () => 'p2' } as ProjectEntity,
      ];
      mockRepository.findByUserId.mockResolvedValue(mockProjects);

      // When: ユースケースを実行
      const result = await useCase.execute({ userId });

      // Then: リポジトリから返された配列がそのまま返る
      expect(result).toHaveLength(2);
    });

    test('プロジェクトが存在しない場合は空配列を返す', async () => {
      // Given: リポジトリが空配列を返す
      mockRepository.findByUserId.mockResolvedValue([]);

      // When: ユースケースを実行
      const result = await useCase.execute({ userId });

      // Then: 空配列が返る
      expect(result).toEqual([]);
    });

    test('IProjectRepository.findByUserId()にuserIdを渡して1回呼び出す', async () => {
      // When: ユースケースを実行
      await useCase.execute({ userId });

      // Then: findByUserIdがuserIdを引数に1回呼び出される
      expect(mockRepository.findByUserId).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
    });
  });
});
