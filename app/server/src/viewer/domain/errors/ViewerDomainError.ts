/**
 * ビューアドメイン基底エラークラス
 *
 * ビューアドメイン固有の例外状態を表現する基底クラス。
 * アプリケーション層でのエラーハンドリングを容易にする。
 */
export abstract class ViewerDomainError extends Error {
  /** エラーコード */
  abstract readonly code: string;

  /**
   * ビューアドメインエラーを初期化する
   * @param message - エラーメッセージ
   */
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // スタックトレースを正確に設定
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
