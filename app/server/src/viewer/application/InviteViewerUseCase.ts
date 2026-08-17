import { ProjectNotFoundError } from '@/project/domain/errors';
import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import { EmailAddress } from '@/shared/domain/valueobjects/EmailAddress';
import type { IUserRepository } from '@/user/domain/IUserRepository';
import { isValidEmail } from '@/user/domain/valueobjects/CreateUserInput';
import {
  InvalidViewerDataError,
  InvitationMailDeliveryError,
} from '@/viewer/domain/errors';
import { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';
import { ViewerAccessTokenEntity } from '@/viewer/domain/ViewerAccessTokenEntity';
import type { TokenHasher } from '@/viewer/infrastructure/TokenHasher';
import type { IInvitationMailGateway } from './IInvitationMailGateway';
import type {
  IInviteViewerUseCase,
  InviteViewerInput,
} from './IInviteViewerUseCase';
import type { IViewerInvitationUnitOfWork } from './IViewerInvitationUnitOfWork';

const VIEWER_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * プロジェクト閲覧者招待ユースケース
 *
 * 招待保存・アクセストークン発行はUnit of Work経由で単一のDBトランザクション
 * として実行し、招待メール送信はコミット後（トランザクション外）に行う。
 * メール送信失敗時は保存済みデータを補償操作で削除する。
 */
export class InviteViewerUseCase implements IInviteViewerUseCase {
  constructor(
    private readonly unitOfWork: IViewerInvitationUnitOfWork,
    private readonly projectRepository: IProjectRepository,
    private readonly userRepository: IUserRepository,
    private readonly mailGateway: IInvitationMailGateway,
    private readonly tokenHasher: TokenHasher,
    private readonly viewerAccessBaseUrl: string,
  ) {}

  public async execute(input: InviteViewerInput): Promise<ProjectViewerEntity> {
    if (!isValidEmail(input.email)) {
      throw new InvalidViewerDataError(
        'メールアドレスの形式が正しくありません',
      );
    }
    const normalizedEmail = EmailAddress.of(input.email).value;

    const project = await this.projectRepository.findById(
      input.userId,
      input.projectId,
    );
    if (!project) {
      throw ProjectNotFoundError.forProjectId(input.projectId);
    }

    const creator = await this.userRepository.findById(input.userId);
    if (creator && EmailAddress.of(creator.email).value === normalizedEmail) {
      throw new InvalidViewerDataError('自分自身を招待できません');
    }

    const viewer = ProjectViewerEntity.create({
      projectId: input.projectId,
      email: normalizedEmail,
    });

    const rawToken = this.tokenHasher.generate();
    const tokenHash = this.tokenHasher.hash(rawToken);
    const expiresAt = new Date(Date.now() + VIEWER_TOKEN_TTL_MS);
    const accessToken = ViewerAccessTokenEntity.create({
      email: normalizedEmail,
      rawToken,
      tokenHash,
      expiresAt,
    });

    // 招待保存とトークン保存を単一のDBトランザクションとして実行する。
    // 片方が失敗した場合、DBレベルで両方ロールバックされる。
    const { savedViewer, savedAccessToken } = await this.unitOfWork.execute(
      async (repos) => {
        const savedViewer = await repos.projectViewerRepository.save(viewer);
        const savedAccessToken =
          await repos.viewerAccessTokenRepository.save(accessToken);
        return { savedViewer, savedAccessToken };
      },
    );

    const accessUrl = `${this.viewerAccessBaseUrl}/viewer/${rawToken}`;

    try {
      await this.mailGateway.send(
        normalizedEmail,
        project.getName(),
        accessUrl,
      );
    } catch (error) {
      await this.compensate(savedViewer.getId(), savedAccessToken.getId());
      const reason = error instanceof Error ? error.message : String(error);
      throw new InvitationMailDeliveryError(
        `招待メールの送信に失敗しました: ${reason}`,
      );
    }

    return savedViewer;
  }

  /**
   * メール送信失敗時に保存済みの招待・トークンを削除する補償操作。
   * 削除ごとに独立したトランザクションとして実行し、
   * 一方の失敗が他方の削除試行を妨げないようにする。
   * 補償操作自体の失敗は握りつぶし、呼び出し元でInvitationMailDeliveryErrorを
   * 一貫してスローできるようにする。
   */
  private async compensate(
    viewerId: string,
    accessTokenId: string,
  ): Promise<void> {
    try {
      await this.unitOfWork.execute((repos) =>
        repos.projectViewerRepository.deleteById(viewerId),
      );
    } catch (error) {
      console.error('招待の補償削除に失敗しました', error);
    }

    try {
      await this.unitOfWork.execute((repos) =>
        repos.viewerAccessTokenRepository.deleteById(accessTokenId),
      );
    } catch (error) {
      console.error('アクセストークンの補償削除に失敗しました', error);
    }
  }
}
