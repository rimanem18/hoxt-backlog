import type {
  AuthProvider,
  CreateUserInput,
  IUserRepository,
} from '@/user/domain';
import {
  EmailAddress,
  InvalidProviderError,
  isValidAuthProvider,
  UserEntity,
} from '@/user/domain';
import type { IAuthenticationDomainService } from './IAuthenticationDomainService';
import type { ExternalUserInfo } from './IAuthProvider';

/**
 * 認証ドメインサービス実装
 *
 * 認証に関するビジネスロジック（JITプロビジョニング、ユーザー認証等）を実装する。
 * このサービスは複数のエンティティにまたがるビジネスロジックを扱い、
 * 単一のエンティティに属さない複雑なビジネスルールを管理する。
 *
 * 依存性：
 * - IUserRepository: ユーザーの永続化操作
 */
export class AuthenticationDomainService
  implements IAuthenticationDomainService
{
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * JITプロビジョニング実行
   * 外部プロバイダーからの情報を基に新規ユーザーを作成する
   *
   * ビジネスルール：
   * - プロバイダー情報の妥当性検証
   * - 重複チェック（外部ID + プロバイダー）
   * - ユーザーエンティティの作成・永続化
   *
   * @param externalInfo - 外部プロバイダーから取得した正規化済みユーザー情報
   * @returns 作成された新規ユーザーエンティティ
   * @throws InvalidProviderError プロバイダー情報が不正な場合
   * @throws 一意制約違反等のデータベースエラー
   */
  async createUserFromExternalInfo(
    externalInfo: ExternalUserInfo,
  ): Promise<UserEntity> {
    // プロバイダー情報の検証
    if (!isValidAuthProvider(externalInfo.provider)) {
      throw InvalidProviderError.forProvider(externalInfo.provider);
    }

    // 重複チェック：同じ外部ID + プロバイダーのユーザーが既に存在するかチェック
    const existingUser = await this.userRepository.findByExternalId(
      externalInfo.id,
      externalInfo.provider as AuthProvider,
    );

    if (existingUser) {
      // 既存ユーザーが存在する場合はエラーではなく、そのユーザーを返却
      // JIT処理は冪等性を保つため
      return UserEntity.restore(existingUser);
    }

    // CreateUserInputを構築
    const createInput: CreateUserInput = {
      externalId: externalInfo.id,
      provider: externalInfo.provider as AuthProvider,
      email: EmailAddress.of(externalInfo.email).value,
      name: externalInfo.name,
      ...(externalInfo.avatarUrl ? { avatarUrl: externalInfo.avatarUrl } : {}),
    };

    // データベースに永続化
    const createdUser = await this.userRepository.create(createInput);

    // User型からUserEntityを復元して返却
    return UserEntity.restore(createdUser);
  }

  /**
   * ユーザー認証・取得
   * 外部プロバイダーからの情報を基に既存ユーザーを取得、または新規作成を行う
   *
   * 認証フローの中核となるビジネスロジック：
   * 1. 外部IDとプロバイダーで既存ユーザー検索
   * 2. 存在しない場合はメールアドレスで合流を試みる（REQ-002: 1メール=1ユーザー）
   * 3. それでも存在しない場合はJITプロビジョニング実行
   * 4. 最終ログイン日時の更新
   *
   * @param externalInfo - 外部プロバイダーから取得した正規化済みユーザー情報
   * @returns 認証結果（ユーザー情報と新規作成フラグ）
   * @throws InvalidProviderError プロバイダー情報が不正な場合
   * @throws 各種データベースエラー
   */
  async authenticateUser(externalInfo: ExternalUserInfo): Promise<{
    user: UserEntity;
    isNewUser: boolean;
  }> {
    if (!isValidAuthProvider(externalInfo.provider)) {
      throw InvalidProviderError.forProvider(externalInfo.provider);
    }

    const userData = await this.userRepository.findByExternalId(
      externalInfo.id,
      externalInfo.provider as AuthProvider,
    );

    let isNewUser = false;
    let user: UserEntity;

    if (!userData) {
      // findByExternalId で見つからない場合、同一メールの既存ユーザーと合流を試みる
      // provider をまたいだ同一人物の二重登録を防ぐため（REQ-002）
      const emailUser = await this.userRepository.findByEmail(
        EmailAddress.of(externalInfo.email).value,
      );

      if (emailUser) {
        user = UserEntity.restore(emailUser);
      } else {
        user = await this.createUserFromExternalInfo(externalInfo);
        isNewUser = user.isNewUser();
      }
    } else {
      user = UserEntity.restore(userData);
    }

    const updatedUserData = await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    return {
      user: UserEntity.restore(updatedUserData),
      isNewUser,
    };
  }
}
