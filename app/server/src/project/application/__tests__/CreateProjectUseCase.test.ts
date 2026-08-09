import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import { CreateProjectUseCase } from '../CreateProjectUseCase';

describe('CreateProjectUseCase', () => {
  type MockProjectRepository = {
    save: ReturnType<typeof mock>;
  };

  let mockRepository: MockProjectRepository;
  let useCase: CreateProjectUseCase;

  beforeEach(() => {
    // Given: モックリポジトリを初期化
    mockRepository = {
      save: mock((project: ProjectEntity) => Promise.resolve(project)),
    };
    useCase = new CreateProjectUseCase(
      mockRepository as unknown as IProjectRepository,
    );
  });

  describe('正常系', () => {
    test('説明文なしでprojectが作成される', async () => {
      // Given: 名前のみの入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: '新規プロジェクト',
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: projectが正しく作成される
      expect(result.getId()).toBeDefined();
      expect(result.getUserId()).toBe(input.userId);
      expect(result.getName()).toBe('新規プロジェクト');
      expect(result.getDescription()).toBeNull();
    });

    test('説明文ありでprojectが作成される', async () => {
      // Given: 名前と説明文を指定した入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'リニューアルプロジェクト',
        description: 'サイトリニューアルのためのプロジェクト',
      };

      // When: ユースケースを実行
      const result = await useCase.execute(input);

      // Then: 指定した値でprojectが作成される
      expect(result.getName()).toBe('リニューアルプロジェクト');
      expect(result.getDescription()).toBe(
        'サイトリニューアルのためのプロジェクト',
      );
    });

    test('IProjectRepository.save()が呼び出される', async () => {
      // Given: 有効な入力
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'テストプロジェクト',
      };

      // When: ユースケースを実行
      await useCase.execute(input);

      // Then: リポジトリのsaveが1回呼び出される
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('異常系', () => {
    test('空文字列の名前でInvalidProjectDataErrorが発生する', async () => {
      // Given: 空文字列の名前
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: '',
      };

      // When & Then: エラーがスローされる
      await expect(useCase.execute(input)).rejects.toThrow();
    });

    test('空白のみの名前でInvalidProjectDataErrorが発生する', async () => {
      // Given: 空白のみの名前
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: '   ',
      };

      // When & Then: エラーがスローされる
      await expect(useCase.execute(input)).rejects.toThrow();
    });

    test('101文字の名前でInvalidProjectDataErrorが発生する', async () => {
      // Given: 101文字の名前
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'a'.repeat(101),
      };

      // When & Then: エラーがスローされる
      await expect(useCase.execute(input)).rejects.toThrow();
    });

    test('リポジトリエラーが正しく伝播する', async () => {
      // Given: リポジトリがエラーをスローする設定
      const repositoryError = new Error('Database connection failed');
      mockRepository.save = mock(() => Promise.reject(repositoryError));
      useCase = new CreateProjectUseCase(
        mockRepository as unknown as IProjectRepository,
      );

      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'テストプロジェクト',
      };

      // When & Then: リポジトリエラーがそのまま伝播する
      await expect(useCase.execute(input)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
