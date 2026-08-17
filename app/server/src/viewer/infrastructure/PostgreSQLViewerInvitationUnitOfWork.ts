import { executeTransaction } from '@/shared/database/DatabaseConnection';
import type {
  IViewerInvitationUnitOfWork,
  ViewerInvitationRepositories,
} from '@/viewer/application/IViewerInvitationUnitOfWork';
import { PostgreSQLProjectViewerRepository } from './PostgreSQLProjectViewerRepository';
import { PostgreSQLViewerAccessTokenRepository } from './PostgreSQLViewerAccessTokenRepository';

/**
 * IViewerInvitationUnitOfWorkのPostgreSQL実装
 *
 * DBトランザクション内でトランザクションスコープのRepositoryを生成し、
 * 招待保存・トークン保存を単一トランザクションとして原子的に実行する。
 */
export class PostgreSQLViewerInvitationUnitOfWork
  implements IViewerInvitationUnitOfWork
{
  async execute<T>(
    fn: (repos: ViewerInvitationRepositories) => Promise<T>,
  ): Promise<T> {
    return executeTransaction<T>(async (tx) => {
      const repos: ViewerInvitationRepositories = {
        projectViewerRepository: new PostgreSQLProjectViewerRepository(tx),
        viewerAccessTokenRepository: new PostgreSQLViewerAccessTokenRepository(
          tx,
        ),
      };
      return fn(repos);
    });
  }
}
