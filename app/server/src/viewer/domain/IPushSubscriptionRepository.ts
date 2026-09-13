import type { PushSubscriptionEntity } from './PushSubscriptionEntity';

/**
 * viewer Web Push購読リポジトリインターフェース
 *
 * email×endpoint購読の永続化契約を定義する。
 * Domain層で定義し、Infrastructure層で実装される。
 */
export interface IPushSubscriptionRepository {
  /**
   * emailに紐づく購読一覧を取得する（複数デバイス許容）
   * @param email - 正規化済みメールアドレス
   * @returns PushSubscriptionEntity配列
   */
  findByEmail(email: string): Promise<PushSubscriptionEntity[]>;

  /**
   * 購読を保存する（email×endpoint重複時は鍵情報を上書き）
   * @param entity - 保存するPushSubscriptionEntity
   * @returns 保存されたPushSubscriptionEntity
   */
  save(entity: PushSubscriptionEntity): Promise<PushSubscriptionEntity>;

  /**
   * email×endpointで購読を削除する（送信失敗時のクリーンアップ用）
   * @param email - 正規化済みメールアドレス
   * @param endpoint - 削除対象のendpoint
   */
  deleteByEndpoint(email: string, endpoint: string): Promise<void>;
}
