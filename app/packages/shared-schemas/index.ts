/**
 * shared-schemas エクスポート
 *
 * client/server で共有する API コントラクトスキーマとTypeScript型定義
 *
 * 注意: DBスキーマ（selectUserSchema, insertUserSchema等）は
 * server/src/schemas/ に配置され、ここでは直接 export されません。
 * このパッケージは API 間の契約（Request/Response型）のみを扱います。
 *
 * スキーマ駆動開発フロー:
 * 1. Drizzle ORM schema.ts（Single Source of Truth）
 * 2. server/src/schemas/（Drizzle Zodで自動生成）
 * 3. shared-schemas/（API契約として再エクスポート）
 * 4. client/（型安全なAPIクライアント）
 */

// 共通型定義
export * from './src/common';

// 認証API型定義
export * from './src/auth';

// ユーザーAPI型定義
export * from './src/users';
