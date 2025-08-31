/**
 * 認証済みユーザーのプロフィール情報を表示し、ログアウト機能を提供するコンポーネント。
 * ユーザーのアバター画像、名前、メールアドレスを表示し、ログアウトボタンを含む。
 * 
 * @example
 * ```tsx
 * <UserProfile user={authenticatedUser} />
 * ```
 */

'use client'
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { User } from '@/packages/shared-schemas/src/auth';

/**
 * UserProfileコンポーネントのProps型定義
 */
interface UserProfileProps {
  /** 表示対象のユーザー情報 */
  user: User;
}

/**
 * ユーザープロフィール表示コンポーネント
 * 
 * @param props - UserProfilePropsオブジェクト
 * @returns {React.ReactNode} ユーザープロフィール表示要素
 */
export const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * ログアウト処理
   * 
   * @returns {Promise<void>} ログアウト処理の完了
   */
  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut().then(() => {
      console.log('ログアウト成功！');
    }).catch((error) => {
      console.error('ログアウト失敗！', error);
    });
  };

  // アバターURLが存在しない場合のデフォルト画像を設定
  const avatarImageSrc = user.avatarUrl || '/default-avatar.png';

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* アバター画像表示 */}
      <img
        src={avatarImageSrc}
        alt="プロフィール画像"
        role="img"
        className="w-16 h-16 rounded-full mx-auto mb-4"
      />

      {/* ユーザー名表示 */}
      <h2 className="text-xl font-bold text-center mb-2">
        {user.name}
      </h2>

      {/* メールアドレス表示 */}
      <p className="text-gray-600 text-center mb-4">
        {user.email}
      </p>

      {/* ログアウトボタン */}
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