import { mock } from 'bun:test';
import type { Context } from 'hono';

/**
 * テスト用のモックContextを生成するヘルパー関数
 *
 * Honoの複雑な型定義を回避し、テストコードの可読性を向上させる
 *
 * @param headers - HTTPヘッダー（Key-Valueペア）
 * @param contextVars - Context変数（c.get()で取得可能な値）
 * @returns モック化されたHonoコンテキスト
 *
 * @example
 * ```typescript
 * const mockContext = createMockContext({
 *   'Authorization': 'Bearer valid-token'
 * });
 * ```
 */
export function createMockContext(
  headers: Record<string, string> = {},
  contextVars: Record<string, unknown> = {},
): Context {
  return {
    req: {
      // biome-ignore lint/suspicious/noExplicitAny: Honoのheader関数の複雑なオーバーロード型をモックするため
      header: (name?: string) => {
        if (!name) return {};
        return headers[name];
      },
    } as any,
    json: mock((data: unknown, status: number) => {
      return new Response(JSON.stringify(data), { status });
    }),
    set: mock((key: string, value: unknown) => {
      contextVars[key] = value;
    }),
    get: mock((key: string) => contextVars[key]),
  } as unknown as Context;
}
