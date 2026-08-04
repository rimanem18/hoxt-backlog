/**
 * shared-schemasをnode_modules配下へ実体コピーするスクリプト
 *
 * bunのfile:依存はシンボリックリンクでリンクされるが、Turbopackは
 * project root外を指すシンボリックリンクを解決できず「Invalid symlink」で
 * 失敗する（Docker Compose環境では`app/packages/shared-schemas`を
 * node_modules配下へ直接bind mountして回避しているが、GitHub Actions等の
 * コンテナを介さない環境ではその回避策が効かない）。
 *
 * 注意: Docker Compose環境ではsourceDirとtargetDirが同一ホストディレクトリを
 * bind mountしているため、postinstallとして自動実行するとrmSyncの時点で
 * コピー元ごと消失する（過去に発生した事故）。そのためCIワークフロー側から
 * 明示的に呼び出す運用とし、package.jsonのpostinstallには登録しない。
 *
 * 実行方法:
 *   bun run sync-shared-schemas（CIワークフローから明示的に実行）
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
