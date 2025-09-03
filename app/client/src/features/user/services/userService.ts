/**
 * ユーザーAPI連携サービス
 *
 * GET /api/user/profileエンドポイントとの通信を行うAPI連携レイヤー
 */

import type { User } from '@/packages/shared-schemas/src/auth';
import { errorService } from './errorService';
import { type TokenService, tokenService } from './tokenService';

/**
 * UserServiceのインターフェース
 */
export interface UserServiceInterface {
  getUserProfile(): Promise<User>;
}

/**
 * ユーザープロフィール情報を取得するAPIサービス
 */
export const createUserService = (tokenSvc: TokenService = tokenService) => ({
  /**
   * 認証済みユーザーのプロフィール情報をAPIから取得
   *
   * @returns {Promise<User>} ユーザープロフィール情報
   * @throws {Error} 認証エラー・通信エラー・ネットワークエラー時
   */
  getUserProfile: async (): Promise<User> => {
    const token = tokenSvc.getToken();
    if (!token) {
      throw new Error('認証トークンが見つかりません');
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // ErrorServiceで処理するためのHTTPエラーオブジェクト
        const httpError = {
          status: response.status,
          statusText: response.statusText,
        };
        throw httpError;
      }

      const userData: User = await response.json();
      return userData;
    } catch (error) {
      // ErrorServiceで統一的なエラーハンドリング
      const userFriendlyError = errorService.handle(error);

      // 既存テストとの互換性を保つためErrorインスタンスを使用
      throw new Error(userFriendlyError.message);
    }
  },
});

/**
 * 既存コードとの互換性を保つデフォルトuserServiceインスタンス
 */
export const userService = createUserService();
