import { z } from 'zod';

/**
 * ログインフォームのメールアドレス必須入力チェックスキーマ
 *
 * 資格情報自体の妥当性検証はSupabase Authに委譲するため、未入力チェックのみ行う。
 */
export const loginEmailRequiredSchema = z.object({
  email: z.string().min(1, 'メールアドレスを入力してください'),
});

/**
 * メールアドレス形式チェックスキーマ
 *
 * サインアップ・パスワードリセット要求フォームで共有する。
 */
export const emailFormatSchema = z.object({
  email: z.email('メールアドレスの形式が正しくありません'),
});
