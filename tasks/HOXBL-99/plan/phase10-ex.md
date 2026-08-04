# Phase 10-ex: タスク一覧へのプロジェクト名ラベル表示（未決・検討中）

> **注意**: このフェーズはrequirements.md / technical-design.md のいずれにも記載がない追加検討事項であり、実施するかどうか未確定。着手前に必ずユーザーに実施要否を確認すること。

## 1. このフェーズの目的（想定）

タスク一覧（`TaskList`/`TaskItem`）の各タスクに、そのタスクが所属するprojectの名称をラベルとして表示する。project未所属タスクにはラベルを表示しない。

## 2. 経緯

以下2点について、Phase 7完了時にユーザーから「以降のフェーズで対応予定か」の確認依頼があった:

1. project指定でタスクを追加した際、直前に選択したprojectが選択されたままになる
2. タスク一覧のタスクにプロジェクト名ラベルを表示し、10文字を超える場合は10文字以下に切り捨てる

確認の結果:

- **1.は方針を再確認し対応済み**: 当初Phase 6のコードレビューで「連続作成時に前回選択したprojectが意図せず残る」という指摘を受け、`TaskCreateForm.tsx`の作成成功時ハンドラに`setProjectId('')`を追加していた。しかしユーザーから「同じprojectへ連続してtaskを追加することの方が多いため、選択状態は保持してほしい」とのフィードバックを受け、Phase 7完了後に方針を再確認した。`setProjectId('')`を削除し、作成成功後もproject選択を維持する挙動に変更済み（`TaskCreateForm.test.tsx`に`作成成功後も選択中のプロジェクトが保持される`テストを追加）。追加対応は不要
  - なお、project詳細画面から直接taskを作成する導線について確認したところ、ユーザーから追加希望があったため、Phase 8計画に`TASK-8-05`（`TaskCreateForm`への`fixedProjectId`props追加）・`TASK-8-07`（詳細ページへの組み込み）として追加済み（`tasks/HOXBL-99/plan/phase8.md`参照）
- **2.は未計画**: `requirements.md`のREQ-106/REQ-201や`design.md`§4.2/§4.3にも、タスク一覧上でのproject名表示・文字数切り捨てに関する記述は存在しない。`TaskItem.tsx`も現時点でproject名を表示していない。overview.md RISK-04は「project未所属taskの特別なバッジ等は追加しない」とのみ言及しており、project所属taskのラベル表示自体には触れていない

## 3. 関連要件・関連設計

- **関連要件**: なし（未決事項。強いて挙げるならREQ-106「project詳細画面でのtask絞り込み」の周辺文脈だが、タスク一覧側の表示仕様としては未記載）
- **関連設計**: なし

## 4. 依存関係

- **前提フェーズ**: Phase 7（`features/project`基盤）, Phase 9（`TaskItem`/`TaskList`がprojectId未所属taskを引き続き表示する前提を維持していること）
- **ブロッカー**: 実施要否がユーザー未確定

## 5. タスク一覧（想定・未着手）

- [ ] **TASK-10ex-01: `TaskItem`へのプロジェクト名ラベル表示（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **実装詳細（想定）**:
    - `Task`型の`projectId`から対応するproject名を解決する手段を検討する（`features/todo`は現状`features/project`に依存しない設計のため、design.md §13の一方向依存方針との整合を要検討。`TaskList`側でproject一覧を取得し`TaskItem`にproject名をpropsで渡す構成が現行の依存方向に合致する）
    - project未所属task（`projectId: null`）にはラベルを表示しない
    - project名が10文字を超える場合は、先頭10文字＋省略記号（例: `...`）で切り捨てて表示する（全文はtitle属性等で確認可能にすることを検討）
  - **完了条件**: project所属taskにはproject名ラベルが表示され、10文字超は切り捨てられること。project未所属taskにはラベルが表示されないこと
  - **単体テスト要件**: 正常系（10文字以内のproject名がそのまま表示）、境界値（ちょうど10文字、11文字での切り捨て）、project未所属taskでラベル非表示

- [ ] **TASK-10ex-02: 型チェックとテスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-10ex-01
  - **実装詳細**:
    ```bash
    docker compose exec client bunx tsc --noEmit
    docker compose exec client bun run fix
    docker compose exec client bun test
    ```
  - **完了条件**: 型エラー・テスト失敗がないこと

## 6. このフェーズの完了条件（想定）

- タスク一覧の各タスクにproject名ラベル（10文字超は切り捨て）が表示されること
- project未所属taskの表示（REQ-201）が引き続き壊れていないこと
- 実施する場合はユーザーとの合意のうえで本ファイルの「未決・検討中」表記を解除してから着手すること
