import { expect, type Page } from '@playwright/test';

export async function expectDashboard(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'ダッシュボード' }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/dashboard/);
}
