/**
 * 【機能概要】: Googleログインボタンコンポーネント
 * 【実装方針】: テストケースを通すために必要最小限のUIとイベントハンドリングのみを実装
 * 【テスト対応】: GoogleLoginButton.test.tsx のボタン表示・クリック処理テストを通すための実装
 * 🟢 信頼性レベル: 要件REQ-102（Google認証フロー）・テストケース仕様から直接抽出
 */
'use client'
import React from 'react';
import { createClient } from '@supabase/supabase-js'

/**
 * 【Googleログインボタンコンポーネント】: 未認証ユーザー向けの認証開始UI
 * 【実装内容】: ボタン表示とクリックイベント処理の最小限実装
 * 【テスト要件対応】: role="button"とname="Googleでログイン"の属性を提供
 * 🟢 信頼性レベル: React標準パターン・テスト仕様から直接実装
 * @returns {React.ReactNode} - Googleログインボタン要素
 */
export const GoogleLoginButton: React.FC = () => {

  // Project URL と ANON Key から Client を生成
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  /**
   * 【クリックイベントハンドラー】: Googleログインボタンクリック時の処理
   * 【改善内容】: テスト要件に合わせてoptions.redirectToパラメータを追加
   * 【設計方針】: Supabase OAuth仕様に準拠した認証フロー実装
   * 【パフォーマンス】: async/awaitによる適切な非同期処理
   * 【保守性】: エラーハンドリングと成功時処理を分離
   * 🟢 信頼性レベル: Supabase公式ドキュメントとテスト要件から直接実装
   * @returns {Promise<void>} - 認証処理の完了を保証
   */
  const handleClick = async (): Promise<void> => {
    try {
      // 【メイン処理】: Google OAuth認証フローを開始
      // 【テスト要件対応】: options.redirectToパラメータを含む呼び出し
      // 【セキュリティ】: 認証後のリダイレクト先を明示的に指定
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 【リダイレクト設定】: 認証成功後の遷移先URL
          // 【開発環境対応】: 環境変数または現在のオリジンを使用
          redirectTo: process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
        }
      });
      
      // 【成功時処理】: 認証フロー開始の確認ログ
      console.log('認証成功！');
    } catch (error) {
      // 【エラーハンドリング】: 認証失敗時の適切な処理
      // 【ユーザビリティ】: エラー内容を分かりやすく出力
      console.error('認証失敗！', error);
    }
  };

  // 【JSX返却】: テストで期待されるボタン要素を返却
  // 【テスト要件】: role="button", name="Googleでログイン" 属性が必要
  return (
    <button
      type="button"
      role="button"
      onClick={handleClick}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Googleでログイン
    </button>
  );
};
