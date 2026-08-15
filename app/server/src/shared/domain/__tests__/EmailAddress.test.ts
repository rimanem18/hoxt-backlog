/**
 * EmailAddress 値オブジェクトのテスト
 *
 * メールアドレス正規化（trim + 小文字化）の挙動を検証する。
 */

import { describe, expect, test } from 'bun:test';
import { EmailAddress } from '../valueobjects/EmailAddress';

describe('EmailAddress', () => {
  describe('of', () => {
    test('前後の空白を除去して正規化される', () => {
      // Given: 前後に空白を含むメールアドレス
      const raw = '  test@example.com  ';

      // When: EmailAddressを生成
      const emailAddress = EmailAddress.of(raw);

      // Then: 空白が除去された値が保持される
      expect(emailAddress.value).toBe('test@example.com');
    });

    test('大文字を小文字に変換して正規化される', () => {
      // Given: 大文字を含むメールアドレス
      const raw = 'Test.User@Example.COM';

      // When: EmailAddressを生成
      const emailAddress = EmailAddress.of(raw);

      // Then: すべて小文字化された値が保持される
      expect(emailAddress.value).toBe('test.user@example.com');
    });

    test('前後の空白と大文字が混在していても正規化される', () => {
      // Given: 前後の空白と大文字が混在するメールアドレス
      const raw = '  MixedCase@Example.com ';

      // When: EmailAddressを生成
      const emailAddress = EmailAddress.of(raw);

      // Then: trimとtoLowerCaseの両方が適用された値が保持される
      expect(emailAddress.value).toBe('mixedcase@example.com');
    });

    test('既に正規化済みのメールアドレスはそのまま保持される', () => {
      // Given: 既に正規化済みのメールアドレス
      const raw = 'already-normalized@example.com';

      // When: EmailAddressを生成
      const emailAddress = EmailAddress.of(raw);

      // Then: 同じ値が保持される
      expect(emailAddress.value).toBe('already-normalized@example.com');
    });
  });

  describe('equals', () => {
    test('大文字小文字や前後空白が異なっても同一メールアドレスと判定される', () => {
      // Given: 表記揺れのある2つの同一メールアドレス
      const first = EmailAddress.of('  User@Example.com');
      const second = EmailAddress.of('user@example.com  ');

      // When: 等価性を比較
      const result = first.equals(second);

      // Then: 正規化後の値が一致するためtrueを返す
      expect(result).toBe(true);
    });

    test('異なるメールアドレスはequalsでfalseと判定される', () => {
      // Given: 異なる2つのメールアドレス
      const first = EmailAddress.of('user-a@example.com');
      const second = EmailAddress.of('user-b@example.com');

      // When: 等価性を比較
      const result = first.equals(second);

      // Then: falseを返す
      expect(result).toBe(false);
    });
  });
});
