/**
 * shared-schemas エクスポート
 *
 * client/server で共有する API コントラクトスキーマとTypeScript型定義
 *
 * 注意: DBスキーマ（selectUserSchema, insertUserSchema等）は
 * server/src/schemas/ に配置され、ここでは export されません。
 * このパッケージは API 間の契約（Request/Response型）のみを扱います。
 */

// 将来的に追加予定の API コントラクトスキーマ
// export * from './auth';    // 認証 API 型定義
// export * from './users';   // ユーザー API 型定義
// export * from './common';  // 共通レスポンス型
