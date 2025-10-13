/**
 * shared-schemas エクスポート
 *
 * client/serverで共有するZodスキーマとTypeScript型定義
 */

// ユーザー関連（Drizzle Zod自動生成）
export {
  selectUserSchema,
  insertUserSchema,
  authProviderSchema,
  type SelectUser,
  type InsertUser,
  type AuthProvider,
} from './users';

// 将来的に追加予定のスキーマ
// export * from './auth';
// export * from './common';
