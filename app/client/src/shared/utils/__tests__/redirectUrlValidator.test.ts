import { describe, expect, test } from 'bun:test';
import { validateRedirectUrl } from '../redirectUrlValidator';

describe('validateRedirectUrl', () => {
  const trustedDomains = new Set(['localhost:3000', 'example.com']);

  test('信頼ドメインの https URL は許可される', () => {
    // Given: 信頼ドメイン一覧に含まれる URL
    const redirectTo = 'https://example.com/auth/callback';

    // When & Then: 例外が発生しない
    expect(() => validateRedirectUrl(redirectTo, trustedDomains)).not.toThrow();
  });

  test('信頼ドメインの正規のサブドメインは許可される', () => {
    // Given: 信頼ドメインの正規サブドメイン
    const redirectTo = 'https://app.example.com/auth/callback';

    // When & Then: 例外が発生しない
    expect(() => validateRedirectUrl(redirectTo, trustedDomains)).not.toThrow();
  });

  test('信頼ドメインに偽装したドメイン（evil-example.com）は拒否される', () => {
    // Given: 信頼ドメインに文字列として似ているが異なるドメイン
    const redirectTo = 'https://evil-example.com/auth/callback';

    // When & Then: 不正なリダイレクト先として拒否される
    expect(() => validateRedirectUrl(redirectTo, trustedDomains)).toThrow(
      '不正なリダイレクト先です',
    );
  });

  test('信頼ドメインを装った偽装ドメイン（example.com.evil.com）は拒否される', () => {
    // Given: 信頼ドメインを前方に含む偽装ドメイン
    const redirectTo = 'https://example.com.evil.com/auth/callback';

    // When & Then: 不正なリダイレクト先として拒否される
    expect(() => validateRedirectUrl(redirectTo, trustedDomains)).toThrow(
      '不正なリダイレクト先です',
    );
  });

  test('空文字列の URL は拒否される', () => {
    // Given: 空文字列
    const redirectTo = '';

    // When & Then: 不正な URL 形式として拒否される
    expect(() => validateRedirectUrl(redirectTo, trustedDomains)).toThrow(
      '不正な URL 形式です',
    );
  });

  test('相対 URL は拒否される', () => {
    // Given: プロトコル・ホストを持たない相対 URL
    const redirectTo = '/auth/reset-password';

    // When & Then: 不正な URL 形式として拒否される
    expect(() => validateRedirectUrl(redirectTo, trustedDomains)).toThrow(
      '不正な URL 形式です',
    );
  });

  test('javascript: スキームは拒否される', () => {
    // Given: javascript: スキームの URL
    const redirectTo = 'javascript:alert(1)';

    // When & Then: 許可されていないプロトコルとして拒否される
    expect(() => validateRedirectUrl(redirectTo, trustedDomains)).toThrow(
      '許可されていないプロトコルです',
    );
  });

  test('data: スキームは拒否される', () => {
    // Given: data: スキームの URL
    const redirectTo = 'data:text/html,<script>alert(1)</script>';

    // When & Then: 許可されていないプロトコルとして拒否される
    expect(() => validateRedirectUrl(redirectTo, trustedDomains)).toThrow(
      '許可されていないプロトコルです',
    );
  });

  test('大文字ホストは小文字正規化されて信頼ドメインと一致する', () => {
    // Given: 大文字を含む信頼ドメインの URL
    const redirectTo = 'https://EXAMPLE.COM/auth/callback';

    // When & Then: 例外が発生しない（ケースインセンシティブ照合）
    expect(() => validateRedirectUrl(redirectTo, trustedDomains)).not.toThrow();
  });

  test('信頼ドメイン集合が空の場合はすべての URL が拒否される', () => {
    // Given: 空の信頼ドメイン集合
    const emptyTrustedDomains = new Set<string>();
    const redirectTo = 'https://example.com/auth/callback';

    // When & Then: 不正なリダイレクト先として拒否される
    expect(() => validateRedirectUrl(redirectTo, emptyTrustedDomains)).toThrow(
      '不正なリダイレクト先です',
    );
  });

  test('信頼ドメインと異なるポート番号の URL は拒否される', () => {
    // Given: 信頼ドメインのホスト名だがポート番号が異なる URL
    const redirectTo = 'https://localhost:4000/auth/callback';

    // When & Then: 不正なリダイレクト先として拒否される
    expect(() => validateRedirectUrl(redirectTo, trustedDomains)).toThrow(
      '不正なリダイレクト先です',
    );
  });
});
