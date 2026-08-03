import { type Mock, mock } from 'bun:test';
import type { ICreateProjectUseCase } from '@/project/application/ICreateProjectUseCase';
import type { IGetProjectByIdUseCase } from '@/project/application/IGetProjectByIdUseCase';
import type { IGetProjectsUseCase } from '@/project/application/IGetProjectsUseCase';
import type { IUpdateProjectUseCase } from '@/project/application/IUpdateProjectUseCase';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';

/**
 * テスト用モックUseCaseセット
 */
export interface MockUseCases {
  createProjectUseCase: {
    execute: Mock<ICreateProjectUseCase['execute']>;
  };
  getProjectsUseCase: {
    execute: Mock<IGetProjectsUseCase['execute']>;
  };
  getProjectByIdUseCase: {
    execute: Mock<IGetProjectByIdUseCase['execute']>;
  };
  updateProjectUseCase: {
    execute: Mock<IUpdateProjectUseCase['execute']>;
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
