
# スキーマ駆動開発ガイドライン

Drizzle ORM を Single Source of Truth のベースをしています:

```bash
# 1. データベーススキーマ変更後
docker compose exec server bun run generate:schemas

# 2. OpenAPI仕様生成
docker compose exec server bun run generate:openapi

# 3. TypeScript型定義生成
docker compose exec client bun run generate:types

# 4. 型チェック
docker compose exec server bun run typecheck
docker compose exec client bun run typecheck
```

## 新規テーブル追加時の手順

1. `app/server/src/shared/database/schema.ts` にテーブル定義を追加
2. `app/server/scripts/generate-schemas.ts` の `tableConfigs` 配列に設定を追加

```typescript
const tableConfigs: TableConfig[] = [
  {
    tableName: 'users',
    tableObject: users,
    outputFile: 'users.ts',
    enums: [/* enum設定 */],
  },
  // 新規テーブルの設定を追加
];
```

3. スキーマ生成コマンドを実行

- **注意**: テーブル名がアンダースコア区切りの複数単語（例: `project_viewers`）の場合、生成される型名・エクスポート名は`toPascalCase()`/`toCamelCase()`（`generate-schemas.ts`内のヘルパー）でDrizzleのキャメルケースexport名と対応させている。命名変換ロジックを変更する場合は、既存の単一単語テーブル（`users`等）の生成結果に差分が出ていないか確認する

## 自動生成ファイルの取り扱い

- **必須**: 冒頭に手動編集禁止の警告コメントが残るように生成スクリプトを作成
- **禁止**: 自動生成されたファイルの手動編集
  - ファイル冒頭の警告コメントを確認
  - スキーマ変更時は必ずスキーマ駆動開発のコマンドで再生成

### 例外: drizzle-kit生成マイグレーションへのIF NOT EXISTS付与

drizzle-kitは`CREATE TABLE`/`CREATE INDEX`に`IF NOT EXISTS`を付与しない。DBの実オブジェクトと`__drizzle_migrations__`の記録が食い違うと、再実行時に`already exists`エラーで失敗しうる。この対策として、**未適用のマイグレーションファイルに限り**、冪等化のための手動編集を許可する。

- **対象**: `CREATE TABLE` → `IF NOT EXISTS` を付与
- **対象**: `CREATE INDEX` / `CREATE UNIQUE INDEX` → `IF NOT EXISTS` を付与
- **対象**: `CREATE TYPE`（PostgreSQLは`IF NOT EXISTS`非対応）→ `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` でラップ
- **対象**: `ALTER TABLE ... ADD CONSTRAINT`（PostgreSQLは`IF NOT EXISTS`非対応）→ 同様に`DO`ブロックでラップ
- **禁止**: 既にいずれかの環境（production/preview）に適用済みのマイグレーションファイルを編集すること
  - ファイル内容を変えるとdrizzle-kitが追跡するハッシュが変わり、適用済み環境で不要な再実行が走る
- **必須**: `bun run db:generate` を再実行しても対象ファイルに差分が出ないこと（スキーマ未変更時は`No schema changes`となり上書きされないことを確認する）

# データベース運用ガイドライン

## 環境別のマイグレーション戦略

- **運用方式**: drizzle-kit generate → migrate（マイグレーション管理）
- **BASE_SCHEMA**:
  - Local: `app_test`
  - Preview: `app_${PROJECT_NAME}_preview`
  - Production: `app_${PROJECT_NAME}`
- **特徴**:
  - マイグレーションファイルをGitで管理
  - 本番環境での計画的なマイグレーション実行
  - ロールバック可能な履歴管理

```bash
# 開発時：マイグレーションファイル生成
docker compose exec server bun run db:generate

# 生成されたファイルをコミット
git add app/server/src/shared/database/migrations/
git commit -m "feat: add new migration for XXX"

# CD環境：マイグレーション実行
docker compose exec server bun run db:migrate:preview  # or :production
docker compose exec server bun run db:setup
```

## CI/CDでの運用フロー

### CI（Pull Request時）

マイグレーション同期チェックを実行し、generate漏れを防止：

```bash
# マイグレーション同期チェック
docker compose exec server bash scripts/check-migration-sync.sh
```

**チェック内容**:
1. `db:generate` を実行
2. Git diff で `migrations/` に差分がないか確認
3. 差分があればエラー終了（generate漏れ）

### CD（Deploy時）

#### Preview環境
```bash
export BASE_SCHEMA=app_${PROJECT_NAME}_preview

# マイグレーション実行
docker compose exec server bun run db:migrate:preview

# RLSポリシー適用
docker compose exec server bun run db:setup
```

#### Production環境
```bash
export BASE_SCHEMA=app_${PROJECT_NAME}

# マイグレーション実行
docker compose exec server bun run db:migrate:production

# RLSポリシー適用
docker compose exec server bun run db:setup
```

## RLSポリシー管理

Row Level Security (RLS) ポリシーは `db:setup` で適用

```bash
docker compose exec server bun run db:setup
```
