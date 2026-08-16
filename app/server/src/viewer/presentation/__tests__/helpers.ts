import { type Mock, mock } from 'bun:test';
import type { IInviteViewerUseCase } from '@/viewer/application/IInviteViewerUseCase';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';

/**
 * テスト用モックUseCaseセット
 */
export interface MockUseCases {
  inviteViewerUseCase: {
    execute: Mock<IInviteViewerUseCase['execute']>;
  };
}

/**
 * UseCaseのモックを生成
 */
export function mockUseCases(): MockUseCases {
  return {
    inviteViewerUseCase: {
      execute: mock(),
    },
  };
}

/**
 * テスト用ProjectViewerEntityを生成
 */
export function createMockProjectViewerEntity(overrides?: {
  projectId?: string;
  email?: string;
}): ProjectViewerEntity {
  return ProjectViewerEntity.create({
    projectId: overrides?.projectId ?? '223e4567-e89b-12d3-a456-426614174001',
    email: overrides?.email ?? 'viewer@example.com',
  });
}
