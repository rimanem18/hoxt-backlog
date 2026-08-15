# Phase 1: DB基盤（テーブル・RLS・EmailAddress共有化）

## 1. このフェーズの目的

`project_viewers`/`viewer_access_tokens`テーブルとRLS、スキーマ生成設定、`EmailAddress`の共有VO化を実装し、Phase 2以降（viewerドメインのEntity実装、招待API、横断閲覧API）すべての前提となる最小限のwalking skeletonを成立させる。

## 2. 確認可能なこと

- `docker compose exec server bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec server bun test`で既存テストがすべてグリーンになること（このフェーズでは新規ドメインロジックのテストは追加しない）
- マイグレーションが生成され、ローカル環境（`app_test`）に適用できること
- `EmailAddress`の既存テストが、`shared/domain/valueobjects`への移設後も全てグリーンであること

## 3. 関連要件・関連設計

- **関連要件**: REQ-304, NFR-101, NFR-102
- **関連設計**: design.md §3.1（Shared Kernelとしての`EmailAddress`）, §8, §8.1（データモデル・マイグレーション手順）

## 4. 依存関係

- **前提フェーズ**: なし
- **ブロッカー**: なし
- **注意**: このフェーズは「viewer招待」というユーザー価値そのものはまだ提供しない、複数フェーズ（Phase 2〜6）の前提となる最小限のwalking skeletonである。ドメインロジック・API層は含まない

## 5. タスク一覧

- [ ] **TASK-1-01: `project_viewers`/`viewer_access_tokens`テーブルのDBスキーマ定義とマイグレーション生成**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-004, REQ-101, REQ-105, REQ-106, REQ-503
  - **関連設計**: design.md §8, §8.1手順1・3
  - **実装詳細**:
    - `app/server/src/shared/database/schema.ts`に`project_viewers`テーブルを追加する。属性: `id`(uuid, PK, defaultRandom), `projectId`(uuid, NOT NULL, FK→projects.id, onDelete cascade), `email`(varchar(320), NOT NULL), `status`(enum: active/revoked, NOT NULL, default active), `invitedAt`(timestamp, NOT NULL, defaultNow), `revokedAt`(timestamp, nullable), `createdAt`/`updatedAt`
    - 制約: 一意制約`(projectId, email)`、CHECK`valid_viewer_email`（`users.valid_email`と同一正規表現）、index`(projectId, status)`（一覧クエリ用）、index`(email, status)`（viewer横断閲覧のprojectId解決用）
    - `viewer_access_tokens`テーブルを追加する。属性: `id`(uuid, PK), `email`(varchar(320), NOT NULL, UNIQUE), `tokenHash`(char(64), NOT NULL, UNIQUE, sha256 hex), `expiresAt`(timestamp, NOT NULL), `createdAt`/`updatedAt`
    - `docker compose exec server bun run db:generate`でマイグレーションファイルを生成する
  - **完了条件**: `schema.ts`に両テーブル定義が追加され、`app/server/src/shared/database/migrations/`に新規マイグレーションファイルが生成されていること
  - **注意点**: 自動生成されたマイグレーションファイルは手動編集しない（`.claude/rules/schema-db.md`）

- [ ] **TASK-1-02: `generate-schemas.ts`への`project_viewers`/`viewer_access_tokens`テーブル設定追加**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01
  - **関連要件**: REQ-304
  - **関連設計**: design.md §8.1手順2, `.claude/rules/schema-db.md`
  - **実装詳細**: `app/server/scripts/generate-schemas.ts`の`tableConfigs`配列に`project_viewers`・`viewer_access_tokens`エントリを追加する。`project_viewers.email`のバリデーションは既存`users`テーブル設定のメール形式チェックと同一パターンを踏襲する
  - **完了条件**: `tableConfigs`に両テーブル設定が追加されていること（生成実行はTASK-1-06で行う）

