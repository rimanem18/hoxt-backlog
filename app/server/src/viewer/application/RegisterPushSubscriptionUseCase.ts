import type { IPushSubscriptionRepository } from '@/viewer/domain/IPushSubscriptionRepository';
import { PushSubscriptionEntity } from '@/viewer/domain/PushSubscriptionEntity';
import type {
  IRegisterPushSubscriptionUseCase,
  RegisterPushSubscriptionInput,
} from './IRegisterPushSubscriptionUseCase';

/**
 * Push購読登録ユースケース
 *
 * email×endpointの重複判定・上書き（upsert）はリポジトリ層の責務であり、
 * ここでは購読エンティティを生成してリポジトリへ保存するのみを行う。
 */
export class RegisterPushSubscriptionUseCase
  implements IRegisterPushSubscriptionUseCase
{
  constructor(
    private readonly pushSubscriptionRepository: IPushSubscriptionRepository,
  ) {}

  public async execute(
    input: RegisterPushSubscriptionInput,
  ): Promise<PushSubscriptionEntity> {
    const entity = PushSubscriptionEntity.create(input);
    return this.pushSubscriptionRepository.save(entity);
  }
}
