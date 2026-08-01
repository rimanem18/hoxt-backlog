# Phase 7: フロントエンド - project一覧・作成UI

## 1. このフェーズの目的

`features/project`を新設し、ブラウザ上でproject一覧の閲覧とproject作成をユーザー操作として成立させる。

## 2. 確認可能なこと

- `docker compose exec client bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec client bun test`で本フェーズの新規テストがすべてグリーンになること
- ブラウザで`/dashboard/projects`を開き、project作成フォームから名前（必須）・説明文（任意）を送信すると一覧に反映されること
- project0件時に空状態が表示されること
- 送信中・エラー時（名前未入力等）の表示が確認できること

## 3. 関連要件・関連設計

- **関連要件**: REQ-001, REQ-002, REQ-101, REQ-104, REQ-301, REQ-306
- **関連設計**: design.md §4.3（フロントエンド境界: `features/project`新設）, §13（`ProjectServicesContext`新設方針）

## 4. 依存関係

- **前提フェーズ**: Phase 2（project作成API）, Phase 3（project一覧API）
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-7-01: `useProjects`フック（一覧取得）の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-104
  - **関連設計**: design.md §4.3, `features/todo/hooks/useTasks.ts`パターン
  - **実装詳細**:
    - `app/client/src/features/project/hooks/useProjects.ts`に、TanStack React Queryで`GET /api/projects`を呼び出すフックを実装する（`useTasks.ts`と同一のエラーハンドリングパターン: ネットワークエラーは統一メッセージ、その他はそのまま伝播）
    - テストは`app/client/src/features/project/__tests__/useProjects.test.ts`に配置
  - **完了条件**: 正常系でproject一覧が取得できること。APIエラー時に適切なエラーメッセージがthrowされること
  - **単体テスト要件**: 正常系（一覧取得）、異常系（APIエラー、ネットワークエラー）、境界値（0件）

- [ ] **TASK-7-02: `useProjectMutations`フック（作成）の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-101, REQ-301, REQ-306
  - **関連設計**: design.md §4.3, `features/todo/hooks/useTaskMutations.ts`パターン
  - **実装詳細**:
    - `app/client/src/features/project/hooks/useProjectMutations.ts`に、`POST /api/projects`を呼び出す`createProject`ミューテーションを実装する。成功時にproject一覧のクエリキャッシュを無効化する
  - **完了条件**: 作成成功時に一覧キャッシュが再取得されること。APIエラー（`400`）がフォーム側で扱えるErrorとしてthrowされること
  - **単体テスト要件**: 正常系（作成成功）、異常系（バリデーションエラーのAPIレスポンス）

- [ ] **TASK-7-03: `ProjectServicesContext`の実装**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-7-01, TASK-7-02
  - **関連要件**: なし（テスト基盤）
  - **関連設計**: design.md §13, `.claude/rules/frontend.md`のContext-based DIパターン
  - **実装詳細**:
    - `app/client/src/features/project/lib/ProjectServicesContext.tsx`に、`TaskServicesContext.tsx`と同一パターンで`useProjects`/`useProjectMutations`を注入するProviderを実装する
  - **完了条件**: `ProjectServicesProvider`未使用時にエラーがスローされ、テストでモックサービスを注入できること

- [ ] **TASK-7-04: `ProjectList`コンポーネントの実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-7-03
  - **関連要件**: REQ-104
  - **関連設計**: design.md §4.3, `.claude/rules/design-system.md`
  - **実装詳細**:
    - `app/client/src/features/project/components/ProjectList.tsx`に、`useProjectServices().useProjects`から一覧を取得し表示するコンポーネントを実装する
    - モバイルファーストのカードレイアウト（`TaskList`/`TaskItem`のレイアウト方針を踏襲）。名前・説明文（先頭数行）を表示し、タップでproject詳細（Phase 8）へ遷移できるリンクを配置する
  - **完了条件**: 一覧が正しく描画されること
  - **単体テスト要件**: `getByRole`等のユーザー中心クエリで一覧項目を検証する
  - **UI/UX要件**:
    - **ローディング状態**: 取得中はローディング表示
    - **エラー表示**: 取得失敗時にエラーメッセージ表示
    - **空状態**: project0件時に「まだprojectがありません」等の空状態と作成導線を表示
    - **モバイル対応**: 縦スクロール基本、カード化、タップ領域確保
    - **アクセシビリティ**: `getByRole`でナビゲート可能なリンク・見出し構造

- [ ] **TASK-7-05: `ProjectCreateForm`コンポーネントの実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-7-03
  - **関連要件**: REQ-001, REQ-002, REQ-101, REQ-301, REQ-306
  - **関連設計**: design.md §4.3, `.claude/rules/design-system.md`（フォーム指針）
  - **実装詳細**:
    - `app/client/src/features/project/components/ProjectCreateForm.tsx`に、名前（必須, 最大100文字）・説明文（任意）の入力フォームを実装する。`TaskCreateForm.tsx`と同一のフォームパターン（`user-event`前提の入力、送信中は二重送信防止）を踏襲する
    - クライアント側バリデーション（空文字列・空白のみ・101文字超）はAPI側と同一メッセージで即時フィードバックする
  - **完了条件**: 正常系で作成が成功し一覧が更新されること。バリデーション違反時にエラーメッセージが表示され送信されないこと
  - **単体テスト要件**: 正常系（名前のみ/名前+説明文）、異常系（空文字列、空白のみ、101文字超）、送信中の二重送信防止
  - **UI/UX要件**:
    - **ローディング状態**: 送信中はボタン無効化・処理中表示
    - **エラー表示**: バリデーションエラー・APIエラーの原因と修正方法が分かる表示
    - **モバイル対応**: 入力項目最小限、タップしやすいボタン配置
    - **アクセシビリティ**: `getByLabelText`で参照可能なラベル付け

- [ ] **TASK-7-06: `/dashboard/projects`ページの実装**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-7-04, TASK-7-05
  - **関連要件**: REQ-101, REQ-104
  - **関連設計**: `app/dashboard/page.tsx`の構成パターン
  - **実装詳細**:
    - `app/client/src/app/dashboard/projects/page.tsx`に、`ProjectServicesProvider`でラップし`ProjectCreateForm`・`ProjectList`を配置するページを実装する
    - ダッシュボードから`/dashboard/projects`への導線（ナビゲーションリンク）を追加する
  - **完了条件**: ページにアクセスするとproject作成フォームと一覧が表示されること

- [ ] **TASK-7-07: 型チェックとテスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-7-06
  - **関連要件**: なし
  - **関連設計**: なし
  - **実装詳細**:
    ```bash
    docker compose exec client bunx tsc --noEmit
    docker compose exec client bun run fix
    docker compose exec client bun test
    ```
  - **完了条件**: 型エラー・テスト失敗がないこと

## 6. このフェーズの完了条件

- `/dashboard/projects`でproject一覧の閲覧とproject作成がブラウザ上で完結すること
- ローディング・エラー・空状態のUI/UXが実装されていること
- クライアントの型チェック・テストがすべてグリーンであること
