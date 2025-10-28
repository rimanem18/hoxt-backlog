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
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '@/features/auth/store/authSlice';
import { supabase } from '@/lib/supabase';
import type { User } from '@/packages/shared-schemas/src/auth';

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
   * 【パフォーマンス最適化】: ログアウト処理のメモ化
   * Supabaseからのログアウトと、Reduxストアの状態更新を行う
   *
   * @returns {Promise<void>} ログアウト処理の完了
   */
  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      // 【Refactor改善】: ローディング状態の表示
      console.log('ログアウト処理を開始...');

      // Supabaseからログアウト
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Supabaseログアウト失敗:', error);
        // 【セキュリティ改善】: サーバーエラーでもローカル状態は必ずクリア
        dispatch(logout());
        return;
      }

      // Redux状態をログアウト状態に更新
      dispatch(logout());
      console.log('ログアウト成功！');

      // 【セキュリティ改善】: ログアウト後にホームページにリダイレクト
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('ログアウト処理エラー:', error);
      // 【フォールバック】: エラーが発生してもローカル認証状態はクリア
      dispatch(logout());
    }
  }, [dispatch]);

  // 【パフォーマンス最適化】: アバター画像URLのメモ化
  const avatarImageSrc = useMemo(
    () => user.avatarUrl || '/default-avatar.png',
    [user.avatarUrl],
  );

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

      {/* 【Refactor追加】: lastLoginAt情報の表示 */}
      {user.lastLoginAt && (
        <p
          className="text-gray-500 text-center text-sm mb-4"
          data-testarea="last-login-info"
        >
          最終ログイン: {new Date(user.lastLoginAt).toLocaleString('ja-JP')}
        </p>
      )}

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
