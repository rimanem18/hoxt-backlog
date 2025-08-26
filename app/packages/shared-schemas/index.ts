/**
 * shared-schemas エクスポート
 *
 * client/serverで共有するZodスキーマとTypeScript型定義
 */

// ユーザー関連
export {
  authProviderSchema,
  userBaseSchema,
  createUserRequestSchema,
  updateUserRequestSchema,
  userResponseSchema,
  getUserProfileResponseSchema,
  authResponseSchema,
  errorResponseSchema,
  type AuthProvider,
  type CreateUserRequest,
  type UpdateUserRequest,
  type UserResponse,
  type GetUserProfileResponse,
  type AuthResponse,
  type ErrorResponse,
} from './users';

// 将来的に追加予定のスキーマ
// export * from './auth';
// export * from './common';
