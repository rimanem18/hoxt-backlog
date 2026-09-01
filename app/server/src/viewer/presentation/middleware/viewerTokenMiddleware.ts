/*
 * Viewerアクセストークン認証ミドルウェア
 * Viewer-Access-Tokenヘッダの検証とContextへのviewerEmail設定を提供する。
 */

import { createMiddleware } from 'hono/factory';
import { InvalidViewerAccessTokenError } from '@/viewer/domain/errors';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import type { TokenHasher } from '@/viewer/infrastructure/TokenHasher';

/*
 * viewerTokenMiddlewareオプション設定
 */
export interface ViewerTokenMiddlewareOptions {
  viewerAccessTokenRepository: IViewerAccessTokenRepository;
  tokenHasher: TokenHasher;
}

/*
 * Viewerアクセストークン認証ミドルウェア
 * @param options リポジトリ・ハッシュ化ユーティリティ
 * @returns Honoミドルウェア関数
 */
export const viewerTokenMiddleware = (
  options: ViewerTokenMiddlewareOptions,
) => {
  return createMiddleware(async (c, next) => {
    const rawToken = c.req.header('Viewer-Access-Token');

    if (!rawToken) {
      throw new InvalidViewerAccessTokenError(
        'Viewer-Access-Tokenヘッダが必要です',
      );
    }

    const tokenHash = options.tokenHasher.hash(rawToken);
    const token =
      await options.viewerAccessTokenRepository.findByTokenHash(tokenHash);

    if (!token) {
      throw new InvalidViewerAccessTokenError('無効なViewer-Access-Tokenです');
    }

    if (token.isExpired(new Date())) {
      throw new InvalidViewerAccessTokenError(
        'Viewer-Access-Tokenの有効期限が切れています',
      );
    }

    c.set('viewerEmail', token.getEmail());
    c.set('viewerTokenExpiresAt', token.getExpiresAt());

    await next();
  });
};
