import { UserDomainError } from './UserDomainError';

/**
 * Supabase サインアップ失敗エラー
 *
 * SupabaseAdminClient.signUp がエラーを返した場合に throw する。
 * ユーザー向けメッセージは固定し、内部原因は causeMessage に保持する。
 */
export class SignupFailedError extends UserDomainError {
  readonly code = 'SIGNUP_FAILED' as const;

  /** 内部原因（ログ用）。API レスポンスには含めない */
  readonly causeMessage: string | undefined;

  constructor(causeMessage?: string) {
    super('サインアップに失敗しました。');
    this.causeMessage = causeMessage;
  }
}
