# Phase 8: フロントエンド - project詳細・編集UI

## 1. このフェーズの目的

project詳細画面（そのprojectに紐づくtask一覧を含む）と編集フォームを成立させる。

## 2. 確認可能なこと

- `docker compose exec client bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec client bun test`で本フェーズの新規テストがすべてグリーンになること
- `/dashboard/projects/{id}`を開くと、そのprojectの名称・説明文と、そのprojectに紐づくtaskのみが表示されること（他projectのtaskは表示されない、0件時は空一覧）
- 編集フォームから名称・説明文を更新すると画面に反映されること
- 存在しない・他ユーザーのprojectIdをURLで直接指定すると「見つかりません」の表示になること

## 3. 関連要件・関連設計

- **関連要件**: REQ-106, REQ-107, REQ-303, REQ-304, REQ-305, REQ-306, AC-08, AC-09, AC-10
- **関連設計**: design.md §4.3, §7.2, §12 RISK-01（404を「見つかりません」表現とする方針）

## 4. 依存関係

- **前提フェーズ**: Phase 3（project詳細API）, Phase 4（project編集API）, Phase 6（task絞り込みAPI）, Phase 7（`ProjectServicesContext`基盤）
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-8-01: `useProject`フック（単一取得）の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-106, REQ-303
  - **関連設計**: design.md §4.3
  - **実装詳細**:
    - `app/client/src/features/project/hooks/useProject.ts`に、`projectId`を受け取り`GET /api/projects/{id}`を呼び出すフックを実装する
    - `404`の場合は「project が見つかりません」等、権限有無を明かさない文言のErrorをthrowする（RISK-01対応）
  - **完了条件**: 正常系で詳細が取得できること。`404`時に統一された「見つかりません」文言のエラーになること
  - **単体テスト要件**: 正常系、異常系（404、その他APIエラー）

- [ ] **TASK-8-02: `useProjectMutations`への更新ミューテーション追加（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-107, REQ-304, REQ-305, REQ-306
  - **関連設計**: design.md §4.3
  - **実装詳細**:
    - Phase 7で実装した`useProjectMutations`に`updateProject`ミューテーション（`PUT /api/projects/{id}`）を追加する。成功時に該当project・project一覧のクエリキャッシュを無効化する
  - **完了条件**: 更新成功時にキャッシュが再取得されること。バリデーションエラー・404がフォーム側で扱えるErrorとしてthrowされること
  - **単体テスト要件**: 正常系（名称のみ/説明文のみ更新）、異常系（バリデーションエラー、404）

- [ ] **TASK-8-03: project詳細画面向けの`useTasks`拡張利用（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし（`features/todo`の既存`useTasks`を拡張）
  - **関連要件**: REQ-106
  - **関連設計**: design.md §3.1（`GET /api/tasks?projectId=`を流用する方針）, §4.3
  - **実装詳細**:
    - `app/client/src/features/todo/hooks/useTasks.ts`が任意の`projectId`引数を受け取れるよう拡張し、指定時はクエリパラメータに`projectId`を含める
    - `features/project`から`features/todo`への依存は作らない。ページ側（`app/dashboard/projects/[id]/page.tsx`）が両feature（`features/project`の`useProject`と`features/todo`の`useTasks(projectId)`）を組み合わせて呼び出す構成とする（design.md §4.3の一方向依存を維持）
    - Phase 6で`GET /api/tasks?projectId=`が他ユーザー・存在しないprojectIdに対して404を返すようになっているため、この404は`useProject`（TASK-8-01）が既に検出する404と重複しうる。フロントエンドでは`useProject`側の404表示を優先し、`useTasks`側の404はエラー表示を出さず空扱いにするなど、二重エラー表示にならないよう実装する
  - **完了条件**: `projectId`指定時にそのprojectのtaskのみが取得できること。未指定時は既存動作（全task取得）を維持すること
  - **単体テスト要件**: 既存`useTasks.test.tsx`に`projectId`指定ケースを追加し、既存ケース（引数なし）が壊れていないことを確認する

- [ ] **TASK-8-04: `ProjectDetail`コンポーネントの実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-8-01, TASK-8-03
  - **関連要件**: REQ-106, REQ-303
  - **関連設計**: design.md §4.3, §12 RISK-01, `.claude/rules/design-system.md`
  - **実装詳細**:
    - `app/client/src/features/project/components/ProjectDetail.tsx`に、project名称・説明文表示と、そのprojectに紐づくtask一覧（既存`TaskList`/`TaskItem`を再利用）を表示するコンポーネントを実装する
    - `404`エラー時は「project が見つかりません」の専用表示にする
  - **完了条件**: 正常系でproject情報とtask一覧が表示されること。0件時は空一覧、404時は見つからない旨の表示になること
  - **単体テスト要件**: 正常系、異常系（404表示）、境界値（task0件）
  - **UI/UX要件**:
    - **ローディング状態**: project情報・task一覧それぞれのローディング表示
    - **エラー表示**: 404を「見つかりません」として表示（権限拒否と区別しない）
    - **空状態**: そのprojectにtaskが0件の場合の空状態表示
    - **モバイル対応**: 縦スクロール基本、既存`TaskList`のレイアウト方針を踏襲
    - **アクセシビリティ**: 見出し階層でproject情報とtask一覧を区別

- [ ] **TASK-8-05: `ProjectEditForm`コンポーネントの実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-8-02
  - **関連要件**: REQ-107, REQ-304, REQ-305, REQ-306
  - **関連設計**: design.md §4.3, `.claude/rules/design-system.md`（フォーム指針）
  - **実装詳細**:
    - `app/client/src/features/project/components/ProjectEditForm.tsx`に、既存値を初期表示し名称・説明文を編集できるフォームを実装する（`TaskEditModal.tsx`のモーダルパターンを踏襲）
  - **完了条件**: 正常系で更新が成功し画面に反映されること。バリデーション違反時にエラー表示され送信されないこと
  - **単体テスト要件**: 正常系（名称のみ/説明文のみ変更）、異常系（空白のみ、101文字超）
  - **UI/UX要件**:
    - **ローディング状態**: 送信中はボタン無効化
    - **エラー表示**: 原因と修正方法が分かる表示
    - **モバイル対応**: モーダルがソフトウェアキーボード表示時・セーフエリアで主要操作を妨げないこと
    - **アクセシビリティ**: フォーカストラップ、ラベル付け

- [ ] **TASK-8-06: `/dashboard/projects/[id]`ページの実装**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-8-04, TASK-8-05
  - **関連要件**: REQ-106, REQ-107
  - **関連設計**: `app/dashboard/page.tsx`の構成パターン
  - **実装詳細**:
    - `app/client/src/app/dashboard/projects/[id]/page.tsx`に、`ProjectServicesProvider`・`TaskServicesProvider`でラップし`ProjectDetail`・`ProjectEditForm`を配置するページを実装する
    - Phase 7の`ProjectList`から詳細ページへのリンクが機能することを確認する
  - **完了条件**: `/dashboard/projects/{id}`でproject詳細・編集・そのprojectのtask一覧が確認できること

- [ ] **TASK-8-07: 型チェックとテスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-8-06
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

- `/dashboard/projects/{id}`でproject詳細閲覧・編集・そのprojectのtask一覧確認がブラウザ上で完結すること
- 他ユーザー・存在しないprojectへの直接アクセスが「見つかりません」表示になること
- クライアントの型チェック・テストがすべてグリーンであること
