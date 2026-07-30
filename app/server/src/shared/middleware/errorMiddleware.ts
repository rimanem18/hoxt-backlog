import type { Context, Next } from 'hono';
import { InvalidTaskDataError, TaskNotFoundError } from '@/task/domain/errors';

type ErrorMapping = {
  statusCode: 400 | 404 | 500;
  errorCode: string;
};

// biome-ignore lint/suspicious/noExplicitAny: エラークラスのコンストラクタを汎用化するため
type AnyErrorConstructor = new (...args: any[]) => Error;

const ERROR_MAPPINGS: Array<{
  errorClass: AnyErrorConstructor;
  mapping: ErrorMapping;
}> = [
  {
    errorClass: TaskNotFoundError,
    mapping: { statusCode: 404, errorCode: 'NOT_FOUND' },
  },
  {
    errorClass: InvalidTaskDataError,
    mapping: { statusCode: 400, errorCode: 'VALIDATION_ERROR' },
  },
];

/**
 * エラーハンドリングミドルウェア
 *
 * リクエスト処理中に発生したエラーを適切なHTTPステータスコードと
 * JSONレスポンスに変換してクライアントに返却する。
 *
 * @param c - Honoコンテキスト
 * @param next - 次のミドルウェア/ハンドラー
 * @returns エラー発生時はResponseオブジェクト、正常時はundefined
 */
export async function errorMiddleware(
  c: Context,
  next: Next,
): Promise<Response | undefined> {
  try {
    await next();
  } catch (error) {
    console.error('Unexpected error:', error);

    for (const { errorClass, mapping } of ERROR_MAPPINGS) {
      if (error instanceof errorClass) {
        return c.json(
          {
            success: false,
            error: {
              code: mapping.errorCode,
              message: (error as Error).message,
            },
          },
          mapping.statusCode,
        );
      }
    }

    // その他のエラー → 500
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      },
      500,
    );
  }
}
