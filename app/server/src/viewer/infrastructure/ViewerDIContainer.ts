import { ProjectDIContainer } from '@/project/infrastructure/ProjectDIContainer';
import {
  getViewerAccessBaseUrl,
  isTestEndpointsEnabled,
} from '@/shared/config/env';
import { db } from '@/shared/database/DatabaseConnection';
import { TaskDIContainer } from '@/task/infrastructure/TaskDIContainer';
import { AuthDIContainer } from '@/user/infrastructure/AuthDIContainer';
import { GetViewerAccessibleProjectsUseCase } from '@/viewer/application/GetViewerAccessibleProjectsUseCase';
import type { IGetViewerAccessibleProjectsUseCase } from '@/viewer/application/IGetViewerAccessibleProjectsUseCase';
import type { IInvitationMailGateway } from '@/viewer/application/IInvitationMailGateway';
import type { IInviteViewerUseCase } from '@/viewer/application/IInviteViewerUseCase';
import type { IListProjectViewersUseCase } from '@/viewer/application/IListProjectViewersUseCase';
import { InviteViewerUseCase } from '@/viewer/application/InviteViewerUseCase';
import type { IRegisterPushSubscriptionUseCase } from '@/viewer/application/IRegisterPushSubscriptionUseCase';
import type { IRevokeViewerUseCase } from '@/viewer/application/IRevokeViewerUseCase';
import type { IUpdateNotificationSettingUseCase } from '@/viewer/application/IUpdateNotificationSettingUseCase';
import type { IViewerInvitationUnitOfWork } from '@/viewer/application/IViewerInvitationUnitOfWork';
import { ListProjectViewersUseCase } from '@/viewer/application/ListProjectViewersUseCase';
import { RegisterPushSubscriptionUseCase } from '@/viewer/application/RegisterPushSubscriptionUseCase';
import { RevokeViewerUseCase } from '@/viewer/application/RevokeViewerUseCase';
import { UpdateNotificationSettingUseCase } from '@/viewer/application/UpdateNotificationSettingUseCase';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import type { IPushSubscriptionRepository } from '@/viewer/domain/IPushSubscriptionRepository';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import { FakeInvitationMailGateway } from './FakeInvitationMailGateway';
import { PostgreSQLProjectViewerRepository } from './PostgreSQLProjectViewerRepository';
import { PostgreSQLPushSubscriptionRepository } from './PostgreSQLPushSubscriptionRepository';
import { PostgreSQLViewerAccessTokenRepository } from './PostgreSQLViewerAccessTokenRepository';
import { PostgreSQLViewerInvitationUnitOfWork } from './PostgreSQLViewerInvitationUnitOfWork';
import { SesInvitationMailGateway } from './SesInvitationMailGateway';
import { TokenHasher } from './TokenHasher';

/**
 * viewer招待・閲覧の依存性注入を管理するDIコンテナ
 *
 * シングルトンパターンでviewer関連のUseCaseとRepository/Gatewayを管理。
 * テスト専用エンドポイントが有効な環境（isTestEndpointsEnabled）ではFake実装、
 * それ以外では実際のSES実装をメール送信ゲートウェイとして選択する。
 */
export class ViewerDIContainer {
  private static inviteViewerUseCaseInstance: InviteViewerUseCase | null = null;
  private static listProjectViewersUseCaseInstance: ListProjectViewersUseCase | null =
    null;
  private static revokeViewerUseCaseInstance: RevokeViewerUseCase | null = null;
  private static getViewerAccessibleProjectsUseCaseInstance: GetViewerAccessibleProjectsUseCase | null =
    null;
  private static updateNotificationSettingUseCaseInstance: UpdateNotificationSettingUseCase | null =
    null;
  private static registerPushSubscriptionUseCaseInstance: RegisterPushSubscriptionUseCase | null =
    null;
  private static projectViewerRepositoryInstance: PostgreSQLProjectViewerRepository | null =
    null;
  private static viewerAccessTokenRepositoryInstance: PostgreSQLViewerAccessTokenRepository | null =
    null;
  private static pushSubscriptionRepositoryInstance: PostgreSQLPushSubscriptionRepository | null =
    null;
  private static mailGatewayInstance: IInvitationMailGateway | null = null;
  private static tokenHasherInstance: TokenHasher | null = null;
  private static viewerInvitationUnitOfWorkInstance: PostgreSQLViewerInvitationUnitOfWork | null =
    null;

