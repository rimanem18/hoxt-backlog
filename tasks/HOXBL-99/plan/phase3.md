# Phase 3: project一覧・詳細取得API（アクセス制御込み）

## 1. このフェーズの目的

`GET /api/projects`と`GET /api/projects/{id}`により、ユーザーが自分のprojectのみを一覧・詳細取得できる状態を成立させる。他ユーザーのprojectへのアクセスは404で拒否する。

## 2. 確認可能なこと

- `docker compose exec server bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec server bun test`で本フェーズの新規テストがすべてグリーンになること
- JWT付きで`GET /api/projects`を呼び出すと、自分が作成したprojectのみが返ること（他ユーザーのprojectは含まれない）
- `GET /api/projects/{id}`で自分のprojectは詳細が取得でき、他ユーザーのprojectは`404`が返ること（`AC-06`）

## 3. 関連要件・関連設計

- **関連要件**: REQ-104, REQ-106, REQ-303, NFR-101, AC-06
- **関連設計**: design.md §3.1（アクセス制御方針: 所有者IDクエリ→404）, §4.1, §7.1, §7.2, §9

## 4. 依存関係

- **前提フェーズ**: Phase 1, Phase 2
- **ブロッカー**: なし

## 5. タスク一覧

- [x] **TASK-3-01: `ProjectNotFoundError`の追加**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-303, NFR-101
  - **関連設計**: design.md §7.2
  - **実装詳細**:
    - `app/server/src/project/domain/errors/ProjectNotFoundError.ts`に`ProjectDomainError`を継承した404エラー（`code: PROJECT_NOT_FOUND`）を実装する
    - `errors/index.ts`のexportに追加する
  - **完了条件**: `TaskNotFoundError`と同型のプロパティ（`status`, `code`）を持つこと
  - **単体テスト要件**: `app/server/src/project/domain/__tests__/errors.test.ts`にエラー型・プロパティの検証を追加する

- [x] **TASK-3-02: `IProjectRepository`に`findByUserId`/`findById`を追加し実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-01
  - **関連要件**: REQ-104, REQ-106, REQ-303
  - **関連設計**: design.md §4.1, §3.1
  - **実装詳細**:
    - `IProjectRepository`に`findByUserId(userId: string): Promise<ProjectEntity[]>`と`findById(userId: string, projectId: string): Promise<ProjectEntity | null>`を追加する
    - `findById`は必ず`userId`をWHERE条件に含め、他ユーザーのprojectはヒットしない（`null`）ようにする（`PostgreSQLTaskRepository`と同一パターン）
    - `PostgreSQLProjectRepository`に両メソッドを実装する
  - **完了条件**: `findByUserId`が指定ユーザーのprojectのみを返すこと。`findById`は所有者本人のみヒットし、他ユーザー指定時は`null`を返すこと
  - **統合テスト要件**: 複数ユーザーのprojectが混在する状態で、自分のprojectのみが返ることを検証する

- [x] **TASK-3-03: `GetProjectsUseCase`・`GetProjectByIdUseCase`の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-02
  - **関連要件**: REQ-104, REQ-106, REQ-303
  - **関連設計**: design.md §5.1手順2・4
  - **実装詳細**:
    - `app/server/src/project/application/GetProjectsUseCase.ts`: `userId`から`findByUserId`を呼びDTO配列を返す
    - `app/server/src/project/application/GetProjectByIdUseCase.ts`: `userId`・`projectId`から`findById`を呼び、`null`の場合は`ProjectNotFoundError`をスローする
  - **完了条件**: `GetProjectByIdUseCase`が他ユーザーのproject指定時に`ProjectNotFoundError`をスローすること
  - **単体テスト要件**: 正常系（一覧取得、詳細取得）、異常系（他ユーザーprojectで`ProjectNotFoundError`、存在しないIDで`ProjectNotFoundError`）

