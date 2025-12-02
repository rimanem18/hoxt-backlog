import { mock } from 'bun:test';
import type { ChangeTaskStatusUseCase } from '@/application/usecases/ChangeTaskStatusUseCase';
import type { CreateTaskUseCase } from '@/application/usecases/CreateTaskUseCase';
import type { DeleteTaskUseCase } from '@/application/usecases/DeleteTaskUseCase';
import type { GetTaskByIdUseCase } from '@/application/usecases/GetTaskByIdUseCase';
import type { GetTasksUseCase } from '@/application/usecases/GetTasksUseCase';
import type { UpdateTaskUseCase } from '@/application/usecases/UpdateTaskUseCase';
import type { TaskEntity } from '@/domain/task/TaskEntity';

/**
 * テスト用モックUseCaseセット
 */
export interface MockUseCases {
  createTaskUseCase: {
    execute: ReturnType<typeof mock>;
  };
  getTasksUseCase: {
    execute: ReturnType<typeof mock>;
  };
  getTaskByIdUseCase: {
    execute: ReturnType<typeof mock>;
  };
  updateTaskUseCase: {
    execute: ReturnType<typeof mock>;
  };
  deleteTaskUseCase: {
    execute: ReturnType<typeof mock>;
  };
  changeTaskStatusUseCase: {
    execute: ReturnType<typeof mock>;
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
  } as TaskEntity;
}
