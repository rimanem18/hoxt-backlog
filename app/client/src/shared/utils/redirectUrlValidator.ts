/**
 * リダイレクト URL の allowlist 検証ユーティリティ。
 * GoogleAuthProvider・EmailPasswordAuthProvider の双方から共有される。
 */

import { parseCommaSeparated } from '@/shared/array';

/**
 * ドメイン文字列を正規化する
 * プロトコル、www、空白、末尾スラッシュを削除し、小文字化する
 *
 * @param domain - 正規化対象のドメイン文字列
 * @returns 正規化されたドメイン文字列
 */
export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

/**
 * 環境変数 `NEXT_PUBLIC_TRUSTED_DOMAINS` から信頼ドメイン集合を構築する
 *
 * @returns 正規化済みの信頼ドメイン集合
 */
export function getTrustedDomains(): Set<string> {
  const rawDomains = parseCommaSeparated(
    process.env.NEXT_PUBLIC_TRUSTED_DOMAINS,
  );
  return new Set(rawDomains.map((domain) => normalizeDomain(domain)));
}

/**
 * リダイレクト URL のセキュリティ検証を行う
 * オープンリダイレクト攻撃を防ぐため、URL のプロトコル・ドメインを厳密にチェックする。
 *
 * @param redirectTo - 検証対象のリダイレクト URL
 * @param trustedDomains - 信頼ドメイン集合（`getTrustedDomains()` で取得）
 * @throws 不正な URL、プロトコル、ドメインの場合
 */
export function validateRedirectUrl(
  redirectTo: string,
  trustedDomains: Set<string>,
): void {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(redirectTo);
  } catch (error) {
    console.error('Invalid URL format detected:', redirectTo, error);
    throw new Error('不正な URL 形式です');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    console.error(
      'Invalid protocol detected:',
      parsedUrl.protocol,
      'for URL:',
      redirectTo,
    );
    throw new Error('許可されていないプロトコルです');
  }

  const redirectHost = parsedUrl.host.toLowerCase();

  const isTrusted = Array.from(trustedDomains).some((trustedDomain) => {
    if (redirectHost === trustedDomain) {
      return true;
    }
    // 正規のサブドメインかチェック（evil.com.trusted.comのような偽装を防ぐ）
    if (redirectHost.endsWith(`.${trustedDomain}`)) {
      return redirectHost.length > trustedDomain.length + 1;
    }
    return false;
  });

  if (!isTrusted) {
    console.error(`Untrusted redirect URL detected: ${redirectTo}`);
    throw new Error('不正なリダイレクト先です');
  }
}
