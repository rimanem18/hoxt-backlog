/**
 * TASK-302: ユーザーAPI連携サービス
 * 【機能概要】: GET /api/user/profileエンドポイントとの通信を行うAPI連携レイヤー
 * 【実装方針】: テストを通すために最低限必要な機能のみを実装
 * 【テスト対応】: userService.test.tsで作成された5つのテストケースを通すための実装
 * 🟢 信頼性レベル: 既存認証実装パターン（TASK-301）からの高信頼性
 */

import type { User } from '@/packages/shared-schemas/src/auth';

/**
 * 【機能概要】: ユーザープロフィール情報を取得するAPIサービス
 * 【実装方針】: fetch APIを使用した最もシンプルなHTTP通信実装
 * 【テスト対応】: 正常系・認証エラー・サーバーエラー・ネットワークエラー・トークン未存在のテストケース対応
 * 🟢 信頼性レベル: 既存API実装パターンに基づく
 */
export const userService = {
  /**
   * 【機能概要】: 認証済みユーザーのプロフィール情報をAPIから取得
   * 【実装方針】: JWTトークン検証→API通信→エラーハンドリングの最小実装
   * 【テスト対応】: getUserProfile関連の全テストケースを通すための実装
   * 🟢 信頼性レベル: 既存認証フロー実装から直接移植
   * @returns {Promise<User>} ユーザープロフィール情報
   * @throws {Error} 認証エラー・通信エラー・ネットワークエラー時
   */
  getUserProfile: async (): Promise<User> => {
    // 【JWT認証トークン取得】: localStorage からJWTトークンを取得してAPI認証に使用
    // 【エラーハンドリング】: トークン未存在時は適切にエラーを発生させる
    const token = localStorage.getItem('authToken'); // 🟡 localStorage キー名は一般的なパターンから推測
    if (!token) {
      // 【認証前チェック】: API通信前にトークンの存在を確認してセキュリティを確保
      throw new Error('認証トークンが見つかりません');
    }

    try {
      // 【API通信実行】: GET /api/user/profile エンドポイントへのHTTP通信を実行
      // 【認証ヘッダー付与】: JWT Bearer Tokenを適切なヘッダー形式で送信
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // 【JWT認証】: Bearer形式でのトークン送信 🟢
        },
      });

      // 【HTTPエラー処理】: レスポンスステータスコードによる適切なエラーハンドリング
      if (!response.ok) {
        // 【ステータスコード別処理】: 401認証エラー・500サーバーエラー等の区別
        if (response.status === 401) {
          // 【認証エラー】: JWTトークンの有効期限切れまたは不正トークンの場合
          throw new Error('認証が必要です。再度ログインしてください'); // 🟢 テストケースで期待されるメッセージ
        } else if (response.status === 500) {
          // 【サーバーエラー】: バックエンド内部エラーの場合
          throw new Error('プロフィール情報の取得に失敗しました'); // 🟢 テストケースで期待されるメッセージ
        } else {
          // 【その他HTTPエラー】: 予期しないステータスコードの場合
          throw new Error(`API Error: ${response.status}`); // 🟡 一般的なエラーハンドリングパターン
        }
      }

      // 【レスポンス解析】: JSONレスポンスをUser型として解析して返却
      // 【型安全性確保】: User型インターフェースに準拠したデータ変換
      const userData: User = await response.json();
      return userData; // 【正常系結果】: 取得成功時のUser型データを返却
      
    } catch (error) {
      // 【ネットワークエラー処理】: fetch実行時のネットワーク例外を適切にハンドリング
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // 【ネットワーク接続失敗】: インターネット接続断絶・DNS解決失敗等の場合
        throw new Error('インターネット接続を確認してください'); // 🟢 テストケースで期待されるメッセージ
      }
      
      // 【その他エラー】: 既に処理済みのHTTPエラー等はそのまま再スロー
      throw error; // 【エラー伝播】: 上位層での適切なエラーハンドリングのためにエラーを再投げ
    }
  }
};