import { isAuthApiError } from '@supabase/supabase-js';

const DEFAULT_MESSAGE =
  '認証に失敗しました。しばらく待ってから再度お試しください';

export const INVALID_RESET_LINK_MESSAGE =
  'リンクが無効か期限切れです。再度パスワードリセットを要求してください';

export function handleEmailPasswordError(error: unknown): string {
  if (!isAuthApiError(error)) {
    return DEFAULT_MESSAGE;
  }

  if (
    error.code === 'invalid_grant' ||
    error.message.includes('Invalid login credentials')
  ) {
    return 'メールアドレスまたはパスワードが間違っています';
  }

  if (error.code === 'email_not_confirmed') {
    return 'メールアドレスの確認が必要です。受信したメール内のリンクから確認を完了してください';
  }

  if (error.code === 'over_email_send_rate_limit') {
    return 'リクエストが多すぎます。しばらくしてから再度お試しください';
  }

  if (error.code === 'otp_expired') {
    return INVALID_RESET_LINK_MESSAGE;
  }

  return DEFAULT_MESSAGE;
}
