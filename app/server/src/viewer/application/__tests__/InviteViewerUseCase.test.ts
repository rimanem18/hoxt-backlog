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
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import { ViewerAccessTokenEntity } from '@/viewer/domain/ViewerAccessTokenEntity';
import { TokenHasher } from '@/viewer/infrastructure/TokenHasher';
import type { IInvitationMailGateway } from '../IInvitationMailGateway';
import { InviteViewerUseCase } from '../InviteViewerUseCase';
import type { IViewerInvitationUnitOfWork } from '../IViewerInvitationUnitOfWork';

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
    revoke: mock(() => Promise.resolve()),
    restore: mock(() => Promise.resolve()),
    findActiveByProject: mock(() => Promise.resolve([])),
    findById: mock(() => Promise.resolve(null)),
    findActiveByEmail: mock(() => Promise.resolve([])),
  };
  const viewerAccessTokenRepository: IViewerAccessTokenRepository = {
    findByEmail: mock(() => Promise.resolve(null)),
    findByTokenHash: mock(() => Promise.resolve(null)),
    save: mock((entity) => Promise.resolve(entity)),
    deleteById: mock(() => Promise.resolve()),
    replace: mock((_existingId, newTokenHash, newExpiresAt) =>
      Promise.resolve(
        ViewerAccessTokenEntity.reconstruct({
          id: _existingId,
          email: 'viewer@example.com',
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    ),
  };
  const projectRepository: IProjectRepository = {
    save: mock(() => Promise.reject(new Error('not used'))),
    findById: mock(() => Promise.resolve(createMockProject())),
    findByUserId: mock(() => Promise.resolve([])),
    update: mock(() => Promise.resolve(null)),
    findByIds: mock(() => Promise.resolve([])),
  };
  const userRepository: IUserRepository = {
    findByExternalId: mock(() => Promise.resolve(null)),
    findById: mock(() => Promise.resolve(createMockUser())),
    findByEmail: mock(() => Promise.resolve(null)),
    findByIds: mock(() => Promise.resolve([])),
    create: mock(() => Promise.reject(new Error('not used'))),
    update: mock(() => Promise.reject(new Error('not used'))),
    delete: mock(() => Promise.resolve()),
  };
  const mailGateway: IInvitationMailGateway = {
    send: mock(() => Promise.resolve()),
  };
  const unitOfWork: IViewerInvitationUnitOfWork = {
    execute: mock((fn) =>
      fn({ projectViewerRepository, viewerAccessTokenRepository }),
    ),
  };

  return {
    projectViewerRepository,
    viewerAccessTokenRepository,
    projectRepository,
    userRepository,
    mailGateway,
    unitOfWork,
  };
}

function createUseCase(deps: ReturnType<typeof createDeps>) {
  return new InviteViewerUseCase(
    deps.unitOfWork,
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

  test('トークン保存が失敗した場合、招待の補償削除は呼ばれずエラーがそのままスローされる', async () => {
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

    // Then: DBロールバックに委ねるため招待の補償削除は呼ばれず、メールも送信されない
    expect(deps.projectViewerRepository.deleteById).not.toHaveBeenCalled();
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

  test('別projectへの追加招待では有効トークンを持つメールアドレスに新しい招待のみ作成される', async () => {
    // Given: 招待は存在せず、既に有効なトークンを持つメールアドレス
    const deps = createDeps();
    const validToken = ViewerAccessTokenEntity.create({
      email: 'viewer@example.com',
      rawToken: 'existing-raw-token',
      tokenHash: 'existing-hash',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    (
      deps.viewerAccessTokenRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue(validToken);
    const useCase = createUseCase(deps);

    // When: 別projectへ招待を実行
    const result = await useCase.execute({
      userId: testUserId,
      projectId: testProjectId,
      email: 'viewer@example.com',
    });

    // Then: 新しい招待のみ作成され、トークンは維持されメールも送信されない
    expect(result.getStatus()).toBe('active');
    expect(deps.projectViewerRepository.save).toHaveBeenCalledTimes(1);
    expect(deps.viewerAccessTokenRepository.save).not.toHaveBeenCalled();
    expect(deps.viewerAccessTokenRepository.replace).not.toHaveBeenCalled();
    expect(deps.mailGateway.send).not.toHaveBeenCalled();
  });

  test('既にactive招待+有効トークンの組み合わせへの再招待は完全にno-opになる', async () => {
    // Given: 既にactive状態の招待と有効なトークンが存在する
    const deps = createDeps();
    const existingViewer = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: 'viewer@example.com',
    });
    const validToken = ViewerAccessTokenEntity.create({
      email: 'viewer@example.com',
      rawToken: 'existing-raw-token',
      tokenHash: 'existing-hash',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    (
      deps.projectViewerRepository.findByProjectAndEmail as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(existingViewer);
    (
      deps.viewerAccessTokenRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue(validToken);
    const useCase = createUseCase(deps);

    // When: 同じproject×emailへ再招待
    const result = await useCase.execute({
      userId: testUserId,
      projectId: testProjectId,
      email: 'viewer@example.com',
    });

    // Then: DB状態・メール送信のいずれも変化しない
    expect(result.getId()).toBe(existingViewer.getId());
    expect(deps.projectViewerRepository.save).not.toHaveBeenCalled();
    expect(deps.viewerAccessTokenRepository.save).not.toHaveBeenCalled();
    expect(deps.viewerAccessTokenRepository.replace).not.toHaveBeenCalled();
    expect(deps.mailGateway.send).not.toHaveBeenCalled();
  });

  test('招待済み(active)だがトークンが期限切れの場合、同一projectへの再招待で新トークンが発行されメールが再送信される', async () => {
    // Given: active状態の招待と期限切れトークンが存在する
    const deps = createDeps();
    const existingViewer = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: 'viewer@example.com',
    });
    const expiredToken = ViewerAccessTokenEntity.create({
      email: 'viewer@example.com',
      rawToken: 'expired-raw-token',
      tokenHash: 'expired-hash',
      expiresAt: new Date(Date.now() - 1000),
    });
    (
      deps.projectViewerRepository.findByProjectAndEmail as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(existingViewer);
    (
      deps.viewerAccessTokenRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue(expiredToken);
    const useCase = createUseCase(deps);

    // When: 同じproject×emailへ再招待
    const result = await useCase.execute({
      userId: testUserId,
      projectId: testProjectId,
      email: 'viewer@example.com',
    });

    // Then: 招待は変化せず、トークンのみreplaceで再発行されメールが送信される
    expect(result.getId()).toBe(existingViewer.getId());
    expect(deps.projectViewerRepository.save).not.toHaveBeenCalled();
    expect(deps.viewerAccessTokenRepository.save).not.toHaveBeenCalled();
    expect(deps.viewerAccessTokenRepository.replace).toHaveBeenCalledTimes(1);
    expect(deps.viewerAccessTokenRepository.replace).toHaveBeenCalledWith(
      expiredToken.getId(),
      expect.any(String),
      expect.any(Date),
    );
    expect(deps.mailGateway.send).toHaveBeenCalledTimes(1);
  });

  test('期限切れトークン再発行時にメール送信が失敗すると旧トークンの値へ復元される（補償）', async () => {
    // Given: active状態の招待と期限切れトークンが存在し、メール送信が失敗する
    const deps = createDeps();
    const existingViewer = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: 'viewer@example.com',
    });
    const expiredToken = ViewerAccessTokenEntity.create({
      email: 'viewer@example.com',
      rawToken: 'expired-raw-token',
      tokenHash: 'expired-hash-value',
      expiresAt: new Date(Date.now() - 1000),
    });
    (
      deps.projectViewerRepository.findByProjectAndEmail as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(existingViewer);
    (
      deps.viewerAccessTokenRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue(expiredToken);
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

    // Then: 招待は削除されず、トークンのみ旧値へreplaceで復元される
    expect(deps.projectViewerRepository.deleteById).not.toHaveBeenCalled();
    expect(deps.viewerAccessTokenRepository.deleteById).not.toHaveBeenCalled();
    expect(deps.viewerAccessTokenRepository.replace).toHaveBeenCalledTimes(2);
    expect(deps.viewerAccessTokenRepository.replace).toHaveBeenLastCalledWith(
      expiredToken.getId(),
      expiredToken.getTokenHash(),
      expiredToken.getExpiresAt(),
    );
  });

  test('取り消し済み招待+有効トークンへの再招待で招待が復元されメールは送信されない', async () => {
    // Given: revoked状態の招待と有効なトークンが存在する
    const deps = createDeps();
    const revokedViewer = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: 'viewer@example.com',
    });
    revokedViewer.revoke();
    const validToken = ViewerAccessTokenEntity.create({
      email: 'viewer@example.com',
      rawToken: 'existing-raw-token',
      tokenHash: 'existing-hash',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    (
      deps.projectViewerRepository.findByProjectAndEmail as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(revokedViewer);
    (
      deps.viewerAccessTokenRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue(validToken);
    const useCase = createUseCase(deps);

    // When: 同じproject×emailへ再招待
    const result = await useCase.execute({
      userId: testUserId,
      projectId: testProjectId,
      email: 'viewer@example.com',
    });

    // Then: 招待がactiveに復元され保存される。トークン・メールは変化しない
    expect(result.getStatus()).toBe('active');
    expect(deps.projectViewerRepository.save).toHaveBeenCalledTimes(1);
    const savedEntity = (
      deps.projectViewerRepository.save as ReturnType<typeof mock>
    ).mock.calls[0]?.[0] as ProjectViewerEntity;
    expect(savedEntity.getId()).toBe(revokedViewer.getId());
    expect(savedEntity.getStatus()).toBe('active');
    expect(deps.projectViewerRepository.restore).not.toHaveBeenCalled();
    expect(deps.viewerAccessTokenRepository.save).not.toHaveBeenCalled();
    expect(deps.viewerAccessTokenRepository.replace).not.toHaveBeenCalled();
    expect(deps.mailGateway.send).not.toHaveBeenCalled();
  });

  test('取り消し済み招待+期限切れトークンへの再招待で招待復元とトークン再発行の両方が行われメールが送信される（複合）', async () => {
    // Given: revoked状態の招待と期限切れトークンが存在する
    const deps = createDeps();
    const revokedViewer = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: 'viewer@example.com',
    });
    revokedViewer.revoke();
    const expiredToken = ViewerAccessTokenEntity.create({
      email: 'viewer@example.com',
      rawToken: 'expired-raw-token',
      tokenHash: 'expired-hash',
      expiresAt: new Date(Date.now() - 1000),
    });
    (
      deps.projectViewerRepository.findByProjectAndEmail as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(revokedViewer);
    (
      deps.viewerAccessTokenRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue(expiredToken);
    const useCase = createUseCase(deps);

    // When: 同じproject×emailへ再招待
    const result = await useCase.execute({
      userId: testUserId,
      projectId: testProjectId,
      email: 'viewer@example.com',
    });

    // Then: 招待が復元され、トークンも再発行されメールが送信される
    expect(result.getStatus()).toBe('active');
    expect(deps.projectViewerRepository.save).toHaveBeenCalledTimes(1);
    expect(deps.viewerAccessTokenRepository.replace).toHaveBeenCalledTimes(1);
    expect(deps.mailGateway.send).toHaveBeenCalledTimes(1);
  });

  test('取り消し済み招待の復元時にメール送信が失敗すると招待は再度revokedに戻りトークンも復元される（補償）', async () => {
    // Given: revoked状態の招待と期限切れトークンが存在し、メール送信が失敗する
    const deps = createDeps();
    const revokedViewer = ProjectViewerEntity.create({
      projectId: testProjectId,
      email: 'viewer@example.com',
    });
    revokedViewer.revoke();
    const expiredToken = ViewerAccessTokenEntity.create({
      email: 'viewer@example.com',
      rawToken: 'expired-raw-token',
      tokenHash: 'expired-hash-value',
      expiresAt: new Date(Date.now() - 1000),
    });
    (
      deps.projectViewerRepository.findByProjectAndEmail as ReturnType<
        typeof mock
      >
    ).mockResolvedValue(revokedViewer);
    (
      deps.viewerAccessTokenRepository.findByEmail as ReturnType<typeof mock>
    ).mockResolvedValue(expiredToken);
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

    // Then: 招待は再度revokedに戻され、削除はされない。トークンも旧値へ復元される
    expect(deps.projectViewerRepository.revoke).toHaveBeenCalledWith(
      revokedViewer.getId(),
    );
    expect(deps.projectViewerRepository.deleteById).not.toHaveBeenCalled();
    expect(deps.viewerAccessTokenRepository.replace).toHaveBeenLastCalledWith(
      expiredToken.getId(),
      expiredToken.getTokenHash(),
      expiredToken.getExpiresAt(),
    );
  });
});
