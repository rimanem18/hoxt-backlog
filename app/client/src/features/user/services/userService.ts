/**
 * TASK-302: ユーザーAPI連携サービス（リファクタリング版）
 * 【機能概要】: GET /api/user/profileエンドポイントとの通信を行うAPI連携レイヤー
 * 【リファクタリング改善】: トークンサービス抽象化によるDIP原則準拠
 * 【設計向上】: 依存性注入による疎結合とテスタビリティ向上
 * 【セキュリティ強化】: トークン管理の集中化によるセキュリティ向上
 * 🟢 品質向上: SOLID原則完全準拠の高信頼性実装
 */

import type { User } from '@/packages/shared-schemas/src/auth';
import { errorService } from './errorService';
import { type TokenService, tokenService } from './tokenService';

/**
 * 【DI対応】: UserServiceの抽象化インターフェース
 * 【目的】: useUserProfileフックでの依存性注入を可能にする
 * 【テスト改善】: モック実装の型安全性を保証
 */
export interface UserServiceInterface {
  getUserProfile(): Promise<User>;
}

/**
 * 【リファクタリング版】: ユーザープロフィール情報を取得するAPIサービス
 * 【改善点】: TokenService注入による依存性逆転原則（DIP）の完全実装
 * 【設計向上】: インターフェースによる抽象化で疎結合を実現
 * 【テスタビリティ】: 依存性注入により単体テストが容易
 * 🟢 品質向上: SOLID原則準拠による高品質設計
 */
export const createUserService = (tokenSvc: TokenService = tokenService) => ({
  /**
   * 【機能概要】: 認証済みユーザーのプロフィール情報をAPIから取得（リファクタリング版）
   * 【リファクタリング改善】: TokenServiceによる抽象化で責任分離を実現
   * 【依存性注入】: TokenService interfaceに依存し、具象実装から独立
   * 【セキュリティ向上】: トークン管理の集中化により一貫したセキュリティ
   * 🟢 改善効果: テスタビリティ・保守性・拡張性の向上
   * @returns {Promise<User>} ユーザープロフィール情報
   * @throws {Error} 認証エラー・通信エラー・ネットワークエラー時
   */
  getUserProfile: async (): Promise<User> => {
    // 【改善されたトークン取得】: TokenServiceによる抽象化でDIP原則準拠
    // 【セキュリティ向上】: 統一されたトークン管理による一貫したセキュリティ
    const token = tokenSvc.getToken();
    if (!token) {
      // 【認証前チェック】: TokenServiceの統一されたエラーハンドリング
      throw new Error('認証トークンが見つかりません');
    }

    try {
      // 【API通信実行】: GET /api/user/profile エンドポイントへのHTTP通信を実行
      // 【認証ヘッダー付与】: JWT Bearer Tokenを適切なヘッダー形式で送信
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // 【JWT認証】: Bearer形式でのトークン送信 🟢
        },
      });

      // 【HTTPエラー処理】: レスポンスステータスコードによる適切なエラーハンドリング
      if (!response.ok) {
        // 【リファクタリング改善】: HTTPエラーもErrorServiceで統一処理
        // 【統一化】: ステータスコード別の処理をErrorServiceに委譲
        const httpError = {
          status: response.status,
          statusText: response.statusText,
        };
        throw httpError; // ErrorServiceで処理するためhttpError objectを投げる
      }

      // 【レスポンス解析】: JSONレスポンスをUser型として解析して返却
      // 【型安全性確保】: User型インターフェースに準拠したデータ変換
      const userData: User = await response.json();
      return userData; // 【正常系結果】: 取得成功時のUser型データを返却
    } catch (error) {
      // 【リファクタリング改善】: ErrorServiceによる統一的なエラーハンドリング
      // 【DRY原則】: 重複したエラー処理ロジックをサービスに集約
      // 【保守性向上】: エラーメッセージ変更時の影響範囲を最小化
      const userFriendlyError = errorService.handle(error);

      // 【下位互換性】: 既存テストとの互換性を保つため従来のErrorインスタンスを投げる
      // 【将来改善】: UserFriendlyErrorを直接返すAPIに段階的移行予定
      throw new Error(userFriendlyError.message);
    }
  },
});

/**
 * 【下位互換性維持】: 既存コードとの互換性を保つデフォルトエクスポート
 * 【移行戦略】: 段階的リファクタリングのための移行期間サポート
 * 【設計】: デフォルトTokenServiceを使用したインスタンス
 */
export const userService = createUserService();
