/**
 * 【機能概要】: Googleログインボタンコンポーネント
 * 【実装方針】: テストケースを通すために必要最小限のUIとイベントハンドリングのみを実装
 * 【テスト対応】: GoogleLoginButton.test.tsx のボタン表示・クリック処理テストを通すための実装
 * 🟢 信頼性レベル: 要件REQ-102（Google認証フロー）・テストケース仕様から直接抽出
 */

import React from 'react';

/**
 * 【Googleログインボタンコンポーネント】: 未認証ユーザー向けの認証開始UI
 * 【実装内容】: ボタン表示とクリックイベント処理の最小限実装
 * 【テスト要件対応】: role="button"とname="Googleでログイン"の属性を提供
 * 🟢 信頼性レベル: React標準パターン・テスト仕様から直接実装
 * @returns {React.ReactNode} - Googleログインボタン要素
 */
export const GoogleLoginButton: React.FC = () => {
  /**
   * 【クリックイベントハンドラー】: Googleログインボタンクリック時の処理
   * 【実装方針】: 現段階では最小限のイベント処理（後のGreenフェーズで詳細実装）
   * 【テスト要件対応】: user.click(loginButton)が正常に実行できるよう実装
   * 🟡 信頼性レベル: 最小実装のため詳細なSupabase連携は後で実装予定
   */
  const handleClick = async (): Promise<void> => {
    // 【最小限実装】: テストを通すためのプレースホルダー処理
    // 【将来実装予定】: supabase.auth.signInWithOAuth({ provider: 'google' }) を実装
    console.log('Google認証フローを開始します');
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