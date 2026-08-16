import { describe, expect, mock, spyOn, test } from 'bun:test';
import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { ProjectEntity } from '@/project/domain/ProjectEntity';
import type { IUserRepository } from '@/user/domain/IUserRepository';
import type { User } from '@/user/domain/UserEntity';
import {
  InvalidViewerDataError,
  InvitationMailDeliveryError,
} from '@/viewer/domain/errors';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import { TokenHasher } from '@/viewer/infrastructure/TokenHasher';
import type { IInvitationMailGateway } from '../IInvitationMailGateway';
import { InviteViewerUseCase } from '../InviteViewerUseCase';

const testUserId = '123e4567-e89b-12d3-a456-426614174000';
const testProjectId = '223e4567-e89b-12d3-a456-426614174001';

function createMockUser(overrides?: Partial<User>): User {
  return {
    id: testUserId,
    externalId: 'google-oauth2|123456789',
    provider: 'google',
    email: 'owner@example.com',
    name: 'Owner User',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    ...overrides,
  };
}

function createMockProject(): ProjectEntity {
  return ProjectEntity.create({
    userId: testUserId,
    name: 'テストプロジェクト',
  });
}

function createDeps() {
  const projectViewerRepository: IProjectViewerRepository = {
    findByProjectAndEmail: mock(() => Promise.resolve(null)),
    save: mock((entity) => Promise.resolve(entity)),
    deleteById: mock(() => Promise.resolve()),
  };
  const viewerAccessTokenRepository: IViewerAccessTokenRepository = {
    findByEmail: mock(() => Promise.resolve(null)),
    save: mock((entity) => Promise.resolve(entity)),
    deleteById: mock(() => Promise.resolve()),
  };
  const projectRepository: IProjectRepository = {
    save: mock(() => Promise.reject(new Error('not used'))),
    findById: mock(() => Promise.resolve(createMockProject())),
    findByUserId: mock(() => Promise.resolve([])),
    update: mock(() => Promise.resolve(null)),
  };
  const userRepository: IUserRepository = {
    findByExternalId: mock(() => Promise.resolve(null)),
    findById: mock(() => Promise.resolve(createMockUser())),
    findByEmail: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.reject(new Error('not used'))),
    update: mock(() => Promise.reject(new Error('not used'))),
    delete: mock(() => Promise.resolve()),
  };
  const mailGateway: IInvitationMailGateway = {
    send: mock(() => Promise.resolve()),
  };

  return {
    projectViewerRepository,
    viewerAccessTokenRepository,
    projectRepository,
    userRepository,
    mailGateway,
  };
}

function createUseCase(deps: ReturnType<typeof createDeps>) {
  return new InviteViewerUseCase(
    deps.projectViewerRepository,
    deps.viewerAccessTokenRepository,
    deps.projectRepository,
    deps.userRepository,
    deps.mailGateway,
    new TokenHasher(),
    'https://viewer.example.com',
  );
}

