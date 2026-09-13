---
description: DrizzleでUPDATE→0件ならINSERTという2クエリの「疑似upsert」を実装・レビューするとき、または一意制約が式インデックス（例 lower(email)のような大文字小文字を無視する制約）で定義されているテーブルに対してupsertを実装するときに参照する。同一キーへの並行リクエストで一意制約違反（500）が起きうる設計になっていないか確認する場面、および`insert().onConflictDoUpdate()`を使おうとして型エラーやON CONFLICT対象不一致エラーに遭遇した場面に該当する。
---

## 見出し

「UPDATEを試し、0件ならINSERT」という2クエリ構成の疑似upsertは並行リクエストで一意制約違反を起こす。かつ、一意制約が式インデックス（`lower(email)`等）の場合、Drizzleの`insert().onConflictDoUpdate()`は型レベルでそのインデックスをターゲットにできない。

## 背景

このプロジェクトの既存リポジトリ（`PostgreSQLViewerAccessTokenRepository.save()`, `PostgreSQLProjectViewerRepository.save()`）は、一意キーでの重複保存を「まずUPDATEを試し、対象行が0件ならINSERTする」という2クエリのパターンで実装していた。HOXBL-102 Phase 3で`PostgreSQLPushSubscriptionRepository`を新規実装する際、既存パターンを踏襲してGreenフェーズの実装を行った。

対象テーブル`viewer_push_subscriptions`の一意制約は`(lower(email), endpoint)`という**式インデックス**（大文字小文字を無視するための`lower()`関数呼び出しを含むインデックス）だった。

## 生じた問題

### 1. 疑似upsertの競合状態（Codex MCPレビューで発覆）

Codex MCPによる8観点レビュー（efficiency, simplification, line-by-line, cross-file等、独立した5つの観点）が共通して指摘: 同一`email × endpoint`への登録リクエストが並行して届くと、両方のUPDATEが「対象行なし」を返し、両方がINSERTへ進む。片方は成功するが、もう片方は一意制約違反で失敗し500エラーになる。この既存パターンは、リクエスト頻度が低い管理系操作（招待・トークン発行）では実害が出にくいが、Web Push購読登録のような「ブラウザが複数タブ・複数回のリトライで同時に呼ぶ可能性がある」エンドポイントでは現実的なリスクになる。

### 2. `onConflictDoUpdate`が式インデックスをターゲットにできない

これを解決しようとして`db.insert(table).values(...).onConflictDoUpdate({ target: [...], set: {...} })`を使おうとしたが、Drizzle-ormの型定義（`drizzle-orm/pg-core/indexes.d.ts`）は次の通り:

```ts
export type IndexColumn = PgColumn;
```

`target`は`IndexColumn | IndexColumn[]`、つまり**プレーンな列オブジェクトのみ**しか受け付けず、`sql\`lower(${table.email})\`` のようなSQL式を渡すことができない（実装（`insert.js`）を見ても`getColumnCasing()`という「列オブジェクトから列名を取り出す」処理しかしておらず、SQL式は素通りできない）。つまり、一意制約が式インデックスで定義されているテーブルに対して、Drizzleの型付きAPIで`ON CONFLICT`を使う手段が存在しない。

### 3. 生SQLへ切り替えた際の追加の落とし穴

`db.execute(sql\`...\`)`で生SQLのUPSERTを書く方針に切り替えたが、さらに2つの落とし穴があった。

- **列オブジェクトをSQL識別子として埋め込むと完全修飾名になる**: `sql\`insert into ${table} (${table.email}, ...)\``のように書くと、`${table.email}`は`"schema"."table"."email"`という完全修飾名にレンダリングされる。これはSELECT文のWHERE句などでは正しいが、`INSERT INTO tbl (col1, col2)`の列リストや`ON CONFLICT (col1, col2)`のターゲットリストでは無効な構文になる（`syntax error at or near ")"`）。この位置では`sql.raw(column.name)`で列名だけを取り出して埋め込む必要がある
- **Dateオブジェクトを生SQLパラメータとして渡すとpostgres.jsが例外を吐く**: `insert()`等の型付きビルダー経由ならDrizzleがカラムの型情報を使ってJS Dateを適切な形式に変換するが、`sql\`... ${new Date()} ...\``のように生SQLへ直接値を渡すと、postgres.jsドライバが`TypeError: The "string" argument must be of type string or an instance of Buffer or ArrayBuffer. Received an instance of Date`で失敗する。`entity.getCreatedAt().toISOString()`のように明示的に文字列化してから渡す必要がある

## 対処法

一意制約が式インデックスのテーブルに対する原子的upsertは、生SQLで書く。列名は`sql.raw(column.name)`で識別子として埋め込み、値は通常のテンプレート変数（パラメータバインド）で渡す。`RETURNING`句で列をキャメルケースにエイリアスしておくと、既存の`toDomain()`変換関数をそのまま再利用できる。

```ts
const emailCol = sql.raw(table.email.name);
const endpointCol = sql.raw(table.endpoint.name);
const p256dhCol = sql.raw(table.p256dhKey.name);

const rows = await db.execute<typeof table.$inferSelect>(sql`
  insert into ${table} (${sql.raw(table.id.name)}, ${emailCol}, ${endpointCol}, ${p256dhCol})
  values (${entity.getId()}, ${entity.getEmail()}, ${entity.getEndpoint()}, ${entity.getP256dhKey()})
  on conflict (lower(${emailCol}), ${endpointCol})
  do update set ${p256dhCol} = excluded.${p256dhCol}
  returning
    ${sql.raw(table.id.name)} as id,
    ${emailCol} as email,
    ${p256dhCol} as "p256dhKey"
`);
```

並行2リクエストで実際に検証: `Promise.allSettled([repo.save(e1), repo.save(e2)])`が両方`fulfilled`になり、DBには1行のみ残ることを確認した。

## 学び

- 一意制約が**プレーンな列**（式なし）であれば、Drizzleの`onConflictDoUpdate({ target: table.column, set: {...} })`で十分。式インデックス（`lower()`等の正規化を伴う大文字小文字無視制約など）の場合は生SQLが必要になる
- 既存コードに「UPDATE→0件ならINSERT」という疑似upsertパターンが複数箇所（`PostgreSQLViewerAccessTokenRepository`, `PostgreSQLProjectViewerRepository`）に存在する。これらは同一キーへの同時書き込み頻度が低い操作向けだが、新規に似たパターンを実装する際は、そのAPIが同時多重リクエストを受けうるか（ブラウザの多重送信、リトライ等）を確認し、必要なら本ナレッジの生SQL方式へ置き換えることを検討する
