import { ViewerDomainError } from './ViewerDomainError';

/**
 * 不正ビューアデータエラー
 *
 * ビューアのデータが不正な場合にスローされる。
 * HTTPステータス400に対応。
 */
export class InvalidViewerDataError extends ViewerDomainError {
  readonly code = 'INVALID_VIEWER_DATA';
}
