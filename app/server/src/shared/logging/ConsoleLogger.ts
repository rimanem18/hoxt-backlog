import type { Logger } from '@/shared/logging/Logger';

/** createConsoleLogger のオプション */
export interface ConsoleLoggerOptions {
  /** ログ出力に含めるサービス識別子（例: 'HEALTH'） */
  service?: string;
}

/**
 * 構造化ログ（JSON）を console 出力する Logger 実装を生成する。
 *
 * @example
 * ```typescript
 * const logger = createConsoleLogger({ service: 'HEALTH' });
 * logger.info('started');
 * ```
 */
export function createConsoleLogger(
  options: ConsoleLoggerOptions = {},
): Logger {
  const { service } = options;

  return {
    info: (message: string, meta?: unknown) => {
      const logData = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        ...(service ? { service } : {}),
        message,
        meta,
      };
      console.log(JSON.stringify(logData));
    },
    warn: (message: string, meta?: unknown) => {
      const logData = {
        timestamp: new Date().toISOString(),
        level: 'WARN',
        ...(service ? { service } : {}),
        message,
        meta,
      };
      console.warn(JSON.stringify(logData));
    },
    error: (message: string, meta?: unknown) => {
      const logData = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        ...(service ? { service } : {}),
        message,
        meta,
      };
      console.error(JSON.stringify(logData));
    },
    debug: (message: string, meta?: unknown) => {
      if (process.env.NODE_ENV !== 'production') {
        const logData = {
          timestamp: new Date().toISOString(),
          level: 'DEBUG',
          ...(service ? { service } : {}),
          message,
          meta,
        };
        console.debug(JSON.stringify(logData));
      }
    },
  };
}
