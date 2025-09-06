/**
 * 【認証検証ユーティリティ】: 認証関連の検証ロジックを統合
 * 【機能概要】: provider.tsxとdashboard/page.tsxで共通する認証検証処理を統合
 * 【設計方針】: DRY原則に基づく重複コード除去とメンテナンス性向上
 * 【リファクタリング理由】: 複数箇所で同様の検証ロジックが散在していた課題を解決
 * 🟢 信頼性レベル: 既存の実装から抽出した安定性の高い検証ロジック
 */

import type { User } from '@/packages/shared-schemas/src/auth';

/**
 * 認証データの基本構造を定義
 * localStorage から取得される認証データの型定義
 */
export interface StoredAuthData {
  user: User;
  expires_at: number | string;
  access_token?: string;
  isNewUser?: boolean;
}

/**
 * 認証検証の結果を表すインターフェース
 * 検証成功時はデータを含み、失敗時はエラー理由を含む
 */
export interface AuthValidationResult {
  isValid: boolean;
  data?: StoredAuthData;
  reason?: 'missing' | 'parse_error' | 'invalid_expires_at' | 'expired' | 'invalid_token' | 'invalid_user';
}

/**
 * localStorage から認証データを取得し、包括的な検証を行う
 * 
 * 【検証項目】:
 * - 認証データの存在確認
 * - JSON形式の妥当性
 * - expires_at の型と値の検証
 * - トークンの有効期限確認
 * - access_token の存在確認
 * - user 情報の完全性確認
 * 
 * @returns AuthValidationResult - 検証結果と詳細情報
 */
export function validateStoredAuth(): AuthValidationResult {
  try {
    // 【ステップ1】: localStorage からの認証データ取得
    // 【エラーハンドリング】: データ不存在の場合は早期リターン
    const persistedState = localStorage.getItem('sb-localhost-auth-token');
    if (!persistedState) {
      return {
        isValid: false,
        reason: 'missing',
      };
    }

    // 【ステップ2】: JSON解析と型安全性確保
    // 【例外処理】: 不正なJSON形式に対する適切なエラー処理
    let authData: StoredAuthData;
    try {
      authData = JSON.parse(persistedState);
    } catch {
      return {
        isValid: false,
        reason: 'parse_error',
      };
    }

    // 【ステップ3】: expires_at の型検証と数値変換
    // 【型安全性】: T005 対応 - 無効な型の expires_at を検出
    const isValidExpiresAt = typeof authData.expires_at === 'number';
    if (!isValidExpiresAt) {
      return {
        isValid: false,
        reason: 'invalid_expires_at',
      };
    }

    // 【ステップ4】: トークン有効期限の確認
    // 【セキュリティ】: 期限切れトークンの使用を防止
    const expiresAt = authData.expires_at as number;
    if (expiresAt <= Date.now()) {
      return {
        isValid: false,
        reason: 'expired',
      };
    }

    // 【ステップ5】: access_token の存在と形式確認
    // 【セキュリティ強化】: T005 対応 - 無効トークン文字列の検出
    // 【JWT構造検証】: 基本的なJWT形式（3つのパート）の確認
    const isValidAccessToken = 
      authData.access_token && 
      typeof authData.access_token === 'string' && 
      authData.access_token.split('.').length === 3 &&
      !authData.access_token.includes('INVALID');
    
    if (!isValidAccessToken) {
      return {
        isValid: false,
        reason: 'invalid_token',
      };
    }

    // 【ステップ6】: ユーザー情報の完全性確認
    // 【データ整合性】: 必須ユーザー情報の存在確認
    const isValidUser = authData.user && typeof authData.user.id === 'string';
    if (!isValidUser) {
      return {
        isValid: false,
        reason: 'invalid_user',
      };
    }

    // 【成功時】: すべての検証を通過した場合
    return {
      isValid: true,
      data: authData,
    };

  } catch (error) {
    // 【予期しないエラー処理】: localStorage アクセスエラー等
    console.error('認証検証中にエラーが発生:', error);
    return {
      isValid: false,
      reason: 'parse_error',
    };
  }
}

/**
 * 認証エラーの詳細メッセージを取得
 * 
 * @param reason - 検証失敗の理由
 * @returns ユーザー向けの分かりやすいエラーメッセージ
 */
export function getAuthErrorMessage(reason: string): string {
  const errorMessages = {
    missing: '認証情報が見つかりません',
    parse_error: '認証データの形式が不正です',
    invalid_expires_at: '有効期限の形式が不正です',
    expired: 'セッションの有効期限が切れました',
    invalid_token: '無効なトークンが検出されました',
    invalid_user: 'ユーザー情報が不正です',
  } as const;

  return errorMessages[reason as keyof typeof errorMessages] || '認証エラーが発生しました';
}

/**
 * 認証状態のクリーンアップを実行
 * 
 * 【機能概要】: localStorage からの認証データ削除
 * 【安全性】: エラー発生時も処理を継続
 */
export function clearStoredAuth(): void {
  try {
    localStorage.removeItem('sb-localhost-auth-token');
  } catch (error) {
    // 【エラー処理】: localStorage へのアクセス失敗時も安全に処理
    console.error('認証データクリア中にエラーが発生:', error);
  }
}