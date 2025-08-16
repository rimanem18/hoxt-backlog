import type { AuthProvider } from './AuthProvider';
import { isValidAuthProvider } from './AuthProvider';
import { InvalidProviderError } from './errors/InvalidProviderError';
import type { CreateUserInput } from './valueobjects/CreateUserInput';
import { validateCreateUserInput } from './valueobjects/CreateUserInput';
import type { UpdateUserInput } from './valueobjects/UpdateUserInput';
import { validateUpdateUserInput } from './valueobjects/UpdateUserInput';

/**
 * ユーザー型（エンティティの公開インターフェース）
 *
 * UserEntityのtoObject()メソッドが返すオブジェクトの型定義。
 * 外部モジュールでの型チェックに使用される。
 */
export interface User {
  /** ユーザー固有ID（UUID v4） */
  id: string;
  /** 外部プロバイダーでのユーザーID（Google Sub Claim等） */
  externalId: string;
  /** 認証プロバイダー種別 */
  provider: AuthProvider;
  /** メールアドレス（必須） */
  email: string;
  /** 表示名 */
  name: string;
  /** プロフィール画像URL（オプション） */
  avatarUrl: string | null;
  /** アカウント作成日時 */
  createdAt: Date;
  /** 最終更新日時 */
  updatedAt: Date;
  /** 最終ログイン日時 */
  lastLoginAt: Date | null;
}

/**
 * ユーザーエンティティ
 *
 * ドメインの中核となるユーザー表現。
 * ビジネスルール・不変条件を管理し、プロバイダー非依存の設計を実現。
 */
export class UserEntity {
  /** ユーザー固有ID（UUID v4） */
  readonly id: string;

  /** 外部プロバイダーでのユーザーID（Google Sub Claimなど） */
  readonly externalId: string;

  /** 認証プロバイダー種別 */
  readonly provider: AuthProvider;

  /** メールアドレス（必須・ユニーク） */
  private _email: string;

  /** 表示名 */
  private _name: string;

  /** プロフィール画像URL（オプション） */
  private _avatarUrl: string | null;

  /** アカウント作成日時 */
  readonly createdAt: Date;

  /** 最終更新日時 */
  private _updatedAt: Date;

  /** 最終ログイン日時 */
  private _lastLoginAt: Date | null;

  /**
   * ユーザーエンティティのコンストラクタ（private）
   *
   * 直接的なインスタンス化を防ぎ、静的ファクトリメソッドの使用を強制。
   * これにより、必ずバリデーションを通った有効な状態のオブジェクトのみが生成される。
   *
   * @param props - ユーザー初期化プロパティ
   */
  private constructor(props: {
    id: string;
    externalId: string;
    provider: AuthProvider;
    email: string;
    name: string;
    avatarUrl?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    lastLoginAt?: Date | null;
  }) {
    this.id = props.id;
    this.externalId = props.externalId;
    this.provider = props.provider;
    this._email = props.email;
    this._name = props.name;
    this._avatarUrl = props.avatarUrl ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._lastLoginAt = props.lastLoginAt ?? null;
  }

  /**
   * 新規ユーザーエンティティを作成する（静的ファクトリメソッド）
   *
   * JITプロビジョニング時に使用。
   * バリデーションを実行し、有効な状態のユーザーのみを生成。
   *
   * @param input - ユーザー作成入力値
   * @returns 新しいUserEntityインスタンス
   * @throws CreateUserInputのバリデーションエラー
   * @throws InvalidProviderError - 不正なプロバイダーの場合
   */
  public static create(input: CreateUserInput): UserEntity {
    // 入力値の検証
    validateCreateUserInput(input);

    // プロバイダーの検証
    if (!isValidAuthProvider(input.provider)) {
      throw InvalidProviderError.forProvider(input.provider);
    }

    // UUID v4の生成
    const userId = crypto.randomUUID();

    return new UserEntity({
      id: userId,
      externalId: input.externalId,
      provider: input.provider,
      email: input.email,
      name: input.name,
      avatarUrl: input.avatarUrl ?? null,
    });
  }

  /**
   * 既存データからユーザーエンティティを復元する（静的ファクトリメソッド）
   *
   * データベースから取得したデータでエンティティを復元時に使用。
   *
   * @param props - 復元用プロパティ
   * @returns UserEntityインスタンス
   */
  public static restore(props: {
    id: string;
    externalId: string;
    provider: AuthProvider;
    email: string;
    name: string;
    avatarUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | null;
  }): UserEntity {
    return new UserEntity(props);
  }

  /**
   * ユーザー情報を更新する
   *
   * @param input - 更新入力値
   * @throws UpdateUserInputのバリデーションエラー
   */
  public update(input: UpdateUserInput): void {
    // 入力値の検証
    validateUpdateUserInput(input);

    // プロパティの更新
    if (input.name !== undefined) {
      this._name = input.name;
    }

    if (input.avatarUrl !== undefined) {
      this._avatarUrl = input.avatarUrl || null;
    }

    if (input.lastLoginAt !== undefined) {
      this._lastLoginAt = input.lastLoginAt;
    }

    // 更新日時を現在時刻に設定
    this._updatedAt = new Date();
  }

  /**
   * 最終ログイン日時を現在時刻に更新する
   *
   * ログイン成功時に呼び出される。
   */
  public recordLogin(): void {
    this._lastLoginAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * ユーザーが新規作成されたかどうかを判定する
   *
   * @returns 新規作成から1分以内の場合はtrue
   */
  public isNewUser(): boolean {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    return this.createdAt > oneMinuteAgo;
  }

  /**
   * ユーザーの基本情報を取得する
   *
   * @returns ユーザー基本情報オブジェクト
   */
  public toObject(): User {
    return {
      id: this.id,
      externalId: this.externalId,
      provider: this.provider,
      email: this._email,
      name: this._name,
      avatarUrl: this._avatarUrl,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
      lastLoginAt: this._lastLoginAt,
    };
  }

  // Getter メソッド

  /** メールアドレスを取得 */
  get email(): string {
    return this._email;
  }

  /** 表示名を取得 */
  get name(): string {
    return this._name;
  }

  /** アバターURLを取得 */
  get avatarUrl(): string | null {
    return this._avatarUrl;
  }

  /** 最終更新日時を取得 */
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** 最終ログイン日時を取得 */
  get lastLoginAt(): Date | null {
    return this._lastLoginAt;
  }
}
