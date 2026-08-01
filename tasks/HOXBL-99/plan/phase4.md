# Phase 4: project編集API

## 1. このフェーズの目的

`PUT /api/projects/{id}`により、project名称・説明文の更新を成立させる。更新は必ず`ProjectEntity`（`ProjectName`）による検証を経由し、未検証の入力値がリポジトリ層へ直接渡らない構成とする。

## 2. 確認可能なこと

- `docker compose exec server bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec server bun test`で本フェーズの新規テストがすべてグリーンになること
- 自分のprojectの名称・説明文を更新でき、`GET /api/projects/{id}`で更新後の値が確認できること
- 名前を空白のみ・101文字に変更しようとするとエラーになり更新されないこと
- 他ユーザーのprojectを編集しようとすると拒否されること（`AC-08`, `AC-09`）

## 3. 関連要件・関連設計

- **関連要件**: REQ-107, REQ-304, REQ-305, REQ-306, AC-08, AC-09
- **関連設計**: design.md §4.1, §7.1（`PUT /api/projects/{id}`）, §7.2

## 4. 依存関係

- **前提フェーズ**: Phase 1, Phase 3（`ProjectNotFoundError`、`findById`を利用）
- **ブロッカー**: なし

## 5. タスク一覧

- [x] **TASK-4-01: `ProjectEntity`に`updateName`/`updateDescription`を追加（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-107, REQ-304, REQ-306
  - **関連設計**: design.md §4.1
  - **実装詳細**:
    - `ProjectEntity`に`updateName(name: unknown): void`（内部で`ProjectName.create`を呼びバリデーション）と`updateDescription(description: string | undefined): void`を追加し、`updatedAt`を更新する
  - **完了条件**: 不正な名前で`updateName`を呼ぶと`InvalidProjectDataError`がスローされ、`name`が変更されないこと
  - **単体テスト要件**: 正常系（名称のみ変更、説明文のみ変更）、異常系（空白のみ・101文字での更新失敗）

- [x] **TASK-4-02: `IProjectRepository.update`の追加と実装（検証済みEntityを永続化）（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-01
  - **関連要件**: REQ-107, REQ-305
  - **関連設計**: design.md §4.1
  - **実装詳細**:
    - `IProjectRepository`に`update(userId: string, projectId: string, project: ProjectEntity): Promise<ProjectEntity | null>`を追加する。引数は生の入力値ではなく、既に`ProjectEntity.updateName`/`updateDescription`で検証済みのEntityを受け取る
    - `PostgreSQLProjectRepository.update`は`WHERE user_id = :userId AND id = :projectId`を条件に含め、ヒットしない場合は`null`を返す
  - **完了条件**: 所有者本人のprojectのみ更新され、他ユーザーのproject指定時は`null`を返すこと
  - **統合テスト要件**: 正常系（更新後の値がDBに反映される）、異常系（他ユーザーprojectで`null`）

- [x] **TASK-4-03: `UpdateProjectUseCase`の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-02
  - **関連要件**: REQ-107, REQ-304, REQ-305, REQ-306
  - **関連設計**: design.md §7.1
  - **実装詳細**:
    - `app/server/src/project/application/UpdateProjectUseCase.ts`に、`userId`・`projectId`・`input`を受け取り、以下の順で処理するユースケースを実装する:
      1. `IProjectRepository.findById(userId, projectId)`で所有者確認込みのEntityを取得する。`null`の場合は`ProjectNotFoundError`をスローする
      2. 取得したEntityに対して`updateName`/`updateDescription`を呼び、バリデーションを行う（不正値は`InvalidProjectDataError`が伝播する）
      3. 検証済みEntityを`IProjectRepository.update(userId, projectId, project)`に渡して永続化する
    - この流れにより、リポジトリの`update`に未検証の生入力が渡ることを防ぐ
  - **完了条件**: 正常系でDTOが返り、バリデーションエラー・他ユーザーproject指定時に適切なエラーがスローされること
  - **単体テスト要件**: 正常系（名称のみ/説明文のみ更新）、異常系（空白のみ・101文字、他ユーザーprojectで`ProjectNotFoundError`）

