# Phase 9: フロントエンド - task作成・編集へのproject選択統合

## 1. このフェーズの目的

`TaskCreateForm`/`TaskEditModal`にproject選択UIを組み込み、task新規作成時のproject必須選択、既存taskの所属project変更、project未所属taskの継続表示をユーザー操作として成立させる。

## 2. 確認可能なこと

- `docker compose exec client bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec client bun test`で本フェーズの新規テストがすべてグリーンになること
- task作成フォームにproject選択肢（自分のprojectのみ）が表示され、未選択のまま送信するとエラーが表示され作成されないこと
- task編集モーダルで所属projectを変更できること
- project未所属task（`projectId: null`）が一覧・編集画面に引き続き表示され、編集モーダルでprojectを選ばずに閉じても他の項目の編集が壊れないこと

## 3. 関連要件・関連設計

- **関連要件**: REQ-003, REQ-102, REQ-103, REQ-105, REQ-201, REQ-302, AC-03, AC-04, AC-05
- **関連設計**: design.md §4.3, §13（`TaskCreateForm`/`TaskEditModal`は`features/project`のフックに依存する一方向依存を維持）

## 4. 依存関係

- **前提フェーズ**: Phase 6（task⇔project統合API）, Phase 7（project一覧取得フック）
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-9-01: `TaskCreateForm`へのproject選択UI追加（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-102, REQ-105, REQ-302, AC-03
  - **関連設計**: design.md §4.3, §13
  - **実装詳細**:
    - `app/client/src/features/todo/components/TaskCreateForm.tsx`に、`features/project`の`useProjects`フック（`ProjectServicesContext`経由）を利用したproject選択セレクトを追加する
    - project未選択のまま送信した場合、クライアント側で送信をブロックしエラーメッセージを表示する（APIの`400`と同一文言）
    - `TaskCreateForm`が`features/project`のフックに依存する一方向依存を維持し、`features/project`側は`features/todo`を参照しない
  - **完了条件**: 選択肢に自分のprojectのみが表示されること。project未選択で送信がブロックされること。project選択時は`projectId`付きで作成APIが呼ばれること
  - **単体テスト要件**: `app/client/src/features/todo/__tests__/TaskCreateForm.test.tsx`を更新し、正常系（project選択ありで作成成功）、異常系（project未選択でエラー表示・送信されない）を追加する
  - **UI/UX要件**:
    - **エラー表示**: project未選択時のエラーが原因（未選択であること）と修正方法（選択操作）が分かる表示
    - **空状態**: 自分のprojectが0件の場合、project作成画面への導線を案内する
    - **モバイル対応**: セレクトUIがタップしやすいこと
    - **アクセシビリティ**: `getByLabelText`で参照可能なラベル付け

- [ ] **TASK-9-02: `TaskEditModal`へのproject選択UI追加（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-103, AC-05
  - **関連設計**: design.md §4.3
  - **実装詳細**:
    - `app/client/src/features/todo/components/TaskEditModal.tsx`に、現在の所属project（project未所属の場合は未選択状態）を初期値としたproject選択セレクトを追加する
    - project未所属task（`projectId: null`）を開いた場合でも他フィールドの編集・保存が正常に機能することを確認する
    - project変更を伴う更新時のみ`projectId`をAPIに送信する（未変更時は既存動作を維持）
  - **完了条件**: project未所属task→project所属への変更、所属済みtask→別projectへの変更がいずれも成功すること
  - **単体テスト要件**: `app/client/src/features/todo/__tests__/TaskEditModal.test.tsx`を更新し、正常系（未所属→所属、所属済み→別project変更）、既存動作（project変更なしでの他フィールド更新）を追加する
  - **UI/UX要件**:
    - **ローディング状態**: project一覧取得中の表示
    - **モバイル対応**: モーダル内セレクトがソフトウェアキーボード表示時に主要操作を妨げないこと
    - **アクセシビリティ**: フォーカス順序が自然であること

- [ ] **TASK-9-03: project未所属taskの表示確認とUI調整（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-9-02
  - **関連要件**: REQ-003, REQ-201, AC-04
  - **関連設計**: requirements.md 5.3節（REQ-201）, overview.md RISK-04
  - **実装詳細**:
    - `TaskItem`/`TaskList`が`projectId: null`のtaskを一覧に問題なく表示できることを確認する。overview.md RISK-04の方針どおり、既存の一覧表示をそのまま維持し、未所属を示す特別なバッジ等は追加しない
  - **完了条件**: project未所属taskが一覧・編集画面に表示され、既存の一覧表示が壊れていないこと
  - **単体テスト要件**: `app/client/src/features/todo/__tests__/TaskItem.test.tsx`または`TaskList.test.tsx`に、`projectId: null`のtaskが表示されるケースを追加する

- [ ] **TASK-9-04: 型チェックとテスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-9-01, TASK-9-02, TASK-9-03
  - **関連要件**: なし
  - **関連設計**: なし
  - **実装詳細**:
    ```bash
    docker compose exec client bunx tsc --noEmit
    docker compose exec client bun run fix
    docker compose exec client bun test
    docker compose run --rm semgrep semgrep app/client app/server
    ```
  - **完了条件**: 型エラー・テスト失敗・semgrep指摘がないこと

- [ ] **TASK-9-05: E2E確認（手動またはPlaywright）**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-9-04
  - **関連要件**: REQ-102, REQ-103, REQ-105, REQ-201, REQ-302
  - **関連設計**: なし
  - **実装詳細**:
    - `docker compose exec client bun run dev`でアプリを起動し、以下をブラウザで確認する: project作成→task作成時の選択→project詳細でのtask絞り込み→project編集→task編集での所属project変更→project未所属taskの継続表示
    - 既存のE2E（playwright）スイートがある場合は、影響範囲（task作成フロー）に回帰がないか実行して確認する
  - **完了条件**: 一連のユーザーフローがブラウザ上で問題なく完結すること

## 6. このフェーズの完了条件

- task作成・編集画面からproject連携がすべてユーザー操作として完結すること（UC-05, UC-06, UC-08）
- AC-03, AC-04, AC-05の受け入れ基準がフロントエンド経由でも満たされること
- クライアントの型チェック・テスト・semgrepがすべてクリアであること
- 本要件（HOXBL-99）の主要ユーザーストーリー（US-01〜US-05）がE2Eで一通り確認できること
