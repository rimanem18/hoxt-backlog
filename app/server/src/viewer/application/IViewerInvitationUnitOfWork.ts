import type { IProjectViewerRepository } from '@/viewer/domain/IProjectViewerRepository';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';

/**
 * トランザクションスコープ内でviewer招待関連のRepositoryへアクセスするための集合
 */
export interface ViewerInvitationRepositories {
  projectViewerRepository: IProjectViewerRepository;
  viewerAccessTokenRepository: IViewerAccessTokenRepository;
}

/**
 * viewer招待の「招待保存＋トークン保存」を単一のDBトランザクションとして
 * 原子的に実行するためのUnit of Workインターフェース
 */
export interface IViewerInvitationUnitOfWork {
  /**
   * コールバックをDBトランザクション内で実行する。
   * コールバックが例外を投げた場合、トランザクション内の書き込みはすべてロールバックされる。
   * @param fn - トランザクションスコープのRepositoryを受け取るコールバック
   * @returns コールバックの実行結果
   */
  execute<T>(
    fn: (repos: ViewerInvitationRepositories) => Promise<T>,
  ): Promise<T>;
}
