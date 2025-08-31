/**
 * Google OAuth認証を開始するログインボタンコンポーネント。
 * Supabase Auth経由でGoogle認証フローを実行し、認証成功後にリダイレクトを行う。
 * 
 * @example
 * ```tsx
 * <GoogleLoginButton />
 * ```
 */
'use client'
import React from 'react';
import { createClient } from '@supabase/supabase-js'

/**
 * Googleログインボタンコンポーネント
 * 
 * @returns {React.ReactNode} Googleログインボタン要素
 */
export const GoogleLoginButton: React.FC = () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  /**
   * Googleログイン開始処理
   * 
   * @returns {Promise<void>} 認証処理の完了
   */
  const handleClick = async (): Promise<void> => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // フォールバック先として現在のオリジンを使用
          redirectTo: process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
        }
      });
      
      console.log('認証成功！');
    } catch (error) {
      console.error('認証失敗！', error);
    }
  };

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