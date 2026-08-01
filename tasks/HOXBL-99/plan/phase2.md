# Phase 2: project作成API（POST /api/projects）

## 1. このフェーズの目的

Phase 1で用意したドメイン・リポジトリを使い、`POST /api/projects`によるproject作成をAPI応答まで一貫して成立させる。

## 2. 確認可能なこと

- `docker compose exec server bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec server bun test`で本フェーズの新規テストがすべてグリーンになること
- JWT付きで`POST /api/projects`を呼び出し、名前のみ/名前+説明文でprojectが作成され`201`が返ること
- 名前未入力・空白のみ・101文字で`400`が返ること
- 同名projectを2件作成してもエラーにならないこと（`AC-01`, `AC-02`, `AC-07`）

## 3. 関連要件・関連設計

- **関連要件**: REQ-001, REQ-002, REQ-101, REQ-301, REQ-306, AC-01, AC-02, AC-07
- **関連設計**: design.md §5.1（処理フロー手順1）, §5.2, §7.1（`POST /api/projects`）, §7.2（エラー方針）

## 4. 依存関係

- **前提フェーズ**: Phase 1
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-2-01: `CreateProjectUseCase`の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-101, REQ-301, REQ-306
  - **関連設計**: design.md §5.1手順1
  - **実装詳細**:
    - `app/server/src/project/application/CreateProjectUseCase.ts`に、`userId`・`name`・`description`を受け取り`ProjectEntity.create`→`IProjectRepository.save`を呼ぶユースケースを実装する
    - リポジトリはDIで注入し、テストではモックを使用する
  - **完了条件**: 正常系でDTOが返り、`ProjectName`のバリデーションエラーが`InvalidProjectDataError`としてそのまま伝播すること
  - **単体テスト要件**: 正常系（説明文あり/なし）、異常系（空文字列・空白のみ・101文字の名前）

- [ ] **TASK-2-02: `ProjectDIContainer`の実装**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-2-01
  - **関連要件**: なし（インフラ）
  - **関連設計**: design.md §4.1（`ProjectDIContainer`）
  - **実装詳細**:
    - `app/server/src/project/infrastructure/ProjectDIContainer.ts`に`TaskDIContainer`と同一パターンのシングルトンDIを実装する。このフェーズでは`PostgreSQLProjectRepository`と`CreateProjectUseCase`のみを配線する
  - **完了条件**: `ProjectDIContainer.getInstance()`から`CreateProjectUseCase`が取得できること

- [ ] **TASK-2-03: shared-schemasへのproject作成スキーマ追加（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-001, REQ-301, REQ-306
  - **関連設計**: design.md §7.1, スキーマ駆動開発ガイドライン
  - **実装詳細**:
    - `app/packages/shared-schemas/src/projects.ts`を新設し、`createProjectSchema`（`name`: 必須・trim後1〜100文字, `description`: 任意）と`projectSchema`（レスポンスDTO: `id`, `userId`, `name`, `description`, `createdAt`, `updatedAt`）を定義する
    - `z.string().uuid()`等は使わず`z.uuid()`を使用する（backend.md規約）
    - テストは`app/packages/shared-schemas/__tests__/projectsSchema.test.ts`に配置
  - **完了条件**: 名前未入力・空白のみ・101文字でスキーマバリデーションが失敗すること
  - **単体テスト要件**: 正常系・異常系・境界値（100文字/101文字）

- [ ] **TASK-2-04: `ProjectController`・`projectRoutes`（POST）・OpenAPIスキーマの実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-2-02, TASK-2-03
  - **関連要件**: REQ-101, REQ-301, REQ-306
  - **関連設計**: design.md §7.1（`POST /api/projects`）, §7.2（エラー方針）
  - **実装詳細**:
    - `app/server/src/project/presentation/projectRoutes.schema.ts`に`POST /api/projects`のOpenAPI定義（`201`/`400`）を`taskRoutes.schema.ts`と同型で追加する
    - `app/server/src/project/presentation/ProjectController.ts`・`projectRoutes.ts`に`TaskController`/`taskRoutes.ts`と同一パターンでハンドラーを実装する
    - `app/server/src/shared/middleware/errorMiddleware.ts`の`ERROR_MAPPINGS`に`InvalidProjectDataError`→400を追加する
    - entrypoint（`app/server/src/entrypoints/`配下）に`projectRoutes`をマウントする
  - **完了条件**: `POST /api/projects`が名前のみ/名前+説明文で`201`、名前未入力・空白のみ・101文字で`400`を返すこと。同名projectの重複作成が`201`のまま成功すること
  - **統合テスト要件**: `app/server/src/project/presentation/__tests__/projectRoutes.test.ts`にAC-01, AC-02, AC-07を網羅するテストケースを実装する

- [ ] **TASK-2-05: スキーマ再生成と型チェック**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-2-03, TASK-2-04
  - **関連要件**: なし（インフラ）
  - **関連設計**: `.claude/rules/schema-db.md`
  - **実装詳細**:
    ```bash
    docker compose exec server bun run generate:openapi
    docker compose exec client bun run generate:types
    docker compose exec server bunx tsc --noEmit
    docker compose exec client bunx tsc --noEmit
    docker compose exec server bun test
    ```
  - **完了条件**: 型エラー・テスト失敗がないこと

## 6. このフェーズの完了条件

- `POST /api/projects`がAC-01, AC-02, AC-07の受け入れ基準を満たすこと
- サーバー・クライアント両方の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること
