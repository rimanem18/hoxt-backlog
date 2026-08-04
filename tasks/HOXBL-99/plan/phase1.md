# Phase 1: project基盤整備（DB・ドメイン・リポジトリ）

## 1. このフェーズの目的

`projects`テーブル・RLS・スキーマ生成設定・`ProjectName`/`ProjectEntity`/`IProjectRepository.save`を実装し、Phase 2以降（project作成API、一覧・詳細・編集API）すべての前提となる最小限のwalking skeletonを成立させる。

## 2. 確認可能なこと

- `docker compose exec server bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec server bun test`で本フェーズの新規テストがすべてグリーンになること
- `PostgreSQLProjectRepository.save`の統合テストで、DBに`projects`レコードが永続化されることが確認できる
- `ProjectName`/`ProjectEntity`の単体テストで、名前未入力・空白のみ・101文字が拒否されることが確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-001, REQ-002
- **関連設計**: design.md §3.1（projectを独立ドメインとする方針）, §4.1（コンポーネント構成）, §8, §8.1（データモデル・マイグレーション手順）

## 4. 依存関係

- **前提フェーズ**: なし
- **ブロッカー**: なし
- **注意**: このフェーズは「project作成」というユーザー価値そのものはまだ提供しない、複数フェーズ（Phase 2〜4）の前提となる最小限のwalking skeletonである。API層は含まない

## 5. タスク一覧

- [x] **TASK-1-01: `projects`テーブルのDBスキーマ定義とマイグレーション生成**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-001, REQ-002
  - **関連設計**: design.md §8, §8.1手順1・3
  - **実装詳細**:
    - `app/server/src/shared/database/schema.ts`に`projects`テーブルを追加する。属性: `id`(uuid, PK, defaultRandom), `userId`(uuid, NOT NULL, FK→users.id, onDelete cascade), `name`(varchar(100), NOT NULL), `description`(text, nullable), `createdAt`/`updatedAt`(timestamp withTimezone, defaultNow, NOT NULL)
    - CHECK制約: `non_empty_name`（`length(trim(name)) > 0`）, `name_length`（`length(name) <= 100`）。`tasks`テーブルの`nonEmptyTitle`/`titleLength`と同一パターン
    - インデックス: `idx_projects_user_id`（`userId`）, `idx_projects_user_created`（`userId`, `createdAt desc`）
    - `docker compose exec server bun run db:generate`でマイグレーションファイルを生成する
  - **完了条件**: `schema.ts`に`projects`テーブル定義が追加され、`app/server/src/shared/database/migrations/`に新規マイグレーションファイルが生成されていること
  - **注意点**: 自動生成されたマイグレーションファイルは手動編集しない

- [x] **TASK-1-02: `generate-schemas.ts`への`projects`テーブル設定追加**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01
  - **関連要件**: REQ-001, REQ-002
  - **関連設計**: design.md §8.1手順2, `.claude/rules/schema-db.md`
  - **実装詳細**:
    - `app/server/scripts/generate-schemas.ts`の`tableConfigs`配列に`projects`エントリを追加する。`customValidations.name`に`min: 1, max: 100`と`title`と同型のエラーメッセージを設定する。`description`は`optional: true`とする
  - **完了条件**: `tableConfigs`に`projects`設定が追加されていること（生成実行はTASK-1-08で行う）

- [x] **TASK-1-03: `scripts/setup-rls.ts`への`projects`テーブルRLSポリシー追加**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01
  - **関連要件**: NFR-101（多層防御）
  - **関連設計**: design.md §8.1手順5, §9
  - **実装詳細**:
    - `app/server/scripts/setup-rls.ts`に、既存`users_own_tasks_policy`と同型の`users_own_projects_policy`を追加する（`ALTER TABLE ... projects ENABLE ROW LEVEL SECURITY`、`auth.uid()::text = user_id::text`条件のポリシー作成、冪等性のための`DROP POLICY IF EXISTS`込み）
  - **完了条件**: `setup-rls.ts`に`projects`テーブル向けのRLS有効化・ポリシー作成処理が追加されていること。実際の適用（`db:setup`実行）はローカル確認のみとし、Preview/Production適用は本フェーズの対象外とする
  - **注意点**: リポジトリ層の`userId`条件が一次防御であり、RLSは多層防御である点（design.md §3.1, §9）を実装コメント等で誤解を招かないようにする

- [x] **TASK-1-04: project用ドメインエラーの実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-301, REQ-306
  - **関連設計**: design.md §7.2
  - **実装詳細**:
    - `app/server/src/project/domain/errors/`に`ProjectDomainError`（抽象基底、`TaskDomainError`と同型）, `InvalidProjectDataError`（400, `INVALID_PROJECT_DATA`）を実装する。`ProjectNotFoundError`はPhase 3で追加するため、このフェーズでは作成しない
    - `index.ts`でexportをまとめる
  - **完了条件**: `InvalidProjectDataError`が`ProjectDomainError`を継承し、`status`・`code`プロパティを持つこと
  - **単体テスト要件**: `app/server/src/project/domain/__tests__/errors.test.ts`に、`TaskDomainError`系のテスト（`app/server/src/task/domain/__tests__/errors.test.ts`）と同等の観点でエラークラスの型・プロパティを検証する

- [x] **TASK-1-05: `ProjectName`値オブジェクトの実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-1-04
  - **関連要件**: REQ-001, REQ-301, REQ-306
  - **関連設計**: design.md §3.1, §4.1（`ProjectName`）
  - **実装詳細**:
    - `app/server/src/project/domain/valueobjects/ProjectName.ts`に、trim後1〜100文字を保証する値オブジェクトを実装する
    - `TaskTitle`と同型のファクトリメソッドパターン（`create`, `getValue`, `equals`）を踏襲するが、バリデーション失敗時は汎用`Error`ではなくTASK-1-04で実装した`InvalidProjectDataError`を直接スローする（design.md §2.2の既存ギャップを再発させないため）
    - テストは`app/server/src/project/domain/__tests__/ProjectName.test.ts`に配置
  - **完了条件**: 空文字列・空白のみ・101文字で`InvalidProjectDataError`がスローされ、100文字ちょうど・trim後1文字以上で正常にインスタンス生成できること
  - **単体テスト要件**: 正常系（1文字、100文字、trim対象の前後空白）、異常系（空文字列、空白のみ、101文字）、境界値（100文字/101文字）

- [x] **TASK-1-06: `ProjectEntity`の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-1-05
  - **関連要件**: REQ-001, REQ-101
  - **関連設計**: design.md §4.1（`ProjectEntity`）
  - **実装詳細**:
    - `app/server/src/project/domain/ProjectEntity.ts`に、`id`, `userId`, `name`(`ProjectName`), `description`, `createdAt`, `updatedAt`を保持するエンティティを実装する
    - `TaskEntity`と同一パターン（`create`ファクトリ、`reconstruct`ファクトリ、privateコンストラクタ）
    - このフェーズでは`create`/`reconstruct`とgetterのみを実装し、`updateName`/`updateDescription`はPhase 4で追加する（未使用コードの先行実装を避ける）
  - **完了条件**: `ProjectEntity.create({ userId, name, description })`で正常にインスタンスが生成され、不正な`name`の場合は`InvalidProjectDataError`が伝播すること
  - **単体テスト要件**: 正常系（説明文あり/なし）、異常系（不正な名前でのエラー伝播）

