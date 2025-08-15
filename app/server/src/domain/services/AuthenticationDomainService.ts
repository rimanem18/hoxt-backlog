import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { AuthProvider, CreateUserInput } from '@/domain/user';
import { InvalidProviderError, UserEntity } from '@/domain/user';
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
  private readonly VALID_PROVIDERS = new Set<AuthProvider>([
    'google',
    'apple',
    'microsoft',
    'github',
    'facebook',
    'line',
  ]);

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
    if (!this.isValidProvider(externalInfo.provider)) {
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
      email: externalInfo.email,
      name: externalInfo.name,
      ...(externalInfo.avatarUrl ? { avatarUrl: externalInfo.avatarUrl } : {}),
    };

    // 新規ユーザーエンティティを作成
    const newUser = UserEntity.create(createInput);

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
   * 2. 存在しない場合はJITプロビジョニング実行
   * 3. 最終ログイン日時の更新
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
    // プロバイダー情報の検証
    if (!this.isValidProvider(externalInfo.provider)) {
      throw InvalidProviderError.forProvider(externalInfo.provider);
    }

    // 1. 既存ユーザーの検索
    const userData = await this.userRepository.findByExternalId(
      externalInfo.id,
      externalInfo.provider as AuthProvider,
    );

    let isNewUser = false;
    let user: UserEntity;

    // 2. 存在しない場合はJITプロビジョニング実行
    if (!userData) {
      user = await this.createUserFromExternalInfo(externalInfo);
      isNewUser = true;
    } else {
      user = UserEntity.restore(userData);
    }

    // 3. 最終ログイン日時の更新
    // 新規ユーザーの場合もログイン記録は必要
    const now = new Date();
    const updatedUserData = await this.userRepository.update(user.id, {
      lastLoginAt: now,
    });

    return {
      user: UserEntity.restore(updatedUserData),
      isNewUser,
    };
  }

  /**
   * プロバイダー種別の妥当性検証
   *
   * セキュリティ強化：
   * - 許可されたプロバイダーのセットを事前定義
   * - Set.has()によるO(1)の高速検索
   * - 型安全性を保証
   *
   * @param provider - 検証対象のプロバイダー文字列
   * @returns 有効なプロバイダーの場合true
   */
  private isValidProvider(provider: string): provider is AuthProvider {
    return this.VALID_PROVIDERS.has(provider as AuthProvider);
  }
}
