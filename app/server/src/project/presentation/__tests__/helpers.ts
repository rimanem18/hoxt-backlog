import { mock } from 'bun:test';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';

/**
 * テスト用モックUseCaseセット
 */
export interface MockUseCases {
  createProjectUseCase: {
    execute: ReturnType<typeof mock>;
  };
  getProjectsUseCase: {
    execute: ReturnType<typeof mock>;
  };
  getProjectByIdUseCase: {
    execute: ReturnType<typeof mock>;
  };
  updateProjectUseCase: {
    execute: ReturnType<typeof mock>;
  };
}

/**
 * UseCaseのモックを生成
 */
export function mockUseCases(): MockUseCases {
  return {
    createProjectUseCase: {
      execute: mock(),
    },
    getProjectsUseCase: {
      execute: mock(),
    },
    getProjectByIdUseCase: {
      execute: mock(),
    },
    updateProjectUseCase: {
      execute: mock(),
    },
  };
}

/**
 * テスト用ProjectEntityモックを生成
 */
export function createMockProjectEntity(overrides?: {
  id?: string;
  userId?: string;
  name?: string;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): ProjectEntity {
  const defaultValues = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'テストプロジェクト',
    description: 'テスト説明',
    createdAt: new Date('2025-12-01T10:00:00.000Z'),
    updatedAt: new Date('2025-12-01T10:00:00.000Z'),
  };

  const values = { ...defaultValues, ...overrides };

  return {
    getId: () => values.id,
    getUserId: () => values.userId,
    getName: () => values.name,
    getDescription: () => values.description,
    getCreatedAt: () => values.createdAt,
    getUpdatedAt: () => values.updatedAt,
  } as ProjectEntity;
}
