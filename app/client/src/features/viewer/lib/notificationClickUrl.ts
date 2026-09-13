/**
 * Web Push通知クリック時のURL組み立てユーティリティ
 */

/**
 * Web Push通知クリック時の遷移URLを構築する
 *
 * @param token - 認証トークン
 * @param taskId - タスクID（オプション）
 * @returns 構築されたURL
 */
export function buildNotificationClickUrl(
  token: string,
  taskId?: string,
): string {
  const baseUrl = `/viewer/${token}`;

  if (!taskId) {
    return baseUrl;
  }

  return `${baseUrl}?taskId=${encodeURIComponent(taskId)}`;
}
