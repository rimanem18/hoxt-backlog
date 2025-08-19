/**
 * インフラストラクチャエラー
 *
 * データベース接続エラーやその他のインフラストラクチャ層のエラー
 */
export class InfrastructureError extends Error {
  readonly code = 'INFRASTRUCTURE_ERROR';

  constructor(message: string = 'インフラストラクチャエラーが発生しました') {
    super(message);
    this.name = 'InfrastructureError';
  }
}
