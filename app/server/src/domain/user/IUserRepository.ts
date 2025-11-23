import type { AuthProvider } from './AuthProvider';
import type { User } from './UserEntity';
import type { CreateUserInput } from './valueobjects/CreateUserInput';
import type { UpdateUserInput } from './valueobjects/UpdateUserInput';

/**
 * ユーザーリポジトリインターフェース
 * Domain層でのデータ永続化抽象化
 *
 * このインターフェースは、ユーザーエンティティの永続化操作を抽象化し、
 * Infrastructure層での具体的な実装に依存しないようにする。
 * DIPに従い、Domain層はこの抽象化に依存し、Infrastructure層がこの抽象化を実装する。
 */
export interface IUserRepository {
  /**
   * 外部IDとプロバイダーでユーザーを検索
   * @param externalId - 外部プロバイダーでのユーザーID（Google Sub Claim等）
   * @param provider - 認証プロバイダー種別
   * @returns ユーザーエンティティまたはnull（見つからない場合）
   */
  findByExternalId(
    externalId: string,
    provider: AuthProvider,
  ): Promise<User | null>;

  /**
   * ユーザーIDでユーザーを検索
   * @param id - ユーザー固有ID（UUID v4）
   * @returns ユーザーエンティティまたはnull（見つからない場合）
   */
  findById(id: string): Promise<User | null>;

  /**
   * メールアドレスでユーザーを検索
   * @param email - メールアドレス
   * @returns ユーザーエンティティまたはnull（見つからない場合）
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * 新規ユーザー作成
   * @param input - ユーザー作成時の値オブジェクト
   * @returns 作成されたユーザーエンティティ
   * @throws 一意制約違反等のデータベースエラー
   */
  create(input: CreateUserInput): Promise<User>;

  /**
   * ユーザー情報更新
   * @param id - 更新対象のユーザーID
   * @param input - ユーザー更新時の値オブジェクト
   * @returns 更新されたユーザーエンティティ
   * @throws ユーザーが存在しない場合のエラー
   */
  update(id: string, input: UpdateUserInput): Promise<User>;

  /**
   * ユーザー削除
   * @param id - 削除対象のユーザーID
   * @throws ユーザーが存在しない場合のエラー
   */
  delete(id: string): Promise<void>;
}
