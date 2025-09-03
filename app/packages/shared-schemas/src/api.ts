/**
 * API共通レスポンス形式とエンドポイント固有の型定義
 * UserControllerテストで参照される最小限のAPI型定義を提供
 */

import type { User } from './auth.js';

/**
 * API共通レスポンス形式
 * 全てのAPIエンドポイントで使用される標準レスポンス構造
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
 * エラーレスポンスの詳細情報構造
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
 * ユーザープロフィール取得APIの専用レスポンス形式
 */
export interface GetUserProfileResponse extends ApiResponse<User> {
  /** ApiResponse<User>を継承してユーザーデータ型を特定 */
}