/**
 * 【機能概要】: API共通レスポンス形式とエンドポイント固有の型定義
 * 【実装方針】: UserControllerテストで参照される最小限のAPI型定義を提供
 * 【テスト対応】: GetUserProfileResponse型を提供してHTTPテストを通す
 * 🟢 信頼性レベル: api-endpoints.md・interfaces.ts API型定義から直接抽出
 */

import type { User } from './auth.js';

/**
 * API共通レスポンス形式
 * 【型定義】: 全てのAPIエンドポイントで使用される標準レスポンス構造
 */
export interface ApiResponse<T> {
  /** 成功フラグ */
  success: boolean;
  /** レスポンスデータ（成功時のみ） */
  data?: T;
  /** エラー情報（失敗時のみ） */
  error?: ApiError;
}

/**
 * APIエラー情報
 * 【型定義】: エラーレスポンスの詳細情報構造
 */
export interface ApiError {
  /** エラーコード（INVALID_TOKEN・TOKEN_EXPIRED等） */
  code: string;
  /** ユーザー向けエラーメッセージ */
  message: string;
  /** 開発者向け詳細情報（オプション） */
  details?: string;
}

/**
 * GET /api/user/profile レスポンス型
 * 【型定義】: ユーザープロフィール取得APIの専用レスポンス形式
 * 🟢 信頼性レベル: api-endpoints.md GetUserProfileResponseから直接抽出
 */
export interface GetUserProfileResponse extends ApiResponse<User> {
  /** 【継承構造】: ApiResponse<User>を継承してユーザーデータ型を特定 */
}