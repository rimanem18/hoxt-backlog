import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import { ViewerDIContainer } from '@/viewer/infrastructure/ViewerDIContainer';

/**
 * ViewerDIContainerへの解決を実際のリクエスト処理時まで遅延させる
 * IViewerAccessTokenRepositoryプロキシを生成する
 *
 * Why: モジュールのimport時点でDIコンテナがDB接続を要求すると、
 * ファイルをimportするだけでサーバー全体の起動が失敗してしまう。
 * リクエストが実際に来るまでDI解決を遅延させるため、viewerトークン認証を
 * 使う各ルートファイル（notificationRoutes.ts, viewerAccessRoutes.ts）で共有する。
 */
export function createLazyViewerAccessTokenRepository(): IViewerAccessTokenRepository {
  return {
    findByEmail: (email) =>
      ViewerDIContainer.getViewerAccessTokenRepository().findByEmail(email),
    findByTokenHash: (tokenHash) =>
      ViewerDIContainer.getViewerAccessTokenRepository().findByTokenHash(
        tokenHash,
      ),
    save: (entity) =>
      ViewerDIContainer.getViewerAccessTokenRepository().save(entity),
    deleteById: (id) =>
      ViewerDIContainer.getViewerAccessTokenRepository().deleteById(id),
    replace: (existingId, newTokenHash, newExpiresAt) =>
      ViewerDIContainer.getViewerAccessTokenRepository().replace(
        existingId,
        newTokenHash,
        newExpiresAt,
      ),
  };
}
