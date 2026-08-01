# Phase 6: task作成・更新・一覧APIのproject統合（所有権検証込み）

## 1. このフェーズの目的

`POST/PUT/GET /api/tasks`にproject連携を組み込み、task新規作成時のproject必須選択、既存taskへの後からの紐付け、project詳細画面向けのtask絞り込みをAPIレベルで成立させる。他ユーザー・存在しないprojectIdの指定はいずれも404で拒否する。

## 2. 確認可能なこと

- `docker compose exec server bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec server bun test`で本フェーズの新規テスト・既存task関連テストがすべてグリーンになること
- `POST /api/tasks`で`projectId`未指定時に`400`、自分のproject指定時に`201`、他ユーザーのproject指定時に`404`が返ること
- `PUT /api/tasks/{id}`で`projectId`を自分の別のprojectに変更できること
- `GET /api/tasks?projectId={id}`でそのprojectに紐づくtaskのみが返り（0件時は空配列）、他ユーザー・存在しないprojectId指定時は`404`が返ること
- 移行前から存在するproject未所属task（`project_id = null`）が`GET /api/tasks`のレスポンスに引き続き含まれること

## 3. 関連要件・関連設計

- **関連要件**: REQ-003, REQ-102, REQ-103, REQ-106, REQ-201, REQ-302, REQ-303, AC-03, AC-04, AC-05, AC-10
- **関連設計**: design.md §4.2（既存task側の変更）, §5.1・§5.2, §7.1（`POST/PUT/GET /api/tasks`拡張）, §13（N+1回避）, overview.md 2章・RISK-05（`GET /api/tasks?projectId=`の所有権検証）

## 4. 依存関係

- **前提フェーズ**: Phase 3（`IProjectRepository.findById`, `ProjectNotFoundError`）, Phase 5（`TaskEntity`/`ITaskRepository`のprojectId対応）
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-6-01: `CreateTaskUseCase`への所有権検証組み込み（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-102, REQ-302, REQ-303
  - **関連設計**: design.md §4.2, §13（N+1回避）
  - **実装詳細**:
    - `CreateTaskUseCase`が`projectId`を受け取り、`IProjectRepository.findById(userId, projectId)`で所有権を検証してから`TaskEntity.create`を呼ぶよう変更する。`findById`が`null`の場合は`ProjectNotFoundError`をスローする
    - `IProjectRepository`は1リクエストにつき1回のみ呼び出されることをテストでモックの呼び出し回数として検証する
  - **完了条件**: 自分のproject指定時は成功、他ユーザーproject指定時は`ProjectNotFoundError`が伝播すること
  - **単体テスト要件**: 正常系（自分のprojectでtask作成成功）、異常系（他ユーザーprojectで`ProjectNotFoundError`）、`IProjectRepository.findById`の呼び出し回数が1回であることの検証

- [ ] **TASK-6-02: `UpdateTaskUseCase`への所有権検証組み込み（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-103
  - **関連設計**: design.md §4.2
  - **実装詳細**:
    - `UpdateTaskUseCase`が`projectId`を受け取った場合のみ、`CreateTaskUseCase`と同様の所有権検証を行う。`projectId`が渡されない場合は既存の所属を変更しない
  - **完了条件**: project未所属task・project所属済みtaskいずれについても、`projectId`を指定した更新で所属projectが変更されること。他ユーザーproject指定時は`ProjectNotFoundError`が伝播すること
  - **単体テスト要件**: 正常系（未所属→所属、所属済み→別project）、異常系（他ユーザーprojectで`ProjectNotFoundError`）

