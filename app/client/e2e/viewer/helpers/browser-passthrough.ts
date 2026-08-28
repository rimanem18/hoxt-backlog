import type { Page } from '@playwright/test';
import { BROWSER_API_BASE_URL, SERVER_BASE_URL } from './constants';

/**
 * ブラウザが送信する`localhost:3001`宛リクエストをserverコンテナへ書き換えて中継する。
 * Docker Composeのコンテナ間通信はサービス名で行う必要があるため
 * （knowledge/e2e/e2e-container-cannot-reach-server-via-localhost.md）。
 */
export async function setupRealBackendPassthrough(page: Page): Promise<void> {
  await page.route(`${BROWSER_API_BASE_URL}/**`, async (route) => {
    const url = route
      .request()
      .url()
      .replace(BROWSER_API_BASE_URL, SERVER_BASE_URL);
    const response = await route.fetch({ url });
    await route.fulfill({ response });
  });
}
