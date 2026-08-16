import { ViewerDomainError } from './ViewerDomainError';

/**
 * ビューア不存在エラー
 *
 * 指定されたビューアIDでビューアが見つからない場合にスローされる。
 * HTTPステータス404に対応。
 */
export class ViewerNotFoundError extends ViewerDomainError {
  readonly code = 'VIEWER_NOT_FOUND';

  /**
   * ビューア不存在エラーを初期化する
   * @param viewerId - 見つからなかったビューアID
   */
  constructor(viewerId: string) {
    super(`招待が見つかりません: ${viewerId}`);
  }

  /**
   * ビューアIDによる不存在エラーを作成する
   * @param viewerId - 見つからなかったビューアID
   * @returns ViewerNotFoundErrorインスタンス
   */
  static forViewerId(viewerId: string): ViewerNotFoundError {
    return new ViewerNotFoundError(viewerId);
  }
}
