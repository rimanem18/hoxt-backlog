# Phase 9: フロントエンド - task作成・編集へのproject選択統合

> **⚠️ 一部前倒し済み: 着手前に必ずPhase 6の実施記録を確認すること**
>
> Phase 6実装時、`createTaskBodySchema`の`projectId`必須化によりクライアントの型チェックが壊れる問題が発生し、ユーザーと協議のうえ、本フェーズ（TASK-9-01相当）の一部を前倒しで実装済み。詳細は`tasks/HOXBL-99/plan/phase6.md`の「7. 実施記録 > 計画との差異」を参照。
>
> **前倒し済み**:
> - `app/client/src/features/project/hooks/useProjects.ts`（TASK-7-01相当、`useProjectMutations`は未実装）
> - `app/client/src/features/project/lib/ProjectServicesContext.tsx`（TASK-7-03相当の一部）
> - `TaskCreateForm.tsx`へのproject選択セレクト・未選択時の送信ブロック（TASK-9-01相当）
> - `dashboard/page.tsx`への`ProjectServicesProvider`追加
>
> **未対応（本フェーズで引き続き対応が必要）**:
> - `TaskEditModal.tsx`へのproject選択UI（TASK-9-02、未着手）
> - project0件時の「project作成画面への導線」案内（`/dashboard/projects`ページ自体がPhase 7未実装のため簡易メッセージのみ）
> - `app/client/e2e/todo/helpers/task-setup.ts`に`/api/projects`のモックルートが未整備。現状のE2Eヘルパーではproject選択肢が0件になり、task作成フローのE2Eが失敗する
> - `TaskCreateForm.test.tsx`は前倒し実装に合わせて更新済みだが、TASK-9-01のタスク一覧の単体テスト要件を満たしているか改めて確認すること

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

- [x] **TASK-9-01: `TaskCreateForm`へのproject選択UI追加（Red→Green）**
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

- [x] **TASK-9-02: `TaskEditModal`へのproject選択UI追加（Red→Green）**
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

- [x] **TASK-9-03: project未所属taskの表示確認とUI調整（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-9-02
  - **関連要件**: REQ-003, REQ-201, AC-04
  - **関連設計**: requirements.md 5.3節（REQ-201）, overview.md RISK-04
  - **実装詳細**:
    - `TaskItem`/`TaskList`が`projectId: null`のtaskを一覧に問題なく表示できることを確認する。overview.md RISK-04の方針どおり、既存の一覧表示をそのまま維持し、未所属を示す特別なバッジ等は追加しない
  - **完了条件**: project未所属taskが一覧・編集画面に表示され、既存の一覧表示が壊れていないこと
  - **単体テスト要件**: `app/client/src/features/todo/__tests__/TaskItem.test.tsx`または`TaskList.test.tsx`に、`projectId: null`のtaskが表示されるケースを追加する

- [x] **TASK-9-04: 型チェックとテスト実行**
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

- [x] **TASK-9-05: E2E確認（手動またはPlaywright）**
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

## 7. 実施記録

### 計画との差異

