# Phase 5: task側DB拡張とEntity/Repository対応

## 1. このフェーズの目的

`tasks.project_id`カラムを追加し、`TaskEntity`/`ITaskRepository`にprojectId関連の型・検索条件を組み込む。API層への統合はPhase 6で行う。

## 2. 確認可能なこと

- `docker compose exec server bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec server bun test`で本フェーズの新規テスト・既存task関連テストがすべてグリーンになること
- `PostgreSQLTaskRepository`の統合テストで、`projectId`フィルタあり/なしの検索ができること
- 移行前から存在するproject未所属task（`project_id = null`）が、`projectId`未指定時の検索結果に引き続き含まれること（AC-04相当）

## 3. 関連要件・関連設計

- **関連要件**: REQ-003, REQ-102, REQ-103, REQ-201
- **関連設計**: design.md §4.2（既存task側の変更）, §8（`tasks`テーブル拡張）, §8.1

## 4. 依存関係

- **前提フェーズ**: Phase 1（`projects`テーブルが存在すること前提）
- **ブロッカー**: なし
- **注意**: このフェーズはAPI層を含まない、Phase 6の前提となる最小限のwalking skeletonである。ユーザー向け機能としての確認可能性は、リポジトリ層の統合テストとして担保する

## 5. タスク一覧

- [x] **TASK-5-01: `tasks.project_id`カラムのDBスキーマ定義とマイグレーション生成**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-003, REQ-102
  - **関連設計**: design.md §8, §8.1手順1・3
  - **実装詳細**:
    - `schema.ts`の`tasks`テーブルに`projectId`(uuid, nullable, FK→`projects.id`, `onDelete: 'set null'`)を追加する
    - インデックス`idx_tasks_project_id`（`projectId`）を追加する
    - `docker compose exec server bun run db:generate`でマイグレーションファイルを生成する
  - **完了条件**: `schema.ts`に`projectId`カラムが追加され、新規マイグレーションファイルが生成されていること。既存taskデータへの破壊的変更がないこと（NULL許容カラム追加のみ）

- [x] **TASK-5-02: `TaskEntity`への`projectId`追加（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-003, REQ-102, REQ-103, REQ-201
  - **関連設計**: design.md §4.2
  - **実装詳細**:
    - `TaskEntity`/`CreateTaskEntityInput`/`TaskEntityProps`に`projectId: string | null`を追加する。`create()`の入力では必須（`undefined`不可、型レベルで強制）とし、`reconstruct()`では既存task互換のため`null`を許容する
  - **完了条件**: `TaskEntity.create`で`projectId`未指定時に型エラーになること（コンパイル時制約）。`reconstruct`で`projectId: null`のインスタンスが生成できること
  - **単体テスト要件**: `TaskEntity`の`create`/`reconstruct`テスト更新（`projectId`あり/`null`）

- [x] **TASK-5-03: `ITaskRepository`の`TaskFilters`拡張と`PostgreSQLTaskRepository`実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-5-01, TASK-5-02
  - **関連要件**: REQ-003, REQ-106, REQ-201
  - **関連設計**: design.md §3.1（既存`GET /api/tasks`への`projectId`クエリ追加方針）, §4.2
  - **実装詳細**:
    - `ITaskRepository`の`TaskFilters`に`projectId?: string`を追加し、`findByUserId`のWHERE条件に反映する
    - `PostgreSQLTaskRepository`の`save`/`findByUserId`等を`projectId`カラムに対応させる
  - **完了条件**: `findByUserId`が`projectId`指定時にそのprojectのtaskのみを返し、未指定時は従来どおり全件（project未所属task含む）を返すこと
  - **統合テスト要件**: `PostgreSQLTaskRepository`テストに`projectId`フィルタあり/なしのケースを追加し、project未所属task（`project_id = null`）が`projectId`未指定時に引き続き返ることを検証する（AC-04相当）

- [x] **TASK-5-04: スキーマ再生成と型チェック**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-5-01, TASK-5-03
  - **関連要件**: なし（インフラ）
  - **関連設計**: `.claude/rules/schema-db.md`
  - **実装詳細**:
    ```bash
    docker compose exec server bun run generate:schemas
    docker compose exec server bunx tsc --noEmit
    docker compose exec server bun test
    ```
    自動生成ファイル（`app/server/src/schemas/tasks.ts`）は手動編集しない。OpenAPI・client型生成はPhase 6でAPI層のスキーマ変更と併せて実施する
  - **完了条件**: 型エラー・テスト失敗がないこと。既存task関連テスト（`TaskEntity.test.ts`, `PostgreSQLTaskRepository.test.ts`等）が`projectId`追加に伴い破壊されていないこと（必要に応じて既存テストのフィクスチャを更新する）

## 6. このフェーズの完了条件

- `tasks.project_id`のマイグレーションが生成されていること
- `TaskEntity` / `ITaskRepository` / `PostgreSQLTaskRepository`が`projectId`に対応していること
- project未所属taskがリポジトリ層で引き続き扱えること（REQ-201）
- サーバー側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること

## 7. 実施記録

### 計画との差異

- `CreateTaskUseCase`の`TaskEntity.create()`呼び出しに`projectId: null`を暫定的に追加した。TASK-5-02で`CreateTaskEntityInput.projectId`を必須プロパティ化したことに伴う機械的な型伝播であり、`CreateTaskInput`インターフェース自体は変更していない。projectIdをAPI経由で受け取り所有権検証を行う対応はPhase 6のスコープのまま
- TASK-5-04の対象として明記されていた`TaskEntity.test.ts`/`PostgreSQLTaskRepository.test.ts`に加え、`TaskController.test.ts`（`TaskEntity.create()`を使ったモック生成箇所）と`src/schemas/__tests__/tasks.test.ts`（drizzle-zodの`selectTaskSchema`が`projectId`必須になったことに伴うフィクスチャ）も、型チェック・テストをグリーンに保つために更新が必要だったため対応した
- `db:generate:test`実行時、`app_test/meta/`配下にサンドボックス由来と見られる空ディレクトリ（`.claude/.cc-writes`）が混入しており、drizzle-kitのスナップショット読み込みが`EISDIR`で失敗した。Git管理下になく空ディレクトリだったため削除して回避した（今回のタスク内容とは無関係な環境要因）

### コードレビュー

Codex MCPで8観点（line-by-line, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, conventions）のレビューを実施。`/resolve-feedback`で妥当性・リスクを評価し、以下は見送りと判断した:

- **reuse指摘（妥当性1・リスク中）**: `CreateTaskEntityInput.projectId`を`description`同様の任意項目パターン（`projectId?: string`、`input.projectId ?? null`で正規化）にすべきという指摘。design.md §4.2・phase5.md TASK-5-02が「create()の入力では必須（undefinedを不可）とし、型レベルで強制する」と明記した意図的な設計であり、指摘は仕様と矛盾するため不採用
- **efficiency指摘（妥当性3・リスク高）**: `idx_tasks_project_id`単独ではなく`(user_id, project_id, created_at DESC)`の複合インデックスにすべきという指摘。design.md §8では単独インデックスのみが明記されており、DBインデックス変更は高リスク分類のため、実際の利用パターンが固まるPhase 6以降に必要であれば別途検討することとし、今回は対応しない

### 所要時間

- 開始: 2026-08-02 09:08 JST
- 終了: 2026-08-02 09:27 JST
- 合計: 約19分（typecheck/test/lint/semgrepの実行時間含む。品質ゲート実行はサブエージェントに委譲）
