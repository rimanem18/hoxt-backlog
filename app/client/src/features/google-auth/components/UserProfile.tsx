/**
 * 【機能概要】: 認証済みユーザープロフィール表示コンポーネント
 * 【実装方針】: テストケースを通すために必要最小限のユーザー情報表示のみを実装
 * 【テスト対応】: UserProfile.test.tsx のユーザー情報表示・アバターフォールバックテストを通すための実装
 * 🟢 信頼性レベル: 要件REQ-104（認証済みUI表示）・User型定義から直接抽出
 */

'use client'
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { User } from '@/packages/shared-schemas/src/auth';

/**
 * UserProfileコンポーネントのProps型定義
 * 【型定義】: コンポーネントが受け取るユーザー情報のプロパティ
 */
interface UserProfileProps {
  /** 表示対象のユーザー情報 */
  user: User;
}

/**
 * 【ユーザープロフィール表示コンポーネント】: 認証済みユーザー向けの情報表示UI
 * 【実装内容】: ユーザー名・メール・アバター画像・ログアウトボタンの表示
 * 【テスト要件対応】: 各テキスト・画像要素のレンダリングとフォールバック処理
 * 🟢 信頼性レベル: React標準パターン・User型定義・テスト仕様から直接実装
 * @param props - UserProfilePropsオブジェクト
 * @returns {React.ReactNode} - ユーザープロフィール表示要素
 */
export const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  // Project URL と ANON Key から Client を生成
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * 【ログアウトイベントハンドラー】: ログアウトボタンクリック時の処理
   * 【実装方針】: Supabase Auth の signOut を呼び出し、実際のログアウト処理を実行
   * 【テスト要件対応】: role="button"とname="ログアウト"の属性を提供
   * 🟢 信頼性レベル: Supabase公式ドキュメントから実装
   */
  const handleLogout = async (): Promise<void> => {
    // 【ログアウト処理実行】: Supabase Auth でセッション終了
    await supabase.auth.signOut().then(() => {
      console.log('ログアウト成功！');
      // 【将来実装予定】: Redux stateクリア・ページリダイレクト処理
    }).catch((error) => {
      console.error('ログアウト失敗！', error);
    });
  };

  /**
   * 【アバター画像URL決定】: null値に対するフォールバック処理
   * 【実装内容】: avatarUrlがnullの場合にデフォルト画像パスを使用
   * 【テスト要件対応】: UserProfile.test.tsx のアバターフォールバックテストを通すための実装
   * 🟢 信頼性レベル: 要件EDGE-102（アバター画像取得失敗）から直接実装
   */
  const avatarImageSrc = user.avatarUrl || '/default-avatar.png';

  // 【JSX返却】: テストで期待されるユーザー情報表示要素を返却
  // 【テスト要件】: 名前・メール・アバター・ログアウトボタンの表示が必要
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* 【アバター画像表示】: プロフィール画像またはデフォルト画像 */}
      {/* 【フォールバック対応】: avatarUrl null時のデフォルト画像表示 */}
      <img
        src={avatarImageSrc}
        alt="プロフィール画像"
        role="img"
        className="w-16 h-16 rounded-full mx-auto mb-4"
      />

      {/* 【ユーザー名表示】: 認証済みユーザーの名前 */}
      {/* 【テスト要件対応】: screen.getByText("山田太郎") が成功するよう実装 */}
      <h2 className="text-xl font-bold text-center mb-2">
        {user.name}
      </h2>

      {/* 【メールアドレス表示】: 認証済みユーザーのメールアドレス */}
      {/* 【テスト要件対応】: screen.getByText("user@example.com") が成功するよう実装 */}
      <p className="text-gray-600 text-center mb-4">
        {user.email}
      </p>

      {/* 【ログアウトボタン】: 認証解除機能へのアクセス */}
      {/* 【テスト要件対応】: role="button"とname="ログアウト"の属性を提供 */}
      <button
        type="button"
        role="button"
        onClick={handleLogout}
        className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        ログアウト
      </button>
    </div>
  );
};
