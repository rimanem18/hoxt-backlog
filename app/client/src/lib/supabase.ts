/**
 * Supabaseクライアントの共通インスタンス。
 * 環境変数の検証と型安全なクライアント作成を提供する。
 */

import { createClient } from '@supabase/supabase-js';

/**
 * 環境変数を検証し、Supabaseクライアントを作成する
 * @returns 設定済みSupabaseクライアント
 * @throws 環境変数が設定されていない場合はエラーを投げる
 */
export function createSupabaseClient() {
  // 環境変数の型安全な取得と検証
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase環境変数が設定されていません。NEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを確認してください。',
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * アプリケーション全体で使用するSupabaseクライアントインスタンス
 */
export const supabase = createSupabaseClient();