- [ ] **TASK-1-03: `scripts/setup-rls.ts`への`project_viewers`/`viewer_access_tokens`テーブルRLSポリシー追加**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01
  - **関連要件**: NFR-101, NFR-102
  - **関連設計**: design.md §8.1手順5, §9
  - **実装詳細**:
    - `project_viewers`: RLSを有効化し、`auth.uid()`が対象projectの所有者と一致する場合のみ許可するポリシーを追加する（`EXISTS (SELECT 1 FROM projects WHERE projects.id = project_viewers.project_id AND projects.user_id::text = auth.uid()::text)`）
    - `viewer_access_tokens`: RLSを有効化し、`anon`/`authenticated`ロールに対する許可ポリシーは追加しない（アプリの直接DB接続経由のみがアクセスする前提のデフォルト拒否）
  - **完了条件**: `setup-rls.ts`に両テーブル向けのRLS有効化・ポリシー作成処理が追加されていること。実際の適用（`db:setup`実行）はローカル確認のみとし、Preview/Production適用は本フェーズの対象外とする
  - **注意点**: リポジトリ層の所有権検証・トークン検証が一次防御であり、RLSは多層防御である点を実装コメント等で誤解を招かないようにする

- [ ] **TASK-1-04: `EmailAddress`の共有VO化（`shared/domain/valueobjects`への移設）**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-304
  - **関連設計**: design.md §3.1, §3.2（不採用案: `ViewerEmail`の複製）
  - **実装詳細**:
    - `app/server/src/user/domain/valueobjects/EmailAddress.ts`を`app/server/src/shared/domain/valueobjects/EmailAddress.ts`へ移動する
    - `user`ドメイン側の参照箇所（`CreateUserInput`, `UpdateUserInput`, `EmailSignupUseCase`等）のimport先を`@/shared/domain/valueobjects/EmailAddress`に更新する
    - 既存テスト（`EmailAddress.test.ts`）も`app/server/src/shared/domain/__tests__/`へ移設する
  - **完了条件**: `bunx tsc --noEmit`がエラーゼロであること。移設前と同一内容のテストが移設後も全てグリーンであること
  - **注意点**: RISK-03（overview.md 5章）。`grep -r "user/domain/valueobjects/EmailAddress"`で参照漏れが残っていないことを確認する

- [ ] **TASK-1-05: ローカルDBへのマイグレーション適用確認**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01, TASK-1-03
  - **関連要件**: なし（インフラ）
  - **関連設計**: `.claude/rules/schema-db.md`
  - **実装詳細**: ローカル環境（`app_test`）にマイグレーションと`db:setup`（RLS適用）を適用し、`project_viewers`/`viewer_access_tokens`テーブルが期待通り作成されることを確認する
  - **完了条件**: ローカルDBに両テーブルが作成され、RLSが有効化されていること

- [ ] **TASK-1-06: スキーマ生成実行と型チェック**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01, TASK-1-02, TASK-1-04, TASK-1-05
  - **関連要件**: なし（インフラ）
  - **関連設計**: `.claude/rules/schema-db.md`
  - **実装詳細**:
    ```bash
    docker compose exec server bun run generate:schemas
    docker compose exec server bunx tsc --noEmit
    docker compose exec server bun test
    ```
    自動生成ファイル（`app/server/src/schemas/project-viewers.ts`等）は手動編集しない。この時点ではOpenAPI・client型生成は行わない（API層がまだ存在しないため、Phase 3以降で実施する）
  - **完了条件**: 型エラー・テスト失敗がないこと

## 6. このフェーズの完了条件

- `project_viewers`/`viewer_access_tokens`テーブルのマイグレーションが生成・適用され、RLSポリシー・スキーマ生成設定が揃っていること
- `EmailAddress`が`shared/domain/valueobjects`に移設され、`user`ドメイン側のimportが更新されていること
- サーバー側の型チェックがエラーゼロであること
- 既存テストがすべてグリーンであること
