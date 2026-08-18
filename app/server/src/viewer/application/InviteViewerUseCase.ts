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

// メール送信はコミット後に行うため、失敗時にトランザクション内の変更を
// 個別に取り消せるよう、トークンに対して行った操作を型で保持しておく。
type TokenCompensation =
  | { type: 'none' }
  | { type: 'deleteToken'; tokenId: string }
  | {
      type: 'restoreToken';
      tokenId: string;
      oldTokenHash: string;
      oldExpiresAt: Date;
    };

interface TransactionResult {
  savedViewer: ProjectViewerEntity;
  mailNeeded: boolean;
  rawToken: string | null;
  createdViewerId: string | null;
  tokenCompensation: TokenCompensation;
}

/**
 * プロジェクト閲覧者招待ユースケース
 *
 * 招待保存・アクセストークン発行はUnit of Work経由で単一のDBトランザクション
 * として実行し、招待メール送信はコミット後（トランザクション外）に行う。
 * 既存の招待・トークンの状態（no-op / 追加招待 / 期限切れ再発行）に応じて
 * トランザクション内での保存内容を分岐する。
 * メール送信失敗時は保存済みデータを補償操作で削除・復元する。
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

    const {
      savedViewer,
      mailNeeded,
      rawToken,
      createdViewerId,
      tokenCompensation,
    } = await this.unitOfWork.execute<TransactionResult>(async (repos) => {
      const now = new Date();
      const existingViewer =
        await repos.projectViewerRepository.findByProjectAndEmail(
          input.projectId,
          normalizedEmail,
        );
      const existingToken =
        await repos.viewerAccessTokenRepository.findByEmail(normalizedEmail);

      if (
        existingViewer !== null &&
        existingToken !== null &&
        !existingToken.isExpired(now)
      ) {
        return {
          savedViewer: existingViewer,
          mailNeeded: false,
          rawToken: null,
          createdViewerId: null,
          tokenCompensation: { type: 'none' },
        };
      }

      let savedViewer: ProjectViewerEntity;
      let createdViewerId: string | null = null;
      if (existingViewer === null) {
        const viewer = ProjectViewerEntity.create({
          projectId: input.projectId,
          email: normalizedEmail,
        });
        savedViewer = await repos.projectViewerRepository.save(viewer);
        createdViewerId = savedViewer.getId();
      } else {
        savedViewer = existingViewer;
      }

      let mailNeeded = false;
      let rawToken: string | null = null;
      let tokenCompensation: TokenCompensation = { type: 'none' };

      const needsTokenIssuance =
        existingToken === null || existingToken.isExpired(now);
      if (needsTokenIssuance) {
        const newRawToken = this.tokenHasher.generate();
        const tokenHash = this.tokenHasher.hash(newRawToken);
        const expiresAt = new Date(now.getTime() + VIEWER_TOKEN_TTL_MS);

        if (existingToken === null) {
          const accessToken = ViewerAccessTokenEntity.create({
            email: normalizedEmail,
            rawToken: newRawToken,
            tokenHash,
            expiresAt,
          });
          const savedAccessToken =
            await repos.viewerAccessTokenRepository.save(accessToken);
          tokenCompensation = {
            type: 'deleteToken',
            tokenId: savedAccessToken.getId(),
          };
        } else {
          await repos.viewerAccessTokenRepository.replace(
            existingToken.getId(),
            tokenHash,
            expiresAt,
          );
          tokenCompensation = {
            type: 'restoreToken',
            tokenId: existingToken.getId(),
            oldTokenHash: existingToken.getTokenHash(),
            oldExpiresAt: existingToken.getExpiresAt(),
          };
        }

        rawToken = newRawToken;
        mailNeeded = true;
      }

      return {
        savedViewer,
        mailNeeded,
        rawToken,
        createdViewerId,
        tokenCompensation,
      };
    });

    if (!mailNeeded) {
      return savedViewer;
    }

    const accessUrl = `${this.viewerAccessBaseUrl}/viewer/${rawToken}`;

    try {
      await this.mailGateway.send(
        normalizedEmail,
        project.getName(),
        accessUrl,
      );
    } catch (error) {
      await this.compensate(createdViewerId, tokenCompensation);
      const reason = error instanceof Error ? error.message : String(error);
      throw new InvitationMailDeliveryError(
        `招待メールの送信に失敗しました: ${reason}`,
      );
    }

    return savedViewer;
  }

  /**
   * メール送信失敗時に保存済みの招待・トークンを削除・復元する補償操作。
   * 操作ごとに独立したトランザクションとして実行し、
   * 一方の失敗が他方の実行を妨げないようにする。
   * 補償操作自体の失敗は握りつぶし、呼び出し元でInvitationMailDeliveryErrorを
   * 一貫してスローできるようにする。
   */
  private async compensate(
    createdViewerId: string | null,
    tokenCompensation: TokenCompensation,
  ): Promise<void> {
    if (createdViewerId !== null) {
      try {
        await this.unitOfWork.execute((repos) =>
          repos.projectViewerRepository.deleteById(createdViewerId),
        );
      } catch (error) {
        console.error('招待の補償削除に失敗しました', error);
      }
    }

    if (tokenCompensation.type === 'deleteToken') {
      try {
        await this.unitOfWork.execute((repos) =>
          repos.viewerAccessTokenRepository.deleteById(
            tokenCompensation.tokenId,
          ),
        );
      } catch (error) {
        console.error('アクセストークンの補償削除に失敗しました', error);
      }
    } else if (tokenCompensation.type === 'restoreToken') {
      try {
        await this.unitOfWork.execute((repos) =>
          repos.viewerAccessTokenRepository.replace(
            tokenCompensation.tokenId,
            tokenCompensation.oldTokenHash,
            tokenCompensation.oldExpiresAt,
          ),
        );
      } catch (error) {
        console.error('アクセストークンの補償復元に失敗しました', error);
      }
    }
  }
}
