import { type Mock, mock } from 'bun:test';
import type { IChangeTaskStatusUseCase } from '@/task/application/IChangeTaskStatusUseCase';
import type { ICreateTaskUseCase } from '@/task/application/ICreateTaskUseCase';
import type { IDeleteTaskUseCase } from '@/task/application/IDeleteTaskUseCase';
import type { IGetTaskByIdUseCase } from '@/task/application/IGetTaskByIdUseCase';
import type { IGetTasksUseCase } from '@/task/application/IGetTasksUseCase';
import type { IUpdateTaskUseCase } from '@/task/application/IUpdateTaskUseCase';
import type { TaskEntity } from '@/task/domain/TaskEntity';

/**
 * テスト用モックUseCaseセット
 */
export interface MockUseCases {
  createTaskUseCase: {
    execute: Mock<ICreateTaskUseCase['execute']>;
  };
  getTasksUseCase: {
    execute: Mock<IGetTasksUseCase['execute']>;
  };
  getTaskByIdUseCase: {
    execute: Mock<IGetTaskByIdUseCase['execute']>;
  };
  updateTaskUseCase: {
    execute: Mock<IUpdateTaskUseCase['execute']>;
  };
  deleteTaskUseCase: {
    execute: Mock<IDeleteTaskUseCase['execute']>;
  };
  changeTaskStatusUseCase: {
    execute: Mock<IChangeTaskStatusUseCase['execute']>;
  };
}

/**
 * 6つのUseCaseのモックを生成
 */
export function mockUseCases(): MockUseCases {
  return {
    createTaskUseCase: {
      execute: mock(),
    },
    getTasksUseCase: {
      execute: mock(),
    },
    getTaskByIdUseCase: {
      execute: mock(),
    },
    updateTaskUseCase: {
      execute: mock(),
    },
    deleteTaskUseCase: {
      execute: mock(),
    },
    changeTaskStatusUseCase: {
      execute: mock(),
    },
  };
}

/**
 * テスト用TaskEntityモックを生成
 */
export function createMockTaskEntity(overrides?: {
  id?: string;
  userId?: string;
  title?: string;
  description?: string | null;
  priority?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  projectId?: string | null;
}): TaskEntity {
  const defaultValues = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '123e4567-e89b-12d3-a456-426614174000',
    title: 'テストタスク',
    description: 'テスト説明',
    priority: 'medium',
    status: 'not_started',
    createdAt: new Date('2025-12-01T10:00:00.000Z'),
    updatedAt: new Date('2025-12-01T10:00:00.000Z'),
    projectId: null as string | null,
  };

  const values = { ...defaultValues, ...overrides };

  return {
    getId: () => values.id,
    getUserId: () => values.userId,
    getTitle: () => values.title,
    getDescription: () => values.description,
    getPriority: () => values.priority,
    getStatus: () => values.status,
    getCreatedAt: () => values.createdAt,
    getUpdatedAt: () => values.updatedAt,
    getProjectId: () => values.projectId,
  } as TaskEntity;
}