- [x] **TASK-4-04: `ProjectController`・`projectRoutes`（PUT）の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-03
  - **関連要件**: REQ-107, REQ-304, REQ-305, REQ-306
  - **関連設計**: design.md §7.1（`PUT /api/projects/{id}`）
  - **実装詳細**:
    - `shared-schemas/src/projects.ts`に`updateProjectSchema`（`name`/`description`ともに任意だが、指定時は`createProjectSchema`と同一制約）を追加する
    - `projectRoutes.schema.ts`に`PUT /api/projects/{id}`のOpenAPI定義（`200`/`400`/`404`）を追加する
    - `ProjectController`・`projectRoutes.ts`にハンドラーを追加し、`ProjectDIContainer`に`UpdateProjectUseCase`の配線を追加する
  - **完了条件**: `PUT /api/projects/{id}`が正常系で`200`、バリデーション違反で`400`、他ユーザーproject指定で`404`を返すこと
  - **統合テスト要件**: `projectRoutes.test.ts`にAC-08, AC-09を網羅するテストケースを追加する

- [x] **TASK-4-05: スキーマ再生成と型チェック**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-4-04
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

- `PUT /api/projects/{id}`がAC-08, AC-09の受け入れ基準を満たすこと
- 更新処理がリポジトリへの直接書き込みではなく、必ず`ProjectEntity`のバリデーションを経由していること
- project作成〜一覧〜詳細〜編集までのバックエンドAPIが一通り揃っていること
- サーバー・クライアント両方の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること

## 7. 実施記録

### 計画との差異

- なし。タスク計画通りに実装した。

### コードレビュー

Codex MCPで8観点（line-by-line, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, conventions）のレビューを実施。`/resolve-feedback`で妥当性・リスクを評価し、以下を反映:

- **妥当性5・低リスクで自動反映**:
  - `updateProjectSchema`を独自定義から`createProjectSchema.partial()`に変更し、名前バリデーションの重複（メッセージ・制約）を解消（`app/packages/shared-schemas/src/projects.ts`）

以下はユーザーに報告のうえ、見送りと判断した:

- **reuse指摘（妥当性4・リスク中）**: `ProjectEntity.updateDescription(description: string | undefined)`の`undefined→null`（説明文クリア）経路が、`updateProjectSchema`がundefinedのみを許容し`UpdateProjectUseCase`もundefined時はメソッドを呼ばないため、API経由では到達不能。要件上「説明文を空にする」操作は明記されておらず、Phase4完了条件にも含まれないため今回は対応せず、必要になった時点で別タスク化する
- **efficiency指摘（妥当性3・リスク高）**: `UpdateProjectUseCase`が`findById`→`update`で2回DBアクセスする点について、1クエリ（`UPDATE ... RETURNING`）にまとめる代替案が出たが、これはタスク計画・技術設計書に明記された「所有者確認込みのEntity取得→Entity層でのバリデーション→検証済みEntityの永続化」という意図的な設計（未検証の生入力をリポジトリに渡さない）そのものであり、変更しない
- **simplification指摘（妥当性3・リスク低）**: `ProjectController.update`の条件付きspread（`...(input.name !== undefined && {...})`）を単純代入に置き換える案が出たが、同ファイルの既存`create()`メソッドも同一のspreadパターンを使用しており、`update()`だけ書き方を変えるとファイル内の一貫性が崩れるため見送る

なお、以下はPhase3で既に既存パターンとして許容判断済みであり、今回も同一判断のため対応不要とした:

- テストコード内の`as unknown as`（`UpdateProjectUseCase.test.ts`）・`as any`（`projectRoutes.test.ts`の`updateProjectUseCase`）使用
- `__tests__`から親ディレクトリへの相対import

### 所要時間

- 開始: 2026-08-01 21:45 JST
- 終了: 2026-08-01 22:10 JST
- 合計: 約25分（typecheck/test/lint/semgrepの実行時間含む。品質ゲート実行はサブエージェントに委譲）
