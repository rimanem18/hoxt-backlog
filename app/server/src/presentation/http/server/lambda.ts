/**
 * AWS Lambda エントリーポイント
 * Hono アプリケーションを AWS Lambda で実行するための設定
 */
import { handle } from 'hono/aws-lambda';
import app from './index';

/**
 * Lambda ハンドラー
 * API Gateway v2 (HTTP API) からのリクエストを処理
 */
export const handler = handle(app);