/**
 * shared-schemasをnode_modules配下へ実体コピーするスクリプト
 *
 * bunのfile:依存はシンボリックリンクでリンクされるが、Turbopackは
 * project root外を指すシンボリックリンクを解決できず「Invalid symlink」で
 * 失敗する（Docker Compose環境ではbind mountで回避しているが、
 * GitHub Actions等のコンテナを介さない環境ではその回避策が効かない）。
 * そのため`bun install`のpostinstallとして実体コピーに置き換え、
 * 環境を問わず解決できるようにする。
 *
 * 実行方法:
 *   bun run scripts/sync-shared-schemas.ts（postinstallから自動実行）
 */

import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const sourceDir = join(import.meta.dir, '../../packages/shared-schemas');
const targetDir = join(import.meta.dir, '../node_modules/@hoxt-backlog/shared-schemas');

if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true, force: true });
}

cpSync(sourceDir, targetDir, {
  recursive: true,
  filter: (src) => !/node_modules|__tests__/.test(src),
});
