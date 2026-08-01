---
description: drizzle-kit generateで新規テーブルを追加した際、生成マイグレーションにCREATE SCHEMA文が混入していないか確認したいときに参照する。BASE_SCHEMAを分けて複数環境（test/preview/production）のマイグレーションを管理しているプロジェクトで、db:generate後にdb:migrateがschema already existsで失敗する場合に該当する。
---

## 見出し

drizzle-kit generate が古いスナップショットの影響で `CREATE SCHEMA`（`IF NOT EXISTS`なし）を新しいマイグレーションに混入させることがある

## 背景

このプロジェクトでは `BASE_SCHEMA` 環境変数でPostgreSQLスキーマ名を切り替え、`drizzle.config.ts` の `out` を `./migrations/${baseSchema}` にすることで環境（test/preview/production）ごとにマイグレーション履歴を分離している。スキーマオブジェクト自体は `schema.ts` で `pgSchema(schemaName)` によりexportされている。

各環境の実DBでは、スキーマ自体（`app_test` 等）は過去の何らかの初回セットアップ（手動、あるいはCIの`CREATE SCHEMA IF NOT EXISTS`ステップなど）で既に作成済みであり、既存の `0000_*.sql` / `0001_*.sql` マイグレーションには `CREATE SCHEMA` 文が一切含まれていなかった（`meta/0001_snapshot.json` の `schemas` フィールドも `{}` のまま）。

## 生じた問題

`projects` テーブルを新規追加し `docker compose exec server bun run db:generate` を実行したところ、生成された `0002_*.sql`（test/preview/production の3環境すべて）の先頭に以下が混入していた。

```sql
CREATE SCHEMA "app_test";
```

このSQLには `IF NOT EXISTS` が付いておらず、対象スキーマは実DBに既に存在するため、このままこのマイグレーションを適用すると `schema already exists` エラーで失敗する。実際にローカルの `docker compose exec server bun run db:migrate:test` を実行して再現・確認した。

### 真因の特定手順

1. `db:migrate:test` がエラーで失敗することを確認（`bun run` 経由だと標準エラーが見えにくいため `bunx drizzle-kit migrate` を直接実行して切り分けた）
2. 実DBに `psql` 相当のクエリ（`information_schema.schemata`）で問い合わせ、対象スキーマが既に存在することを確認
3. `meta/0001_snapshot.json` と `meta/0002_snapshot.json` の `schemas` フィールドを比較し、`{}` → `{'app_test': 'app_test'}` に変化していたことを確認。drizzle-kit（v0.31.10時点）は前回スナップショットで未追跡だったpgSchemaオブジェクトを新規追加とみなし、`CREATE SCHEMA` 文を生成する
4. `.github/workflows/server-test.yml` を確認し、CI（server-test）は `drizzle-kit migrate` ではなく `drizzle-kit push --force` を使い、かつ事前に `CREATE SCHEMA IF NOT EXISTS` を実行しているため、このバグの影響を受けないことを確認
5. `.github/workflows/deploy-database.yml` を確認し、preview/production の実デプロイは `db:migrate:preview` / `db:migrate:production`（＝`drizzle-kit migrate`）を直接実行しており、事前のスキーマ作成ステップが存在しないため、この問題を放置すると次回デプロイが確実に失敗することを確認

## 対処法

生成されたマイグレーションSQLの該当行のみ、手動で `IF NOT EXISTS` を追加する。

```diff
-CREATE SCHEMA "app_test";
+CREATE SCHEMA IF NOT EXISTS "app_test";
```

このプロジェクトでは自動生成ファイルの手動編集を原則禁止しているが、生成ツール自体が誤ったSQLを出力しているケースであり、放置すると次回デプロイが必ず失敗するため、ユーザーに状況を説明し承認を得たうえで例外的に修正した。修正後、対象3ファイル（test/preview/production）すべてで同様の混入を確認し、同じ修正を適用した。

修正後、`docker compose exec server bun run db:migrate:test` が成功することを確認した。

## 学び

- `db:generate` 実行後は生成されたSQLの中身を必ず目視確認する。特に「今回のテーブル追加とは無関係に見える文（CREATE SCHEMA、CREATE EXTENSIONなど）」が混入していないかを重点的にチェックする
- CI（server-test）と実デプロイ（deploy-database）でマイグレーション適用方式（`push` vs `migrate`）や前提条件（事前スキーマ作成の有無）が異なる場合、CIが通ってもデプロイが失敗する組み合わせが存在しうる。両方のワークフローファイルを確認してから安全性を判断すること
- `bun run db:migrate:xxx` はエラー詳細が握りつぶされやすいので、切り分け時は `bunx drizzle-kit migrate` を直接実行すると標準エラーが見える
