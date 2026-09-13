import { randomUUID } from 'node:crypto';
import { EmailAddress } from '@/shared/domain/valueobjects/EmailAddress';
import { isValidEmail } from '@/user/domain/valueobjects/CreateUserInput';
import { InvalidViewerDataError } from './errors';

/**
 * PushSubscriptionEntity生成時の入力データ
 */
export interface CreatePushSubscriptionEntityInput {
  email: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

/**
 * PushSubscriptionEntity復元時のプロパティ
 */
export interface PushSubscriptionEntityProps {
  id: string;
  email: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * PushSubscriptionEntity
 *
 * viewerのWeb Push購読（email×endpoint）を表すドメインエンティティ。
 */
export class PushSubscriptionEntity {
  private readonly id: string;
  private readonly email: EmailAddress;
  private readonly endpoint: string;
  private readonly p256dhKey: string;
  private readonly authKey: string;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;

  /**
   * プライベートコンストラクタ
   * 外部からの直接生成を禁止し、ファクトリメソッドを通じた生成を強制する
   */
  private constructor(props: {
    id: string;
    email: EmailAddress;
    endpoint: string;
    p256dhKey: string;
    authKey: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.email = props.email;
    this.endpoint = props.endpoint;
    this.p256dhKey = props.p256dhKey;
    this.authKey = props.authKey;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * 新規購読を作成する静的ファクトリメソッド
   *
   * @param input - 作成に必要な入力データ
   * @returns 新しいPushSubscriptionEntityインスタンス
   */
  public static create(
    input: CreatePushSubscriptionEntityInput,
  ): PushSubscriptionEntity {
    if (!isValidEmail(input.email.trim())) {
      throw new InvalidViewerDataError('emailの形式が不正です');
    }
    if (input.endpoint.trim() === '') {
      throw new InvalidViewerDataError('endpointは必須です');
    }
    if (input.p256dhKey.trim() === '') {
      throw new InvalidViewerDataError('p256dhKeyは必須です');
    }
    if (input.authKey.trim() === '') {
      throw new InvalidViewerDataError('authKeyは必須です');
    }

    const now = new Date();

    return new PushSubscriptionEntity({
      id: randomUUID(),
      email: EmailAddress.of(input.email),
      endpoint: input.endpoint,
      p256dhKey: input.p256dhKey,
      authKey: input.authKey,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * DBから復元する静的ファクトリメソッド
   * バリデーションは行わない
   *
   * @param props - 復元に必要なプロパティ
   * @returns 復元されたPushSubscriptionEntityインスタンス
   */
  public static reconstruct(
    props: PushSubscriptionEntityProps,
  ): PushSubscriptionEntity {
    return new PushSubscriptionEntity({
      id: props.id,
      email: EmailAddress.of(props.email),
      endpoint: props.endpoint,
      p256dhKey: props.p256dhKey,
      authKey: props.authKey,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  // ==========================================================================
  // ゲッター
  // ==========================================================================

  public getId(): string {
    return this.id;
  }

  public getEmail(): string {
    return this.email.value;
  }

  public getEndpoint(): string {
    return this.endpoint;
  }

  public getP256dhKey(): string {
    return this.p256dhKey;
  }

  public getAuthKey(): string {
    return this.authKey;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
