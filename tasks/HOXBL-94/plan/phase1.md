# Phase 1: Backend - 基盤整備（AuthProvider 拡張・DB マイグレーション・スキーマ再生成）

## 開始時刻

2026-07-01 23:34 JST

## 1. このフェーズの目的

`email` プロバイダーを型システム・DB スキーマ・共有スキーマの全レイヤーで一貫して使えるようにする。  
このフェーズ完了後、`provider='email'` を扱う実装がどのレイヤーでも型エラーなく動作する状態になる。

## 2. 確認可能なこと

- `docker compose exec server bunx tsc --noEmit` がエラーゼロになること
- `docker compose exec client bunx tsc --noEmit` がエラーゼロになること
- Drizzle マイグレーションファイルが生成されており、`auth_provider_type` enum に `email` が含まれること
- `users_email_lower_unique` UNIQUE インデックスがマイグレーションに含まれること

## 3. 関連要件・関連設計

- **関連要件**: REQ-002, REQ-003（1 メール = 1 ユーザーの DB レベル保証）
- **関連設計**: §4.1（enum 拡張）, §4.2（UNIQUE インデックス）, §9 Migration A/B/C, §13 R1

## 4. 依存関係

- **前提フェーズ**: なし
- **ブロッカー**: なし
- **注意**: DCQ-04（本番 `users.email` 重複データ不在確認）は本番適用前に完了が必要。ローカル・Preview 環境では通常発生しないが、TASK-1-06 でスクリプト実施手順を整備する。

## 5. タスク一覧

- [x] **TASK-1-01: `shared-schemas/src/auth.ts` の `authProviderSchema` に `email` 追加**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-002
  - **関連設計**: §2.3, §13 R1
  - **実装詳細**:
    - `app/packages/shared-schemas/src/auth.ts` の `authProviderSchema` を `z.enum([..., 'email'])` に変更する
    - ファイル冒頭コメント「DBスキーマ（auth_provider_type enum）と同期必須」が維持されていること
  - **完了条件**: `authProviderSchema` に `'email'` が含まれ、`AuthProvider` 型に `'email'` が追加されること
  - **注意点**: `shared-schemas` のビルドは `app/packages/shared-schemas/` で実施。変更後は server/client 両方の型チェックが必要

- [x] **TASK-1-02: `app/server/src/user/domain/AuthProvider.ts` に `EMAIL` 定数追加**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01
  - **関連要件**: REQ-002
  - **関連設計**: §7.1, §13 R1
  - **実装詳細**:
    - `AuthProviders` 定数オブジェクトに `EMAIL: 'email'` を追加する
    - この変更を漏らすと `provider='email'` の JWT 処理時に `InvalidProviderError` が発生する（`isValidAuthProvider` チェックが失敗するため）
  - **完了条件**: `AuthProviders.EMAIL === 'email'` であること。`isValidAuthProvider('email')` が `true` を返すこと

- [x] **TASK-1-03: `schema.ts` の `authProviderType` enum に `email` 追加**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01
  - **関連要件**: REQ-002
  - **関連設計**: §4.1, §9 Migration A
  - **実装詳細**:
    - `app/server/src/shared/database/schema.ts` の `authProviderType` enum 定義に `'email'` を追加する
    - `app/server/scripts/generate-schemas.ts` の対象テーブル設定に変更が必要な場合は更新する
  - **完了条件**: `schema.ts` の enum 定義に `email` が含まれること

- [x] **TASK-1-04: `schema.ts` に `lower(email)` UNIQUE インデックス追加**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-03
  - **関連要件**: REQ-002
  - **関連設計**: §4.2, §9 Migration B/C
  - **実装詳細**:
    - `app/server/src/shared/database/schema.ts` の `users` テーブルに `lower(email)` 関数インデックスを Drizzle 定義で追加する
    - 既存の `idx_users_email` インデックスがある場合は削除定義も必要（Migration でドロップ→再作成）
    - Drizzle ORM での関数インデックス定義: `index('users_email_lower_unique').on(sql\`lower(${users.email})\`).unique()`
  - **完了条件**: Drizzle schema に UNIQUE 関数インデックス定義が含まれること

