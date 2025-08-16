import type { User } from '@/domain/user';
import type { ExternalUserInfo } from './IAuthProvider';

/**
 * 認証ドメインサービスインターフェース
 *
 * このインターフェースは、認証に関するビジネスロジック（JITプロビジョニング、
 * ユーザー認証等）を抽象化し、Application層からDomain層の認証ロジックに
 * アクセスするための統一的なインターフェースを提供する。
 *
 * ドメインサービスは、複数のエンティティにまたがるビジネスロジックや、
 * 単一のエンティティに属さない複雑なビジネスルールを扱う。
 */
export interface IAuthenticationDomainService {
  /**
   * JITプロビジョニング実行
   * 外部プロバイダーからの情報を基に新規ユーザーを作成する
   *
   * @param externalInfo - 外部プロバイダーから取得した正規化済みユーザー情報
   * @returns 作成された新規ユーザーエンティティ
   * @throws InvalidProviderError プロバイダー情報が不正な場合
   * @throws 一意制約違反等のデータベースエラー
   */
  createUserFromExternalInfo(externalInfo: ExternalUserInfo): Promise<User>;

  /**
   * ユーザー認証・取得
   * 外部プロバイダーからの情報を基に既存ユーザーを取得、または新規作成を行う
   *
   * このメソッドは認証フローの中核となるビジネスロジックで、以下を実行する：
   * 1. 外部IDとプロバイダーで既存ユーザー検索
   * 2. 存在しない場合はJITプロビジョニング実行
   * 3. 最終ログイン日時の更新
   *
   * @param externalInfo - 外部プロバイダーから取得した正規化済みユーザー情報
   * @returns 認証結果（ユーザー情報と新規作成フラグ）
   * @throws InvalidProviderError プロバイダー情報が不正な場合
   * @throws 各種データベースエラー
   */
  authenticateUser(externalInfo: ExternalUserInfo): Promise<{
    user: User;
    isNewUser: boolean;
  }>;
}
