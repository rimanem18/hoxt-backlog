/**
 * クライアント側の必須環境変数を検証する
 *
 * Provider初期化時に呼び出され、必要な環境変数がすべて設定されているかを確認する。
 * テスト環境では検証をスキップする。
 *
 * @remarks
 * Next.jsの静的生成時やSSR時の実行タイミングを考慮し、
 * エラー時は例外をスローせずconsole.errorで警告を出力する。
 */
export function validateClientEnv(): void {
  // テスト環境では検証をスキップ
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SITE_URL',
  ];

  const missing = required.filter(
    (key) => !process.env[key] || process.env[key]?.trim() === '',
  );

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}