describe('InviteViewerUseCase', () => {
  test('新規招待で招待・トークンが保存されメールが送信される', async () => {
    // Given: 招待もトークンも存在しない新規メールアドレス
    const deps = createDeps();
    const useCase = createUseCase(deps);

    // When: 招待を実行
    const result = await useCase.execute({
      userId: testUserId,
      projectId: testProjectId,
      email: 'Viewer@Example.com',
    });

    // Then: active状態の招待が返り、メールが送信される
    expect(result.getStatus()).toBe('active');
    expect(result.getEmail()).toBe('viewer@example.com');
    expect(deps.projectViewerRepository.save).toHaveBeenCalledTimes(1);
    expect(deps.viewerAccessTokenRepository.save).toHaveBeenCalledTimes(1);
    expect(deps.mailGateway.send).toHaveBeenCalledTimes(1);
    const [email, projectName, accessUrl] = (
      deps.mailGateway.send as ReturnType<typeof mock>
    ).mock.calls[0] as [string, string, string];
    expect(email).toBe('viewer@example.com');
    expect(projectName).toBe('テストプロジェクト');
    expect(accessUrl.startsWith('https://viewer.example.com/viewer/')).toBe(
      true,
    );
  });

  test('メールアドレスの形式が不正な場合InvalidViewerDataErrorになる', async () => {
    // Given: 不正な形式のメールアドレス
    const deps = createDeps();
    const useCase = createUseCase(deps);

    // When & Then: 招待がエラーになり、何も保存されない
    await expect(
      useCase.execute({
        userId: testUserId,
        projectId: testProjectId,
        email: 'not-an-email',
      }),
    ).rejects.toBeInstanceOf(InvalidViewerDataError);
    expect(deps.projectViewerRepository.save).not.toHaveBeenCalled();
  });

  test('自己招待の場合InvalidViewerDataErrorになる', async () => {
    // Given: 作成者自身のメールアドレスを招待先に指定
    const deps = createDeps();
    (deps.userRepository.findById as ReturnType<typeof mock>).mockResolvedValue(
      createMockUser({ email: 'owner@example.com' }),
    );
    const useCase = createUseCase(deps);

    // When & Then: 招待がエラーになり、何も保存されない
    await expect(
      useCase.execute({
        userId: testUserId,
        projectId: testProjectId,
        email: 'owner@example.com',
      }),
    ).rejects.toBeInstanceOf(InvalidViewerDataError);
    expect(deps.projectViewerRepository.save).not.toHaveBeenCalled();
  });

  test('他ユーザーのプロジェクトへの招待はProjectNotFoundErrorになる', async () => {
    // Given: 所有権のないプロジェクトID（findByIdがnullを返す）
    const deps = createDeps();
    (
      deps.projectRepository.findById as ReturnType<typeof mock>
    ).mockResolvedValue(null);
    const useCase = createUseCase(deps);

    // When & Then: 招待がProjectNotFoundErrorになる
    await expect(
      useCase.execute({
        userId: testUserId,
        projectId: testProjectId,
        email: 'viewer@example.com',
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(deps.projectViewerRepository.save).not.toHaveBeenCalled();
  });

  test('トークン保存が失敗した場合、保存済みの招待が補償削除され元のエラーがスローされる', async () => {
    // Given: トークン保存が失敗するモック
    const deps = createDeps();
    const tokenSaveError = new Error('DB接続エラー');
    (
      deps.viewerAccessTokenRepository.save as ReturnType<typeof mock>
    ).mockRejectedValue(tokenSaveError);
    const useCase = createUseCase(deps);

    // When & Then: 元のエラーがそのままスローされる
    await expect(
      useCase.execute({
        userId: testUserId,
        projectId: testProjectId,
        email: 'viewer@example.com',
      }),
    ).rejects.toBe(tokenSaveError);

    // Then: 保存済みの招待が補償削除され、メールは送信されない
    expect(deps.projectViewerRepository.deleteById).toHaveBeenCalledTimes(1);
    expect(deps.mailGateway.send).not.toHaveBeenCalled();
  });

  test('メール送信失敗時に招待・トークンが補償操作で削除されInvitationMailDeliveryErrorになる', async () => {
    // Given: メール送信が失敗するモック
    const deps = createDeps();
    (deps.mailGateway.send as ReturnType<typeof mock>).mockRejectedValue(
      new Error('SES送信エラー'),
    );
    const useCase = createUseCase(deps);

    // When & Then: 招待がInvitationMailDeliveryErrorになる
    await expect(
      useCase.execute({
        userId: testUserId,
        projectId: testProjectId,
        email: 'viewer@example.com',
      }),
    ).rejects.toBeInstanceOf(InvitationMailDeliveryError);

    // Then: 保存した招待・トークンが補償操作で削除される
    expect(deps.projectViewerRepository.deleteById).toHaveBeenCalledTimes(1);
    expect(deps.viewerAccessTokenRepository.deleteById).toHaveBeenCalledTimes(
      1,
    );
  });

  test('補償操作自体が失敗した場合もInvitationMailDeliveryErrorになりエラーログが出力される', async () => {
    // Given: メール送信と補償操作の両方が失敗するモック
    const deps = createDeps();
    (deps.mailGateway.send as ReturnType<typeof mock>).mockRejectedValue(
      new Error('SES送信エラー'),
    );
    (
      deps.projectViewerRepository.deleteById as ReturnType<typeof mock>
    ).mockRejectedValue(new Error('DB接続エラー'));
    const consoleErrorSpy = spyOn(console, 'error').mockImplementation(
      () => undefined,
    );
    const useCase = createUseCase(deps);

    // When & Then: 補償操作の失敗を握りつぶし、招待自体はInvitationMailDeliveryErrorになる
    await expect(
      useCase.execute({
        userId: testUserId,
        projectId: testProjectId,
        email: 'viewer@example.com',
      }),
    ).rejects.toBeInstanceOf(InvitationMailDeliveryError);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
