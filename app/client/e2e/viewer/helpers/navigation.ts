import { expect, type Page } from '@playwright/test';

/**
 * project詳細画面（実バックエンド）を開き、表示完了（成功時の詳細表示・
 * 404時のエラー表示のいずれか）を待つ。project/project-setup.tsの
 * `openProjectDetailPage`と同じ待機方針を実バックエンド向けに踏襲する。
 */
export async function openRealProjectDetailPage(
  page: Page,
  projectId: string,
): Promise<void> {
  await page.goto(`/dashboard/projects/${projectId}`);
  await expect(page.getByText('読み込み中...')).toHaveCount(0, {
    timeout: 15000,
  });
}