- **`TaskCreateForm`のproject0件時導線が未実装だった**: Phase 6での前倒し実装ではproject選択セレクトと未選択時のエラー表示までは対応済みだったが、TASK-9-01のUI/UX要件「project0件の場合、project作成画面への導線を案内する」は未着手のまま残っていた。本フェーズで`/dashboard/projects`への案内リンク（projectが0件かつ`fixedProjectId`未指定の場合のみ表示）を追加し、テストケースを2件（表示される・表示されない）追加した
- **`TaskEditModal`への所属project変更UIをTASK-9-02として新規実装**: 現在の所属project（`projectId`）を初期値としたセレクトを追加。プロジェクト未所属タスク（`projectId: null`）を開いた場合は「未所属」を含む選択肢を表示し、既に所属済みのタスクでは「未所属」選択肢自体を表示しない仕様とした（後述のCodexレビュー指摘を受けた対応）。project一覧取得中は「プロジェクトを読み込み中...」を表示する
- **`UpdateTaskBody`型に`projectId?: string`を追加**: `useTaskMutations.ts`のローカル型定義が`shared-schemas`の`updateTaskBodySchema`（`projectId: uuidSchema.optional()`）と乖離していたため、Codexレビューの指摘を受けて追加した
- **`renderDashboardShell.tsx`（dashboardテストヘルパー）の修正が必要になった**: `TaskEditModal`が`useProjectServices()`を要求するようになったことで、既存の`DashboardShell`関連テスト（11件）がすべて「ProjectServicesProviderが見つからない」エラーで失敗するようになった。テストヘルパーに`ProjectServicesProvider`（デフォルトでproject0件を返すモック）のラップを追加して解消した
- **E2Eテストの`/api/projects`モック未整備を本フェーズで解消**: phase9.md冒頭の前倒し実施記録で「未対応」として記録されていた既知ギャップ（Phase 6時点から持ち越し）。`app/client/e2e/todo/task.spec.ts`の2ケースが、project選択が必須化されたことで実際に失敗する状態だったことを確認した（本フェーズ着手前の時点で既に壊れていた）。`task-setup.ts`に`setupProjectApiMocks`/`buildMockProject`を追加し、`openDashboardWithTasks`が自動的に`/api/projects`をモックするよう修正。影響を受けていた2テストにproject選択操作を追加して修正した

### コードレビュー

Codex MCPで8観点（line-by-line, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, conventions）のレビューを実施。妥当性の高い指摘は反映した:

- **line-by-line/removed-behavior/altitude/conventions指摘（採用、複数観点で同一問題を指摘）**: `TaskEditModal.tsx`で、既に所属済みのタスクでも「未所属」を選択でき、保存すると空文字の`projectId`が送信されバックエンドの`uuidSchema`検証に失敗する不具合。「未所属に戻す」操作は要件（AC-05は所属追加・別projectへの変更のみを要求）に存在しないため、所属済みタスクでは「未所属」の選択肢自体を非表示にする対応で解消した。該当テストケースも追加した
- **cross-file指摘（採用）**: `useTaskMutations.ts`の`UpdateTaskBody`型に`projectId`が定義されておらず、実際に送信している値と型定義が乖離していた。型を追加して解消
- **efficiency指摘（採用）**: `TaskEditModal`が`task === null`（モーダル非表示）の間も`useProjects()`を無条件に呼び出しており、ダッシュボード読み込み時に不要な`/api/projects`取得が発生していた。`useProjects({ enabled: props.task !== null })`に変更（`TaskCreateForm`の`fixedProjectId`指定時と同様のパターンを踏襲）
- **reuse指摘（見送り）**: `TaskCreateForm.tsx`と`TaskEditModal.tsx`のproject選択セレクトのマークアップ（`useProjects`呼び出し・選択肢生成）が重複しているため共通コンポーネント化すべきという指摘。両者はプレースホルダーの意味が異なる（前者は「未選択」で送信ブロックする必須項目、後者は「未所属」で選択によって挙動が変わる任意項目）ため、共通化すると分岐が増え複雑化する懸念があり、Phase 8での類似指摘（`ProjectCreateForm`/`ProjectEditForm`のバリデーション重複）と同様に今回は見送り、将来的な検討課題として残す
- **reuse指摘（見送り）**: `TaskEditModal.test.tsx`の`renderWithProviders`ヘルパーが`TaskCreateForm.test.tsx`とほぼ同一構造であり共通化できるという指摘。テストファイル間でのヘルパー共有はスコープが広がるため、本フェーズでは見送り
- **simplification指摘（見送り）**: `TaskEditModal.test.tsx`の各テストで同一のmock定義（`mockOnClose`、`mockUseTaskMutations`等）を繰り返しており冗長という指摘。既存の`TaskCreateForm.test.tsx`も同じパターンであり、プロダクト全体の既存テストスタイルとの一貫性を優先し変更しない
- **simplification指摘（見送り）**: `TaskItem.test.tsx`に追加したproject未所属タスクの表示確認テストが、既存のタイトル表示テストと実質的に重複しているという指摘。`TaskItem`はREQ-201により「projectId: nullのタスクでもレンダリングが壊れないこと」を確認する回帰防止の意味を持たせているため、テスト意図が異なるとして維持した
- **conventions指摘（見送り）**: `TaskEditModal`にフィールド追加後もモーダルに`max-height`/`overflow-y-auto`が設定されておらず、小画面・ソフトウェアキーボード表示時に主要操作が隠れる可能性があるという指摘。Phase 8の同種指摘と同様、既存の`TaskEditModal`自体が元から同じパターンであり、本フェーズの差分としては見送り、プロダクト全体の課題として別途検討が望ましい
- **conventions指摘（見送り）**: project一覧取得が失敗した場合、`TaskEditModal`がエラー状態を表示せず「未所属」のみの正常なセレクトに見えてしまうという指摘。`TaskCreateForm`も同様に`useProjects`の`error`を扱っておらず、既存パターンとの一貫性を優先し今回は変更しない

