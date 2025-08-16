import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type {
  AuthProvider,
  CreateUserInput,
  UpdateUserInput,
} from '@/domain/user';
import { UserEntity, UserNotFoundError } from '@/domain/user';

/**
 * ユーザーアグリゲート
 *
 * DDDにおけるアグリゲートとして、ユーザーエンティティとその関連する
 * ビジネスルールの整合性を管理する。アグリゲートは以下の責務を持つ：
 *
 * 1. 整合性境界の管理：ユーザーに関連するビジネス不変条件の維持
 * 2. 変更の制御：エンティティへの変更を適切な方法で制御
 * 3. トランザクション境界：ユーザー関連操作の原子性保証
 *
 * このアグリゲートは、ユーザーエンティティへの操作を統一的に管理し、
 * ビジネスルールの一貫性を保証する。
 */
export class UserAggregate {
  private constructor(
    private readonly userEntity: UserEntity,
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * 既存ユーザーからアグリゲートを作成
   * @param userEntity - ユーザーエンティティ
   * @param userRepository - ユーザーリポジトリ
   * @returns UserAggregateインスタンス
   */
  public static fromEntity(
    userEntity: UserEntity,
    userRepository: IUserRepository,
  ): UserAggregate {
    return new UserAggregate(userEntity, userRepository);
  }

  /**
   * 新規ユーザー作成時にアグリゲートを作成
   * @param createInput - ユーザー作成入力
   * @param userRepository - ユーザーリポジトリ
   * @returns UserAggregateインスタンス
   */
  public static async createNew(
    createInput: CreateUserInput,
    userRepository: IUserRepository,
  ): Promise<UserAggregate> {
    // ビジネスルール：同じ外部ID+プロバイダーのユーザーは作成できない
    const existingUser = await userRepository.findByExternalId(
      createInput.externalId,
      createInput.provider,
    );

    if (existingUser) {
      // 既存ユーザーが存在する場合は、そのユーザーでアグリゲートを作成
      const userEntity = UserEntity.restore(existingUser);
      return new UserAggregate(userEntity, userRepository);
    }

    // データベースに永続化
    const persistedUser = await userRepository.create(createInput);

    // User型からUserEntityを復元
    const persistedUserEntity = UserEntity.restore(persistedUser);

    return new UserAggregate(persistedUserEntity, userRepository);
  }

  /**
   * ユーザーIDでアグリゲートを取得
   * @param userId - ユーザーID
   * @param userRepository - ユーザーリポジトリ
   * @returns UserAggregateインスタンス
   * @throws UserNotFoundError ユーザーが存在しない場合
   */
  public static async findById(
    userId: string,
    userRepository: IUserRepository,
  ): Promise<UserAggregate> {
    const userEntity = await userRepository.findById(userId);

    if (!userEntity) {
      throw UserNotFoundError.forUserId(userId);
    }

    // User型からUserEntityを復元
    const restoredUserEntity = UserEntity.restore(userEntity);

    return new UserAggregate(restoredUserEntity, userRepository);
  }

  /**
   * 外部IDとプロバイダーでアグリゲートを取得
   * @param externalId - 外部プロバイダーでのユーザーID
   * @param provider - 認証プロバイダー種別
   * @param userRepository - ユーザーリポジトリ
   * @returns UserAggregateインスタンスまたはnull
   */
  public static async findByExternalId(
    externalId: string,
    provider: AuthProvider,
    userRepository: IUserRepository,
  ): Promise<UserAggregate | null> {
    const userEntity = await userRepository.findByExternalId(
      externalId,
      provider,
    );

    if (!userEntity) {
      return null;
    }

    // User型からUserEntityを復元
    const restoredUserEntity = UserEntity.restore(userEntity);

    return new UserAggregate(restoredUserEntity, userRepository);
  }

  /**
   * ユーザー情報を更新し、永続化する
   *
   * ビジネスルール：
   * - 更新内容の妥当性検証
   * - 更新日時の自動設定
   * - 永続化の実行
   *
   * @param updateInput - 更新入力
   * @returns 更新されたユーザーエンティティ
   */
  public async updateUser(updateInput: UpdateUserInput): Promise<UserEntity> {
    // エンティティレベルでのバリデーションは UserEntity.update() 内で実行される
    this.userEntity.update(updateInput);

    // データベースに変更を永続化
    const updatedUser = await this.userRepository.update(
      this.userEntity.id,
      updateInput,
    );

    // User型からUserEntityを復元して返却
    return UserEntity.restore(updatedUser);
  }

  /**
   * ログイン記録を更新する
   *
   * ユーザーの最終ログイン日時を現在時刻に更新し、永続化する。
   * 認証成功時に呼び出される。
   *
   * @returns 更新されたユーザーエンティティ
   */
  public async recordLogin(): Promise<UserEntity> {
    const now = new Date();

    // エンティティのログイン記録を更新
    this.userEntity.recordLogin();

    // データベースに変更を永続化
    const updatedUser = await this.userRepository.update(this.userEntity.id, {
      lastLoginAt: now,
    });

    // User型からUserEntityを復元して返却
    return UserEntity.restore(updatedUser);
  }

  /**
   * ユーザーを削除する
   *
   * アグリゲートの削除処理。関連するビジネスルールがある場合は
   * ここで実装する（例：削除前の確認、関連データの整合性チェック等）。
   */
  public async deleteUser(): Promise<void> {
    // 将来的にビジネスルール追加の可能性：
    // - 削除可能性の確認（アクティブなセッションがないか等）
    // - 関連データの削除または匿名化

    await this.userRepository.delete(this.userEntity.id);
  }

  /**
   * このアグリゲートのルートエンティティ（ユーザー）を取得
   * @returns ユーザーエンティティ
   */
  public getUser(): UserEntity {
    return this.userEntity;
  }

  /**
   * ユーザーが新規作成されたかどうかを判定
   * @returns 新規作成から1分以内の場合true
   */
  public isNewUser(): boolean {
    return this.userEntity.isNewUser();
  }

  /**
   * ユーザーの基本情報を取得
   * @returns ユーザー基本情報オブジェクト
   */
  public getUserInfo() {
    return this.userEntity.toObject();
  }
}
