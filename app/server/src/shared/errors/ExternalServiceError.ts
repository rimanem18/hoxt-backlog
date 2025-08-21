/**
 * 外部サービスエラー
 *
 * Supabase等の外部サービス接続エラー
 */
export class ExternalServiceError extends Error {
  readonly code = 'EXTERNAL_SERVICE_ERROR';

  constructor(message: string = '外部サービスエラーが発生しました') {
    super(message);
    this.name = 'ExternalServiceError';
  }
}
