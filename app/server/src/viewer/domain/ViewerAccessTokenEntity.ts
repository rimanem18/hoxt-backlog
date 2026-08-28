import { randomUUID } from 'node:crypto';
import { EmailAddress } from '@/shared/domain/valueobjects/EmailAddress';

/**
 * ViewerAccessTokenEntity生成時の入力データ
 */
export interface CreateViewerAccessTokenEntityInput {
  email: string;
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * ViewerAccessTokenEntity復元時のプロパティ
 */
export interface ViewerAccessTokenEntityProps {
  id: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ViewerAccessTokenEntity
 *
 * 閲覧者アクセストークンのドメインエンティティ。
 * rawTokenは永続化対象ではなく、生成直後のメール送信のためだけに保持する。
 */
export class ViewerAccessTokenEntity {
  private readonly id: string;
  private readonly email: EmailAddress;
  private readonly tokenHash: string;
  private readonly expiresAt: Date;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;
  private readonly rawToken: string | null;

  /**
   * プライベートコンストラクタ
   * 外部からの直接生成を禁止し、ファクトリメソッドを通じた生成を強制する
   */
  private constructor(props: {
    id: string;
    email: EmailAddress;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    rawToken: string | null;
  }) {
    this.id = props.id;
    this.email = props.email;
    this.tokenHash = props.tokenHash;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.rawToken = props.rawToken;
  }

  /**
   * 新規トークンを発行する静的ファクトリメソッド
   *
   * @param input - 発行に必要な入力データ
   * @returns 新しいViewerAccessTokenEntityインスタンス
   */
  public static create(
    input: CreateViewerAccessTokenEntityInput,
  ): ViewerAccessTokenEntity {
    const now = new Date();

    return new ViewerAccessTokenEntity({
      id: randomUUID(),
      email: EmailAddress.of(input.email),
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
      rawToken: input.rawToken,
    });
  }

  /**
   * DBから復元する静的ファクトリメソッド
   * 生トークンは受け取らない（永続化対象外のため）
   *
   * @param props - 復元に必要なプロパティ
   * @returns 復元されたViewerAccessTokenEntityインスタンス
   */
  public static reconstruct(
    props: ViewerAccessTokenEntityProps,
  ): ViewerAccessTokenEntity {
    return new ViewerAccessTokenEntity({
      id: props.id,
      email: EmailAddress.of(props.email),
      tokenHash: props.tokenHash,
      expiresAt: props.expiresAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      rawToken: null,
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

  public getTokenHash(): string {
    return this.tokenHash;
  }

  public getExpiresAt(): Date {
    return this.expiresAt;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public getRawToken(): string | null {
    return this.rawToken;
  }

  // ==========================================================================
  // ビジネスロジック
  // ==========================================================================

  /**
   * 指定時刻において有効期限切れかどうかを判定する
   *
   * @param now - 判定基準時刻
   * @returns 有効期限を超過している場合true
   */
  public isExpired(now: Date): boolean {
    return now.getTime() > this.expiresAt.getTime();
  }
}