- [x] **TASK-1-05: Drizzle migration ファイル生成**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-03, TASK-1-04
  - **関連要件**: なし（インフラ）
  - **関連設計**: §9 Migration A/B/C
  - **実装詳細**:
    ```bash
    docker compose exec server bun run db:generate
    ```
    生成されたマイグレーションファイルを確認し、以下が含まれることをチェックする:
    - `ALTER TYPE auth_provider_type ADD VALUE 'email'`
    - 既存 email インデックス削除（存在する場合）
    - `CREATE UNIQUE INDEX CONCURRENTLY users_email_lower_unique ON users (lower(email))`
  - **完了条件**: `app/server/src/shared/database/migrations/` に新しいマイグレーションファイルが生成されていること

- [x] **TASK-1-06: 既存 email データの重複確認スクリプト実施（DCQ-04）**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-002
  - **関連設計**: §9 Migration B
  - **実装詳細**:
    ローカル DB で重複確認クエリを実行する:
    ```sql
    SELECT lower(email), COUNT(*) as cnt
    FROM users
    GROUP BY lower(email)
    HAVING COUNT(*) > 1;
    ```
    結果が 0 件であることを確認する。  
    本番適用前には同クエリを本番 DB に対して実施すること（別途手順書に記録）。
  - **完了条件**: ローカル環境でクエリ結果が 0 件であること

- [x] **TASK-1-07: スキーマ再生成（server スキーマ → OpenAPI → client 型）**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01, TASK-1-02, TASK-1-03
  - **関連要件**: なし（インフラ）
  - **関連設計**: スキーマ駆動開発ガイドライン
  - **実装詳細**:
    ```bash
    docker compose exec server bun run generate:schemas
    docker compose exec server bun run generate:openapi
    docker compose exec client bun run generate:types
    ```
    自動生成された `app/server/src/schemas/users.ts` を手動編集しないこと。
  - **完了条件**: 自動生成ファイルが更新されており、`auth_provider_type` enum に `email` が含まれること

- [x] **TASK-1-08: 型チェックとテスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-07
  - **関連要件**: なし
  - **関連設計**: なし
  - **実装詳細**:
    ```bash
    docker compose exec server bunx tsc --noEmit
    docker compose exec server bun run fix
    docker compose exec server bun test
    docker compose exec client bunx tsc --noEmit
    docker compose exec client bun run fix
    docker compose exec client bun test
    ```
  - **完了条件**: 型エラー・テスト失敗がないこと

## 終了時刻・所要時間

- 終了: 2026-07-01 23:42 JST
- 合計: 約 8 分

## typecheck / test / lint / build 計測

| コマンド | 所要時間 |
|---|---|
| server tsc --noEmit | ~5s |
| client tsc --noEmit | ~5s |
| server bun test (669テスト) | ~20s |
| client bun test (259テスト) | ~5s |
| server bun run fix | ~3s |
| client bun run fix | ~2s |
| db:generate (3環境) | ~10s |

## 差異の記録

- `drizzle.config.ts` のスキーマパスが `./src/infrastructure/database/schema.ts` と古いパスを参照していたため、`./src/shared/database/schema.ts` に修正した（既存のバグ修正）。マイグレーション出力パスも同様に修正。

## 6. このフェーズの完了条件

- `authProviderSchema`（shared-schemas）、`AuthProviders`（server domain）、`authProviderType`（schema.ts）の三箇所すべてに `email` が追加されていること
- Drizzle migration ファイルが生成されていること（`ALTER TYPE` + UNIQUE インデックス）
- サーバー・クライアント両方の型チェックがエラーゼロになること
- 既存テストがすべてグリーンであること
- 自動生成ファイル（`schemas/users.ts`、OpenAPI spec、client 型）が再生成されていること