- [x] **TASK-1-07: `IProjectRepository.save`と`PostgreSQLProjectRepository.save`の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-1-01, TASK-1-02, TASK-1-06
  - **関連要件**: REQ-101
  - **関連設計**: design.md §4.1（`IProjectRepository`, `PostgreSQLProjectRepository`）
  - **実装詳細**:
    - `app/server/src/project/domain/IProjectRepository.ts`に`save(project: ProjectEntity): Promise<ProjectEntity>`を定義する（`findByUserId`/`findById`はPhase 3、`update`はPhase 4で追加）
    - `app/server/src/project/infrastructure/PostgreSQLProjectRepository.ts`に`PostgreSQLTaskRepository`と同一パターンでDrizzle経由の`save`を実装する
    - テストは`app/server/src/project/infrastructure/__tests__/PostgreSQLProjectRepository.test.ts`に配置し、実DBに対する統合テストとする
  - **完了条件**: `save`実行後、DBに`projects`レコードが永続化され、返却された`ProjectEntity`のプロパティがDB値と一致すること
  - **統合テスト要件**: 正常系（説明文あり/なし）、同名project重複保存が成功すること

- [x] **TASK-1-08: スキーマ生成実行と型チェック**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01, TASK-1-02, TASK-1-07
  - **関連要件**: なし（インフラ）
  - **関連設計**: `.claude/rules/schema-db.md`
  - **実装詳細**:
    ```bash
    docker compose exec server bun run generate:schemas
    docker compose exec server bunx tsc --noEmit
    docker compose exec server bun test
    ```
    自動生成ファイル（`app/server/src/schemas/projects.ts`）は手動編集しない。この時点ではOpenAPI・client型生成は行わない（API層がまだ存在しないため、Phase 2で実施する）
  - **完了条件**: 型エラー・テスト失敗がないこと

## 6. このフェーズの完了条件

- `projects`テーブルのマイグレーションが生成され、RLSポリシー・スキーマ生成設定が揃っていること
- `ProjectName` / `ProjectEntity` / `IProjectRepository.save` / `PostgreSQLProjectRepository.save`が実装されていること
- サーバー側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること

## 7. 実施記録

### 計画との差異

- **TASK-1-01実施中に判明した問題**: `docker compose exec server bun run db:generate`で生成された0002マイグレーション（`app_test`/`app_hoxbl`/`app_hoxbl_preview`の3環境すべて）に、drizzle-kitが`CREATE SCHEMA "app_xxx";`（`IF NOT EXISTS`なし）を誤って混入させた。既存の0000/0001マイグレーションはスキーマ作成文を含んでおらず、実際は全環境（ローカル`app_test`、preview、production）でスキーマは既に作成済みであるため、このまま`db:migrate:production`/`db:migrate:preview`を実行すると「schema already exists」エラーで失敗する状態だった（ローカル`db:migrate:test`で実際に再現・確認済み）。原因は0001時点のスナップショット（`meta/0001_snapshot.json`）が`schemas: {}`のままスキーマ作成を追跡していなかったこと。
  - **対応**: ユーザーに判断を仰ぎ、生成された3つのマイグレーションSQLの該当行のみ`CREATE SCHEMA IF NOT EXISTS "app_xxx";`に手動で書き換えた（自動生成ファイルの手動編集禁止ルールの例外対応）。修正後、ローカルの`db:migrate:test`が正常に成功することを確認済み。
- **`scripts/check-migration-sync.sh`の実行不可**: サーバーコンテナに`bash`が存在せず`sh`で代替実行したが、コンテナ内に`git`コマンドが存在せずスクリプトが完走しなかった。加えてローカルの`app_test`マイグレーションのmeta配下にセッション実行環境由来の空ディレクトリ（`.claude/.cc-writes/`、gitignore対象・サンドボックス権限により削除不可）が生成されており、drizzle-kitの`generate`実行時にスナップショットとして誤読されエラーになった。preview/production向けの`generate`は正常に`No schema changes, nothing to migrate`となり、生成物とコミット対象に差分がないことは確認できている。

### 所要時間

- 開始: 2026-08-01 10:32 JST
- 終了: 2026-08-01 10:44 JST
- 合計: 約12分（typecheck/test/lint/semgrepの実行時間含む。品質ゲート実行はサブエージェントに委譲）