  /**
   * InviteViewerUseCaseのインスタンスを返す
   */
  static getInviteViewerUseCase(): IInviteViewerUseCase {
    if (!ViewerDIContainer.inviteViewerUseCaseInstance) {
      ViewerDIContainer.inviteViewerUseCaseInstance = new InviteViewerUseCase(
        ViewerDIContainer.getViewerInvitationUnitOfWork(),
        ProjectDIContainer.getProjectRepository(),
        AuthDIContainer.getUserRepository(),
        ViewerDIContainer.getMailGateway(),
        ViewerDIContainer.getTokenHasher(),
        getViewerAccessBaseUrl(),
      );
    }
    return ViewerDIContainer.inviteViewerUseCaseInstance;
  }

  /**
   * ListProjectViewersUseCaseのインスタンスを返す
   */
  static getListProjectViewersUseCase(): IListProjectViewersUseCase {
    if (!ViewerDIContainer.listProjectViewersUseCaseInstance) {
      ViewerDIContainer.listProjectViewersUseCaseInstance =
        new ListProjectViewersUseCase(
          ProjectDIContainer.getProjectRepository(),
          ViewerDIContainer.getProjectViewerRepository(),
        );
    }
    return ViewerDIContainer.listProjectViewersUseCaseInstance;
  }

  /**
   * RevokeViewerUseCaseのインスタンスを返す
   */
  static getRevokeViewerUseCase(): IRevokeViewerUseCase {
    if (!ViewerDIContainer.revokeViewerUseCaseInstance) {
      ViewerDIContainer.revokeViewerUseCaseInstance = new RevokeViewerUseCase(
        ProjectDIContainer.getProjectRepository(),
        ViewerDIContainer.getProjectViewerRepository(),
      );
    }
    return ViewerDIContainer.revokeViewerUseCaseInstance;
  }

  /**
   * GetViewerAccessibleProjectsUseCaseのインスタンスを返す
   */
  static getGetViewerAccessibleProjectsUseCase(): IGetViewerAccessibleProjectsUseCase {
    if (!ViewerDIContainer.getViewerAccessibleProjectsUseCaseInstance) {
      ViewerDIContainer.getViewerAccessibleProjectsUseCaseInstance =
        new GetViewerAccessibleProjectsUseCase(
          ViewerDIContainer.getProjectViewerRepository(),
          ProjectDIContainer.getProjectRepository(),
          TaskDIContainer.getTaskRepository(),
          AuthDIContainer.getUserRepository(),
        );
    }
    return ViewerDIContainer.getViewerAccessibleProjectsUseCaseInstance;
  }

  /**
   * UpdateNotificationSettingUseCaseのインスタンスを返す
   */
  static getUpdateNotificationSettingUseCase(): IUpdateNotificationSettingUseCase {
    if (!ViewerDIContainer.updateNotificationSettingUseCaseInstance) {
      ViewerDIContainer.updateNotificationSettingUseCaseInstance =
        new UpdateNotificationSettingUseCase(
          ViewerDIContainer.getProjectViewerRepository(),
        );
    }
    return ViewerDIContainer.updateNotificationSettingUseCaseInstance;
  }

  /**
   * RegisterPushSubscriptionUseCaseのインスタンスを返す
   */
  static getRegisterPushSubscriptionUseCase(): IRegisterPushSubscriptionUseCase {
    if (!ViewerDIContainer.registerPushSubscriptionUseCaseInstance) {
      ViewerDIContainer.registerPushSubscriptionUseCaseInstance =
        new RegisterPushSubscriptionUseCase(
          ViewerDIContainer.getPushSubscriptionRepository(),
        );
    }
    return ViewerDIContainer.registerPushSubscriptionUseCaseInstance;
  }

