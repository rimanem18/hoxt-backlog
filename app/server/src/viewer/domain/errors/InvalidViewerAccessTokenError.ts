import { ViewerDomainError } from './ViewerDomainError';

/**
 * 不正ビューアアクセストークンエラー
 *
 * ビューアのアクセストークンが不正な場合にスローされる。
 * HTTPステータス401に対応。
 */
export class InvalidViewerAccessTokenError extends ViewerDomainError {
  readonly code = 'INVALID_VIEWER_ACCESS_TOKEN';
}