- [x] **TASK-3-04: `ProjectController`・`projectRoutes`（GET一覧・GET詳細）の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-03
  - **関連要件**: REQ-104, REQ-106, REQ-303
  - **関連設計**: design.md §7.1（`GET /api/projects`, `GET /api/projects/{id}`）, §7.2
  - **実装詳細**:
    - `projectRoutes.schema.ts`に`GET /api/projects`（`200`）、`GET /api/projects/{id}`（`200`/`404`）のOpenAPI定義を追加する
    - `ProjectController`・`projectRoutes.ts`にハンドラーを追加する
    - `ProjectDIContainer`に`GetProjectsUseCase`・`GetProjectByIdUseCase`の配線を追加する
    - `errorMiddleware`の`ERROR_MAPPINGS`に`ProjectNotFoundError`→404を追加する
  - **完了条件**: `GET /api/projects`が自分のprojectのみを返すこと。`GET /api/projects/{id}`が自分のprojectは`200`、他ユーザーのprojectは`404`を返すこと
  - **統合テスト要件**: `projectRoutes.test.ts`にAC-06（自分のみ一覧表示、他ユーザーprojectへの直接操作が404で拒否される）を追加する

- [x] **TASK-3-05: スキーマ再生成と型チェック**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-3-04
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

- `GET /api/projects`、`GET /api/projects/{id}`がAC-06の受け入れ基準を満たすこと
- 他ユーザーのprojectへのアクセスが一貫して404で拒否されること（403ではない）
- サーバー・クライアント両方の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること

## 7. 実施記録

### 計画との差異

- なし。タスク計画通りに実装した。`findByUserId`の並び順（作成日時降順）はdesign.md §8で言及されている`idx_projects_user_created`インデックスの意図に沿って、Codexレビュー指摘を受けて実装時に追加した（計画には明記されていなかった軽微な補完）。

### コードレビュー

Codex MCPで8観点（line-by-line, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, conventions）のレビューを実施。`/resolve-feedback`で妥当性・リスクを評価し、以下を反映:

- **妥当性5・低リスクで自動反映**:
  - `PostgreSQLProjectRepository.findByUserId`に`ORDER BY created_at DESC`を追加（テストも追加）
  - `projectRoutes.schema.ts`の`getProjectRoute`パスパラメータを禁止パターン`z.string().uuid()`から`z.uuid()`に修正
- **ユーザー承認を得て追加対応**:
  - `GetProjectsUseCase.execute`の冗長な`return await`を`return`に修正
  - `getProjectRoute`のOpenAPI定義に400レスポンスを追加

以下は既存`task`ドメインの実装と一貫性を保つため、または設計判断として意図的なものと判断し見送った:

- `projectRoutes.ts`の本番用インスタンスとテスト用ファクトリー間のルート構築処理重複（`taskRoutes.ts`も同型の重複を持つ既存パターン。Phase2でも同様判断）
- `ProjectNotFoundError.forProjectId`ファクトリメソッド（`TaskNotFoundError.forTaskId`と同型の既存パターン）
- `findByUserId`のページネーション未実装（既存`ITaskRepository.findByUserId`も同様。要件・設計上の要求なし）
- `idx_projects_user_id`と複合インデックスの重複指摘（DBマイグレーション変更は本フェーズのスコープ外）
- `ProjectNotFoundError`のdomain層配置（design.md §7.2で明示的に指定された配置であり、`TaskNotFoundError`と同型の全ドメイン共通パターン）
- `IProjectRepository.findById`の命名（`ITaskRepository.findById`と同名の既存パターン）
- テストコード内の`as unknown as`・`as any`使用（既存`task`ドメインのテストでも同様に使用されている既存パターン。Phase2でも同様判断）
- `__tests__`から親ディレクトリへの相対importとバックエンドガイドラインの不一致（`task`ドメインの既存テストも同じ相対importを使用しており、コード側ではなくガイドライン記載の方が実態と合っていない可能性が高い。今回はコード修正不要と判断）

### 所要時間

- 開始: 2026-08-01 21:14 JST
- 終了: 2026-08-01 21:41 JST
- 合計: 約28分（typecheck/test/lint/semgrep/buildの実行時間含む。品質ゲート実行はサブエージェントに委譲）
