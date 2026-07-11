import { describe, expect, test } from 'bun:test';
import { AuthApiError } from '@supabase/supabase-js';
import { handleEmailPasswordError } from '../services/emailPasswordErrorHandler';

describe('handleEmailPasswordError', () => {
  describe('サインイン失敗（REQ-301, NFR-101）', () => {
    test('code が invalid_grant のとき認証失敗メッセージを返す', () => {
      // Given: invalid_grant コードを持つ AuthApiError
      const error = new AuthApiError('Invalid grant', 400, 'invalid_grant');

      // When & Then: 原因を区別しない統一メッセージを返す（NFR-101 列挙攻撃対策）
      expect(handleEmailPasswordError(error)).toBe(
        'メールアドレスまたはパスワードが間違っています',
      );
    });

    test('message に Invalid login credentials を含む AuthApiError のとき認証失敗メッセージを返す', () => {
      // Given: message に "Invalid login credentials" を含む AuthApiError
      const error = new AuthApiError(
        'Invalid login credentials',
        401,
        'some_code',
      );

      // When & Then: コードではなくメッセージでも判定する
      expect(handleEmailPasswordError(error)).toBe(
        'メールアドレスまたはパスワードが間違っています',
      );
    });

    test('code が invalid_grant かつ message に Invalid login credentials を含む場合でも同一メッセージを返す', () => {
      // Given: 両方が一致するケース
      const error = new AuthApiError(
        'Invalid login credentials',
        400,
        'invalid_grant',
      );

      // When & Then: 重複なく単一のメッセージが返る
      expect(handleEmailPasswordError(error)).toBe(
        'メールアドレスまたはパスワードが間違っています',
      );
    });
  });

  describe('メール未確認（REQ-303）', () => {
    test('code が email_not_confirmed のとき確認要求メッセージを返す', () => {
      // Given: email_not_confirmed コードを持つ AuthApiError
      const error = new AuthApiError(
        'Email not confirmed',
        400,
        'email_not_confirmed',
      );

      // When & Then
      expect(handleEmailPasswordError(error)).toBe(
        'メールアドレスの確認が必要です。受信したメール内のリンクから確認を完了してください',
      );
    });
  });

  describe('レート制限', () => {
    test('code が over_email_send_rate_limit のときレート制限メッセージを返す', () => {
      // Given: over_email_send_rate_limit コードを持つ AuthApiError
      const error = new AuthApiError(
        'Over email send rate limit',
        429,
        'over_email_send_rate_limit',
      );

      // When & Then
      expect(handleEmailPasswordError(error)).toBe(
        'リクエストが多すぎます。しばらくしてから再度お試しください',
      );
    });
  });

  describe('リセットリンク無効（REQ-305）', () => {
    test('code が otp_expired のときリンク無効メッセージを返す', () => {
      // Given: otp_expired コードを持つ AuthApiError
      const error = new AuthApiError('OTP expired', 400, 'otp_expired');

      // When & Then
      expect(handleEmailPasswordError(error)).toBe(
        'リンクが無効か期限切れです。再度パスワードリセットを要求してください',
      );
    });
  });

  describe('未知のエラー・汎用ケース', () => {
    test('未知のエラーコードを持つ AuthApiError のとき汎用エラーメッセージを返す', () => {
      // Given: 未定義コードの AuthApiError
      const error = new AuthApiError('Some unknown error', 500, 'unknown_code');

      // When & Then
      expect(handleEmailPasswordError(error)).toBe(
        '認証に失敗しました。しばらく待ってから再度お試しください',
      );
    });

    test('AuthApiError 以外の Error のとき汎用エラーメッセージを返す', () => {
      // Given: 通常の Error
      const error = new Error('Something went wrong');

      // When & Then
      expect(handleEmailPasswordError(error)).toBe(
        '認証に失敗しました。しばらく待ってから再度お試しください',
      );
    });

    test('null のとき汎用エラーメッセージを返す', () => {
      // When & Then
      expect(handleEmailPasswordError(null)).toBe(
        '認証に失敗しました。しばらく待ってから再度お試しください',
      );
    });

    test('undefined のとき汎用エラーメッセージを返す', () => {
      // When & Then
      expect(handleEmailPasswordError(undefined)).toBe(
        '認証に失敗しました。しばらく待ってから再度お試しください',
      );
    });
  });
});
