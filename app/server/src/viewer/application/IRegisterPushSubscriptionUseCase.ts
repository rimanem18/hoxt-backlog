import type { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';

/**
 * Push購読登録ユースケースの入力データ
 */
export interface RegisterPushSubscriptionInput {
  /** viewerアクセストークンから解決した正規化済みメールアドレス */
  email: string;
  /** Push Serviceのendpoint URL */
  endpoint: string;
  /** Push暗号化用のp256dh鍵 */
  p256dhKey: string;
  /** Push暗号化用のauth鍵 */
  authKey: string;
}

/**
 * Push購読登録ユースケースインターフェース
 */
export interface IRegisterPushSubscriptionUseCase {
  execute(
    input: RegisterPushSubscriptionInput,
  ): Promise<PushSubscriptionEntity>;
}
