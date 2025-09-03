/**
 * 認証済みユーザーのプロフィール情報を表示し、ログアウト機能を提供するコンポーネント。
 * ユーザーのアバター画像、名前、メールアドレスを表示し、ログアウトボタンを含む。
 *
 * @example
 * ```tsx
 * <UserProfile user={authenticatedUser} />
 * ```
 */

'use client';
import Image from 'next/image';
import type React from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '@/lib/supabase';
import type { User } from '@/packages/shared-schemas/src/auth';
import { logout } from '../store/authSlice';

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
  const dispatch = useDispatch();

  /**
   * ログアウト処理
   * Supabaseからのログアウトと、Reduxストアの状態更新を行う
   *
   * @returns {Promise<void>} ログアウト処理の完了
   */
  const handleLogout = async (): Promise<void> => {
    try {
      // Supabaseからログアウト
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Supabaseログアウト失敗:', error);
        return;
      }

      // Redux状態をログアウト状態に更新
      dispatch(logout());
      console.log('ログアウト成功！');
    } catch (error) {
      console.error('ログアウト処理エラー:', error);
    }
  };

  // アバターURLが存在しない場合のデフォルト画像を設定
  const avatarImageSrc = user.avatarUrl || '/default-avatar.png';

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* アバター画像表示 */}
      <Image
        src={avatarImageSrc}
        alt="プロフィール画像"
        width={64}
        height={64}
        className="rounded-full mx-auto mb-4"
        priority
      />

      {/* ユーザー名表示 */}
      <h2 className="text-xl font-bold text-center mb-2">{user.name}</h2>

      {/* メールアドレス表示 */}
      <p className="text-gray-600 text-center mb-4">{user.email}</p>

      {/* ログアウトボタン */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        ログアウト
      </button>
    </div>
  );
};
