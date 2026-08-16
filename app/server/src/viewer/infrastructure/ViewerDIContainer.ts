import { ProjectDIContainer } from '@/project/infrastructure/ProjectDIContainer';
import {
  getViewerAccessBaseUrl,
  isTestEndpointsEnabled,
} from '@/shared/config/env';
import { db } from '@/shared/database/DatabaseConnection';
import { AuthDIContainer } from '@/user/infrastructure/AuthDIContainer';
import type { IInvitationMailGateway } from '@/viewer/application/IInvitationMailGateway';
import type { IInviteViewerUseCase } from '@/viewer/application/IInviteViewerUseCase';
import { InviteViewerUseCase } from '@/viewer/application/InviteViewerUseCase';
import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import { FakeInvitationMailGateway } from './FakeInvitationMailGateway';
import { PostgreSQLProjectViewerRepository } from './PostgreSQLProjectViewerRepository';
import { PostgreSQLViewerAccessTokenRepository } from './PostgreSQLViewerAccessTokenRepository';
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
  private static projectViewerRepositoryInstance: PostgreSQLProjectViewerRepository | null =
    null;
  private static viewerAccessTokenRepositoryInstance: PostgreSQLViewerAccessTokenRepository | null =
    null;
  private static mailGatewayInstance: IInvitationMailGateway | null = null;
  private static tokenHasherInstance: TokenHasher | null = null;

  /**
   * InviteViewerUseCaseのインスタンスを返す
   */
  static getInviteViewerUseCase(): IInviteViewerUseCase {
    if (!ViewerDIContainer.inviteViewerUseCaseInstance) {
      ViewerDIContainer.inviteViewerUseCaseInstance = new InviteViewerUseCase(
        ViewerDIContainer.getProjectViewerRepository(),
        ViewerDIContainer.getViewerAccessTokenRepository(),
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
    ViewerDIContainer.projectViewerRepositoryInstance = null;
    ViewerDIContainer.viewerAccessTokenRepositoryInstance = null;
    ViewerDIContainer.mailGatewayInstance = null;
    ViewerDIContainer.tokenHasherInstance = null;
  }
}