  /**
   * PostgreSQLViewerInvitationUnitOfWorkの共有インスタンスを返す
   */
  static getViewerInvitationUnitOfWork(): IViewerInvitationUnitOfWork {
    if (!ViewerDIContainer.viewerInvitationUnitOfWorkInstance) {
      ViewerDIContainer.viewerInvitationUnitOfWorkInstance =
        new PostgreSQLViewerInvitationUnitOfWork();
    }
    return ViewerDIContainer.viewerInvitationUnitOfWorkInstance;
  }

  /**
   * PostgreSQLProjectViewerRepositoryの共有インスタンスを返す
   */
  static getProjectViewerRepository(): IProjectViewerRepository {
    if (!ViewerDIContainer.projectViewerRepositoryInstance) {
      ViewerDIContainer.projectViewerRepositoryInstance =
        new PostgreSQLProjectViewerRepository(db);
    }
    return ViewerDIContainer.projectViewerRepositoryInstance;
  }

  /**
   * PostgreSQLViewerAccessTokenRepositoryの共有インスタンスを返す
   */
  static getViewerAccessTokenRepository(): IViewerAccessTokenRepository {
    if (!ViewerDIContainer.viewerAccessTokenRepositoryInstance) {
      ViewerDIContainer.viewerAccessTokenRepositoryInstance =
        new PostgreSQLViewerAccessTokenRepository(db);
    }
    return ViewerDIContainer.viewerAccessTokenRepositoryInstance;
  }

  /**
   * PostgreSQLPushSubscriptionRepositoryの共有インスタンスを返す
   */
  static getPushSubscriptionRepository(): IPushSubscriptionRepository {
    if (!ViewerDIContainer.pushSubscriptionRepositoryInstance) {
      ViewerDIContainer.pushSubscriptionRepositoryInstance =
        new PostgreSQLPushSubscriptionRepository(db);
    }
    return ViewerDIContainer.pushSubscriptionRepositoryInstance;
  }

  /**
   * 招待メール送信ゲートウェイの共有インスタンスを返す
   *
   * bun test実行時（NODE_ENV=test）とテスト専用エンドポイントが有効な環境
   * （ローカル・E2E）ではFake実装、それ以外（preview/production）では
   * 実際のSES実装を使用する。
   */
  static getMailGateway(): IInvitationMailGateway {
    if (!ViewerDIContainer.mailGatewayInstance) {
      ViewerDIContainer.mailGatewayInstance =
        process.env.NODE_ENV === 'test' || isTestEndpointsEnabled()
          ? new FakeInvitationMailGateway()
          : SesInvitationMailGateway.getInstance();
    }
    return ViewerDIContainer.mailGatewayInstance;
  }

  /**
   * TokenHasherの共有インスタンスを返す
   */
  static getTokenHasher(): TokenHasher {
    if (!ViewerDIContainer.tokenHasherInstance) {
      ViewerDIContainer.tokenHasherInstance = new TokenHasher();
    }
    return ViewerDIContainer.tokenHasherInstance;
  }

  /**
   * テスト用のインスタンスリセット機能
   *
   * テスト環境専用。テスト間のインスタンス汚染を防ぐ
   */
  public static resetForTesting(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('resetForTesting is only available in test environment');
    }

    ViewerDIContainer.inviteViewerUseCaseInstance = null;
    ViewerDIContainer.listProjectViewersUseCaseInstance = null;
    ViewerDIContainer.revokeViewerUseCaseInstance = null;
    ViewerDIContainer.getViewerAccessibleProjectsUseCaseInstance = null;
    ViewerDIContainer.updateNotificationSettingUseCaseInstance = null;
    ViewerDIContainer.registerPushSubscriptionUseCaseInstance = null;
    ViewerDIContainer.projectViewerRepositoryInstance = null;
    ViewerDIContainer.viewerAccessTokenRepositoryInstance = null;
    ViewerDIContainer.pushSubscriptionRepositoryInstance = null;
    ViewerDIContainer.mailGatewayInstance = null;
    ViewerDIContainer.tokenHasherInstance = null;
    ViewerDIContainer.viewerInvitationUnitOfWorkInstance = null;
  }
}