### E2E確認

`docker compose exec e2e npx playwright test todo/`で、`app/client/e2e/todo/`配下の既存E2Eスイート（chromium/firefox、計18テスト）を実行し、全件成功を確認した。本フェーズ着手前の時点で`task.spec.ts`の2テスト（新規タスク作成、タスク作成失敗時のエラー表示）が「未対応の既知ギャップ」（`/api/projects`モック未整備）により実際に失敗していたことを確認し、対応後は解消された。

### 既知のバグ（本フェーズでは見送り・未解決）

- **`ProjectDetail`の「編集」ボタンをクリックしてもモーダルが開かない（実環境でのみ再現、原因未特定）**: ユーザーから、`/dashboard/projects/{実際のUUID}`に直接アクセスした状態で「編集」ボタンをクリックしても`ProjectEditForm`モーダルが開かない旨の報告があった。コンソールエラーは出ていない
  - Bunユニットテスト（`ProjectDetail`を実コンポーネントでレンダリングしクリック）、Playwright E2E（`bun run dev`実サーバー・実UUID直アクセス・API一部モック）のいずれでも再現できなかった
  - 調査の過程で、`app/client/next.config.ts`に**未コミットのローカル変更**（`output: 'export'`のコメントアウト）があることが判明した。ユーザーが`output: 'export'`有効時に`/dashboard/projects/{実UUID}`への直接アクセスでエラーになる（Phase 8で`generateStaticParams`のプレースホルダー制約により想定されていた既知の制限）ことを避けるため、動作確認目的で手動編集したもの。**この変更はコミットしない**（Cloudflare Pages向け静的書き出しが無効化されるため、本番ビルドが壊れる）
  - `docker compose restart client`でdevサーバーを完全再起動して再検証を依頼したが、事象は解消しなかった（ユーザー確認済み）。ローカル環境固有の問題（ブラウザキャッシュ、拡張機能、OS等）の可能性も含め、原因を特定できていない
  - ユーザーとの合意により、本フェーズでは既知のバグとして記録し、対応を見送る。次回以降、実際のCloudflare Pages/Workers環境（`output: 'export'`を維持した状態、または`_redirects`のプレースホルダー機構経由）での再現有無を確認したうえで、再度調査することを推奨する

### 所要時間

- 開始: 2026-08-03 21:43 JST
- 終了: 2026-08-03 22:06 JST
- 合計: 約23分（typecheck/test/lint/semgrep/build/E2Eの実行時間、Codexレビュー8観点を含む。品質ゲート実行は@quality-gate-runnerサブエージェントに委譲）
- typecheck: 約2.6秒（`docker compose exec client bunx tsc --noEmit`、エラーゼロ）
- test: 483 pass / 0 fail（`docker compose exec client bun test`、約9秒）
- lint: `docker compose exec client bun run fix`で新規ファイルの指摘なし（既存ファイルの警告3件は本フェーズのスコープ外のため未対応）
- semgrep: 0 findings（`docker compose run --rm semgrep semgrep app/client`）
- build: 成功（`docker compose exec client bun run build`）
- E2E: 18 pass / 0 fail（`docker compose exec e2e npx playwright test todo/`、chromium/firefox）