- [ ] **TASK-6-03: `GetTasksUseCase`への`projectId`フィルタと所有権検証の組み込み（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-106, REQ-303
  - **関連設計**: design.md §3.1, overview.md RISK-05
  - **実装詳細**:
    - `GetTasksUseCase`が`projectId`を受け取った場合、まず`IProjectRepository.findById(userId, projectId)`で所有権を検証する。`null`の場合は`ProjectNotFoundError`をスローし、`ITaskRepository`への問い合わせは行わない（他ユーザー・存在しないprojectIdに対して「空配列」を返してREQ-303/NFR-101の拒否が曖昧になることを防ぐ）
    - 所有権が確認できた場合のみ`ITaskRepository.findByUserId`に`projectId`フィルタを伝播する
    - `projectId`未指定時は所有権検証をスキップし、従来どおり全task（project未所属task含む）を返す
  - **完了条件**: `projectId`指定時はそのprojectのtaskのみ、未指定時は従来どおり全task。他ユーザー・存在しないprojectId指定時は`ProjectNotFoundError`が伝播すること
  - **単体テスト要件**: 正常系（`projectId`指定時の絞り込み）、異常系（他ユーザー・存在しないprojectIdで`ProjectNotFoundError`）、境界値（対象projectにtaskが0件の場合は空配列）

- [ ] **TASK-6-04: task関連APIスキーマ・ルートの拡張（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-6-01, TASK-6-02, TASK-6-03
  - **関連要件**: REQ-102, REQ-103, REQ-106, REQ-302
  - **関連設計**: design.md §7.1（`POST/PUT/GET /api/tasks`拡張）
  - **実装詳細**:
    - `shared-schemas/src/tasks.ts`: `createTaskSchema`に`projectId`（必須, `z.uuid()`）を追加、`updateTaskSchema`に`projectId`（任意, `z.uuid()`）を追加、`taskSchema`（レスポンスDTO）に`projectId: string | null`を追加
    - `taskRoutes.schema.ts`: `POST /api/tasks`の`400`（`projectId`未指定）、`GET /api/tasks`の`projectId`クエリパラメータ（任意）と`404`レスポンスを反映
    - `taskRoutes.ts`/`TaskController`: `GET /api/tasks`のクエリから`projectId`を取り出し`GetTasksUseCase`に渡す
  - **完了条件**: `POST /api/tasks`で`projectId`未指定が`400`（`VALIDATION_ERROR`）になること。`GET /api/tasks?projectId=`が所有権検証込みで機能すること
  - **統合テスト要件**: `taskRoutes.test.ts`にAC-03（project未選択で作成失敗）、AC-05（所属project変更）、AC-10（project詳細向け絞り込み、0件時空配列）、AC-04（project未所属taskが一覧に引き続き含まれる）、他ユーザー・存在しないprojectId指定時の`GET /api/tasks?projectId=`が404になるケースを追加する

- [ ] **TASK-6-05: スキーマ再生成・型チェック・既存テスト回帰確認**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-6-04
  - **関連要件**: なし（インフラ）
  - **関連設計**: `.claude/rules/schema-db.md`
  - **実装詳細**:
    ```bash
    docker compose exec server bun run generate:schemas
    docker compose exec server bun run generate:openapi
    docker compose exec client bun run generate:types
    docker compose exec server bunx tsc --noEmit
    docker compose exec client bunx tsc --noEmit
    docker compose exec server bun test
    ```
  - **完了条件**: 型エラー・テスト失敗がないこと。既存task関連テスト（`CreateTaskUseCase.test.ts`等）が`projectId`必須化に伴い破壊されていないこと（必要に応じて既存テストのフィクスチャを更新する）

## 6. このフェーズの完了条件

- `POST/PUT/GET /api/tasks`がAC-03, AC-04, AC-05, AC-10の受け入れ基準を満たすこと
- `GET /api/tasks?projectId=`で他ユーザー・存在しないprojectIdの指定が404で拒否されること（空配列にならない）
- project未所属taskが一覧・更新のいずれの経路でも壊れずに引き続き扱えること（REQ-201）
- `IProjectRepository.findById`によるtask作成・更新・一覧時の所有権検証がN+1にならないこと
- サーバー・クライアント両方の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること
