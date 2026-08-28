import type { ViewerAccessTokenEntity } from './ViewerAccessTokenEntity';

/**
 * 閲覧者アクセストークンリポジトリインターフェース
 *
 * email単位のアクセストークン集約の永続化契約を定義する。
 * Domain層で定義し、Infrastructure層で実装される。
 */
export interface IViewerAccessTokenRepository {
  /**
   * emailでトークンを取得する
   * @param email - 正規化済みメールアドレス
   * @returns 見つかったViewerAccessTokenEntity、存在しない場合はnull
   */
  findByEmail(email: string): Promise<ViewerAccessTokenEntity | null>;

  /**
   * tokenHashでトークンを取得する
   * @param tokenHash - トークンハッシュ値
   * @returns 見つかったViewerAccessTokenEntity、存在しない場合はnull
   */
  findByTokenHash(tokenHash: string): Promise<ViewerAccessTokenEntity | null>;

  /**
   * トークンを保存する（新規発行・再発行時の上書きの両方に使用）
   * @param entity - 保存するViewerAccessTokenEntity
   * @returns 保存されたViewerAccessTokenEntity
   */
  save(entity: ViewerAccessTokenEntity): Promise<ViewerAccessTokenEntity>;

  /**
   * トークンを削除する（メール送信失敗時の補償操作用）
   * @param id - 削除対象のトークンID
   */
  deleteById(id: string): Promise<void>;

  /**
   * 既存トークン行を新しいハッシュ・有効期限で置き換える（再発行・補償復元の両方に使用）
   * @param existingId - 置き換え対象のトークンID
   * @param newTokenHash - 新しいトークンハッシュ
   * @param newExpiresAt - 新しい有効期限
   * @returns 置き換え後のViewerAccessTokenEntity
   */
  replace(
    existingId: string,
    newTokenHash: string,
    newExpiresAt: Date,
  ): Promise<ViewerAccessTokenEntity>;
}
