/**
 * レスポンスバリデーションミドルウェア
 *
 * 開発環境でのみZodバリデーションを実行し、型安全性を保証する。
 * 本番環境ではパフォーマンス優先のためバリデーションをスキップする。
 * バリデーション失敗時は詳細をログ記録し、クライアントには安全なエラーのみ返却する。
 */

import type { MiddlewareHandler } from 'hono';
import type { z } from 'zod';
import type { Logger } from '@/shared/logging/Logger';

/**
 * レスポンスバリデーションミドルウェアを作成する
 *
 * 環境判定により本番環境ではバリデーションをスキップする。
 * 開発環境では実行時型安全性を保証し、バリデーション失敗時は詳細をログ記録する。
 * ファクトリーパターンでスキーマとLoggerを注入し、テスタビリティを確保する。
 *
 * @param responseSchema - レスポンス検証用のZodスキーマ（未定義の場合はバリデーションスキップ）
 * @param logger - ログ出力インターフェース
 * @returns Hono MiddlewareHandler関数
 */
export const createResponseValidationMiddleware = (
  responseSchema: z.ZodTypeAny | undefined,
  logger: Logger,
): MiddlewareHandler => {
  return async (c, next) => {
    // 本番環境ではバリデーションをスキップ（パフォーマンス優先）
    if (process.env.NODE_ENV === 'production') {
      await next();
      return;
    }

    // スキーマ未定義の場合はバリデーションをスキップ（警告ログ出力）
    if (!responseSchema) {
      logger.warn('Response schema not defined', {
        endpoint: c.req.path,
        method: c.req.method,
      });
      await next();
      return;
    }

    // 次のミドルウェア/ハンドラーを実行
    await next();

    // c.res.clone()を使用してストリームをコピーし、再読み取り可能にする
    try {
      const responseClone = c.res.clone();
      const responseData = await responseClone.json();

      // Zodスキーマでレスポンスデータを検証
      const result = responseSchema.safeParse(responseData);

      // バリデーション失敗時は詳細をログ記録し、安全なエラーレスポンスを返却
      if (!result.success) {
        logger.error('Response validation failed', {
          error: {
            issues: result.error.issues,
            name: result.error.name,
          },
          endpoint: c.req.path,
          method: c.req.method,
          timestamp: new Date().toISOString(),
        });

        // Honoの標準パターンに従い、c.json()でエラーレスポンスを返却
        // ErrorHandlerMiddlewareと整合性を保つため、INTERNAL_SERVER_ERRORを使用
        c.res = c.json(
          {
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: '一時的にサービスが利用できません',
            },
          },
          500,
        );
      }

      // バリデーション成功時は元のレスポンスをそのまま返す
    } catch (_error) {
      // レスポンスがJSON形式でない場合の対応
      const contentType = c.res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        // JSONを期待しているのに解析失敗した場合は警告ログを記録
        logger.warn('Response is malformed JSON', {
          endpoint: c.req.path,
          contentType,
        });
      } else {
        // HTML、画像等のJSON以外のレスポンスはバリデーション対象外
        logger.debug('Response is not JSON, skipping validation', {
          endpoint: c.req.path,
          contentType,
        });
      }
    }
  };
};
