import { SERVER_BASE_URL } from './constants';

export interface InvitationRecord {
  recipient: string;
  projectName: string;
  accessUrl: string;
  sentAt: string;
}

/**
 * 直近の招待メール送信内容（生トークンを含むアクセスURL）を取得する。
 * テスト専用エンドポイント（`isTestEndpointsEnabled()`時のみ有効）をe2eコンテナから
 * サービス名で直接呼び出す。
 */
export async function getLatestInvitation(
  recipient: string,
): Promise<InvitationRecord> {
  const res = await fetch(
    `${SERVER_BASE_URL}/api/__test__/invitations?recipient=${encodeURIComponent(recipient)}`,
  );

  if (!res.ok) {
    throw new Error(
      `招待メールの送信内容取得に失敗しました: ${res.status} ${await res.text()}`,
    );
  }

  const body = (await res.json()) as { data: InvitationRecord };
  return body.data;
}

/**
 * 招待メールのアクセスURLから生トークンを取り出す。
 * URLパス末尾のセグメントがトークンである前提（`/viewer/{token}`）。
 */
export function extractTokenFromAccessUrl(accessUrl: string): string {
  const segments = new URL(accessUrl).pathname.split('/').filter(Boolean);
  const token = segments[segments.length - 1];
  if (!token) {
    throw new Error(`アクセスURLからトークンを抽出できません: ${accessUrl}`);
  }
  return token;
}

/**
 * 任意の有効期限を指定してviewerアクセストークンを直接発行する（期限切れ状態の再現用）。
 * テスト専用エンドポイント（`isTestEndpointsEnabled()`時のみ有効）を使う。
 */
export async function issueViewerAccessToken(
  email: string,
  expiresAt: Date,
): Promise<string> {
  const res = await fetch(`${SERVER_BASE_URL}/api/__test__/viewer-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, expiresAt: expiresAt.toISOString() }),
  });

  if (!res.ok) {
    throw new Error(
      `viewerアクセストークンの発行に失敗しました: ${res.status} ${await res.text()}`,
    );
  }

  const body = (await res.json()) as { data: { rawToken: string } };
  return body.data.rawToken;
}
