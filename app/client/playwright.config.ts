import { defineConfig, devices } from '@playwright/test';

/**
 * PlaywrightのE2Eテスト設定ファイル
 * Docker Compose環境でのテスト実行に最適化された設定
 */
export default defineConfig({
  testDir: './e2e',
  // 各テストの最大実行時間（30秒）
  timeout: 30 * 1000,
  // expect()の最大待機時間（5秒）
  expect: {
    timeout: 5000,
  },
  // テスト実行の並行性を制御（安定性を重視し並行実行を制限）
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // レポート形式の設定
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list']
  ],
  use: {
    // ベースURL（Docker Compose環境のNext.jsアプリケーション）
    baseURL: 'http://client:3000',
    // トレース記録の設定（失敗時のみ）
    trace: 'on-first-retry',
    // スクリーンショット設定（失敗時のみ）
    screenshot: 'only-on-failure',
    // 動画録画設定（失敗時のみ）
    video: 'retain-on-failure',
  },
  // プロジェクト設定（複数ブラウザ対応）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Safari対応（必要に応じてコメントアウト解除）
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  // テスト実行前にローカルサーバーを起動（Docker Compose環境では不要）
  // webServer: {
  //   command: 'bun run dev',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});