/**
 * Userドメイン 公開API
 *
 * ドメインの外部インターフェースを統合し、
 * 他のモジュールからの簡潔なインポートを可能にする。
 */

// 値オブジェクト・型定義
export type { AuthProvider } from './AuthProvider';
export {
  AuthProviders,
  getSupportedProviders,
  isValidAuthProvider,
} from './AuthProvider';
export { InvalidProviderError } from './errors/InvalidProviderError';
// ドメインエラー
export { UserDomainError } from './errors/UserDomainError';
export { UserNotFoundError } from './errors/UserNotFoundError';
// リポジトリインターフェース
export type { IUserRepository } from './IUserRepository';
export type { User } from './UserEntity';
// エンティティ
export { UserEntity } from './UserEntity';
export type { CreateUserInput } from './valueobjects/CreateUserInput';
export {
  CreateUserInputValidation,
  isValidEmail,
  validateCreateUserInput,
} from './valueobjects/CreateUserInput';
export type { UpdateUserInput } from './valueobjects/UpdateUserInput';
export {
  UpdateUserInputValidation,
  validateUpdateUserInput,
} from './valueobjects/UpdateUserInput';
