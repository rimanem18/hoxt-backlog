import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

interface NavigationMarkerWindow extends Window {
  __e2eNavigationMarker?: boolean;
}

async function markNavigationState(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as NavigationMarkerWindow).__e2eNavigationMarker = true;
  });
}

async function hasNavigationMarker(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as NavigationMarkerWindow).__e2eNavigationMarker === true,
  );
}

/**
 * リンククリック後、フルページ遷移が発生していないことを検証する。
 * クリック前にwindowへマーカーを設定し、フルページ遷移でJS実行コンテキストが
 * 破棄されればマーカーが消え、クライアントサイド遷移なら残存する性質を利用する。
 */
export async function expectClientSideNavigation(
  page: Page,
  link: Locator,
  expectedUrl: RegExp,
): Promise<void> {
  await markNavigationState(page);
  await link.click();
  await expect(page).toHaveURL(expectedUrl);
  await expect.poll(() => hasNavigationMarker(page)).toBe(true);
}
