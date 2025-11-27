ここよりも下に記載

---

## 🚨 Phase 4着手前の緊急リファクタリング対応（2025-11-26）


### 事前確認

まずは以下を確認します。

- `docs/spec/todo-app-*.md`
- `docs/design/todo-app/*`
- `docs/tasks/todo-app-overview.md`
- `docs/tasks/todo-app-phase4.md`

### 📌 背景

`@docs/tasks/todo-app-phase4.md` のタスクファイル作成時に、既存実装（`drizzle-client.ts`, `connection.ts`）との齟齬が判明。
当初計画の `DatabaseConnection.ts` 設計意図を再検証した結果、Phase 4着手前に基盤整備が必要と判断。

### 🎯 目的

1. **設計意図の実現**: 当初計画の `DatabaseConnection` をDB管理の単一窓口として実装
2. **技術的負債の解消**: `drizzle-client.ts` と `connection.ts` の二重管理を終了
3. **Phase 4の円滑な着手**: 整理された基盤の上でタスクリポジトリを実装

### 📋 リファクタリング手順

#### Step 1: DatabaseConnection 実装（新規作成）

**ファイル**: `app/server/src/infrastructure/database/DatabaseConnection.ts`

- [ ] 既存 `drizzle-client.ts` の内容をベースに新規ファイル作成
- [ ] モジュールスコープでの実装（クラスベースから関数エクスポートへ）
  - [ ] `export const db = drizzle(queryClient, { schema });`
  - [ ] シングルトンパターンはNode.jsモジュールキャッシュに依存
- [ ] RLS設定ヘルパーを追加
  - [ ] `export async function setCurrentUser(userId: string): Promise<void>`
  - [ ] `export async function clearCurrentUser(): Promise<void>`
- [ ] トランザクションヘルパーを追加
  - [ ] `export async function executeTransaction<T>(fn): Promise<T>`
- [ ] 接続終了ヘルパーを追加
  - [ ] `export async function closeConnection(): Promise<void>`
- [ ] テストコード作成
  - [ ] ファイル: `__tests__/DatabaseConnection.test.ts`
  - [ ] シングルトンパターンのテスト（モジュールキャッシュ確認）
  - [ ] RLS設定のテスト
  - [ ] トランザクションのテスト
- [ ] テストカバレッジ80%以上達成

#### Step 2: 既存コードの移行

- [ ] `PostgreSQLUserRepository.ts` の import を更新
  - 変更前: `import { db } from './drizzle-client'`
  - 変更後: `import { db } from './DatabaseConnection'`
- [ ] `HealthCheckService.ts` の import を更新
  - 変更前: `import { db } from '@/infrastructure/database/drizzle-client'`
  - 変更後: `import { db } from '@/infrastructure/database/DatabaseConnection'`
- [ ] テストファイルの import を更新
  - [ ] `PostgreSQLUserRepository.test.ts`
  - [ ] その他、`drizzle-client` をimportしているファイル
- [ ] 型チェック実行: `docker compose exec server bunx tsc --noEmit`
- [ ] 全テスト実行: `docker compose exec server bun test`

#### Step 3: 旧ファイルの削除

- [ ] `drizzle-client.ts` を削除
- [ ] 削除後に型チェック・テスト実行して問題ないことを確認

#### Step 4: Phase 4タスクファイルの更新

- [ ] `docs/tasks/todo-app-phase4.md` を更新
  - [ ] TASK-1317: 「DatabaseConnection実装」→「完了済み」としてマーク、または内容を調整
  - [ ] TASK-1321: 「RLS設定ヘルパー実装」→「統合テスト」に変更（RLS機能は完了済み）
- [ ] `docs/design/todo-app/architecture.md` を更新
  - [ ] Infrastructure層に `DatabaseConnection` の責務を明記

#### Step 5: connection.ts の段階的廃止（Phase 5以降に延期可能）

- [ ] `connection.ts` の利用状況を調査
  - [ ] 本番コードでの利用箇所（現状：なし）
  - [ ] テストコードでの利用箇所（cleanup処理など）
- [ ] テストコードを `DatabaseConnection` ベースに書き換え
  - [ ] `getConnection()` → `db` に置き換え
  - [ ] `executeTransaction()` → `DatabaseConnection.executeTransaction()` に置き換え
- [ ] `connection.ts` を削除
- [ ] 全テスト実行して問題ないことを確認

### 🎓 設計原則の確認

**クリーンアーキテクチャ遵守チェック**:
- [ ] Application層から `DatabaseConnection` を直接importしていない
- [ ] Repository実装内部でのみ `DatabaseConnection` を使用
- [ ] UseCaseは Repository インターフェース経由でのみDBアクセス
- [ ] DIP（依存性逆転の原則）を遵守

### 📊 完了基準

- [ ] すべてのチェックボックスが完了
- [ ] 型チェックが通る（`docker compose exec server bunx tsc --noEmit`）
- [ ] 全テストが通る（`docker compose exec server bun test`）
- [ ] テストカバレッジ80%以上
- [ ] Biomeチェックが通る
- [ ] Phase 4タスクファイルが更新され、整合性が取れている

### ✅ 完了後の状態

- `DatabaseConnection.ts` がDB管理の単一窓口として機能
- `drizzle-client.ts` は削除（役割を `DatabaseConnection.ts` に統合）
- `connection.ts` は削除または廃止予定（Phase 5以降）
- Phase 4タスクが整理された基盤の上で実施可能

---
