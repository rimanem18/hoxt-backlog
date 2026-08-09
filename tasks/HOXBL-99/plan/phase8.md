# Phase 8: フロントエンド - project詳細・編集UI

## 1. このフェーズの目的

project詳細画面（そのprojectに紐づくtask一覧を含む）と編集フォームを成立させる。あわせて、project詳細画面からそのprojectに直接taskを追加できる導線を設ける。

## 2. 確認可能なこと

- `docker compose exec client bunx tsc --noEmit`がエラーゼロになること
- `docker compose exec client bun test`で本フェーズの新規テストがすべてグリーンになること
- `/dashboard/projects/{id}`を開くと、そのprojectの名称・説明文と、そのprojectに紐づくtaskのみが表示されること（他projectのtaskは表示されない、0件時は空一覧）
- 編集フォームから名称・説明文を更新すると画面に反映されること
- 存在しない・他ユーザーのprojectIdをURLで直接指定すると「見つかりません」の表示になること
- project詳細画面のタスク作成フォームからtaskを追加すると、project選択操作なしにそのprojectへ紐づいたtaskが作成され、一覧に反映されること

## 3. 関連要件・関連設計

- **関連要件**: REQ-106, REQ-107, REQ-303, REQ-304, REQ-305, REQ-306, AC-08, AC-09, AC-10
- **関連設計**: design.md §4.3, §7.2, §12 RISK-01（404を「見つかりません」表現とする方針）
- **補足（要件定義外の追加スコープ）**: project詳細画面からのtask追加導線は、requirements.md/design.mdには記載がなく、Phase 7完了後のユーザーとの会話で追加が決定された。対応するREQ IDは存在しない（`tasks/HOXBL-99/plan/phase10-ex.md`の経緯記録も参照）

## 4. 依存関係

- **前提フェーズ**: Phase 3（project詳細API）, Phase 4（project編集API）, Phase 6（task絞り込みAPI）, Phase 7（`ProjectServicesContext`基盤）
- **ブロッカー**: なし

## 5. タスク一覧

- [x] **TASK-8-01: `useProject`フック（単一取得）の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-106, REQ-303
  - **関連設計**: design.md §4.3
  - **実装詳細**:
    - `app/client/src/features/project/hooks/useProject.ts`に、`projectId`を受け取り`GET /api/projects/{id}`を呼び出すフックを実装する
    - `404`の場合は「project が見つかりません」等、権限有無を明かさない文言のErrorをthrowする（RISK-01対応）
  - **完了条件**: 正常系で詳細が取得できること。`404`時に統一された「見つかりません」文言のエラーになること
  - **単体テスト要件**: 正常系、異常系（404、その他APIエラー）

- [x] **TASK-8-02: `useProjectMutations`への更新ミューテーション追加（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-107, REQ-304, REQ-305, REQ-306
  - **関連設計**: design.md §4.3
  - **実装詳細**:
    - Phase 7で実装した`useProjectMutations`に`updateProject`ミューテーション（`PUT /api/projects/{id}`）を追加する。成功時に該当project・project一覧のクエリキャッシュを無効化する
  - **完了条件**: 更新成功時にキャッシュが再取得されること。バリデーションエラー・404がフォーム側で扱えるErrorとしてthrowされること
  - **単体テスト要件**: 正常系（名称のみ/説明文のみ更新）、異常系（バリデーションエラー、404）

- [x] **TASK-8-03: project詳細画面向けの`useTasks`拡張利用（Red→Green）**
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

- [x] **TASK-8-04: `ProjectDetail`コンポーネントの実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-8-01, TASK-8-03
  - **関連要件**: REQ-106, REQ-303
  - **関連設計**: design.md §4.3, §12 RISK-01, `.claude/rules/design-system.md`
  - **実装詳細**:
    - `app/client/src/features/project/components/ProjectDetail.tsx`に、project名称・説明文表示と、そのprojectに紐づくtask一覧（既存`TaskList`/`TaskItem`を再利用）を表示するコンポーネントを実装する
    - `404`エラー時は「project が見つかりません」の専用表示にする
    - このタスクの時点では`TaskCreateForm`の埋め込みは行わない（`fixedProjectId`対応前のため）。task追加導線の組み込みはTASK-8-05で行う
  - **完了条件**: 正常系でproject情報とtask一覧が表示されること。0件時は空一覧、404時は見つからない旨の表示になること
  - **単体テスト要件**: 正常系、異常系（404表示）、境界値（task0件）
  - **UI/UX要件**:
    - **ローディング状態**: project情報・task一覧それぞれのローディング表示
    - **エラー表示**: 404を「見つかりません」として表示（権限拒否と区別しない）
    - **空状態**: そのprojectにtaskが0件の場合の空状態表示
    - **モバイル対応**: 縦スクロール基本、既存`TaskList`のレイアウト方針を踏襲
    - **アクセシビリティ**: 見出し階層でproject情報とtask一覧を区別

- [x] **TASK-8-05: `TaskCreateForm`のproject詳細埋め込み対応（`fixedProjectId`props追加、Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-8-04
  - **関連要件**: なし（要件定義外の追加スコープ。2章・3章の補足を参照）
  - **関連設計**: なし
  - **実装詳細**:
    - `app/client/src/features/todo/components/TaskCreateForm.tsx`に任意props `fixedProjectId?: string` を追加する
    - `fixedProjectId`が指定された場合:
      - project選択セレクト自体を表示しない（project詳細画面内という文脈から自明なため、選び直しの余地を作らない）
      - 「プロジェクトを選択してください」のバリデーション分岐をスキップし、`createTask.mutate`には常に`fixedProjectId`を`projectId`として渡す
    - `fixedProjectId`未指定時（既存のダッシュボード直下での利用）は、Phase 6〜7で実装済みのproject選択セレクトによる既存動作を維持する（後方互換）
    - `ProjectDetail.tsx`（TASK-8-04）から、そのprojectの`id`を`fixedProjectId`として`TaskCreateForm`に渡して埋め込む
  - **完了条件**: project詳細画面の`TaskCreateForm`にproject選択セレクトが表示されないこと。送信するとそのprojectの`projectId`でtaskが作成されること。ダッシュボード直下の`TaskCreateForm`（`fixedProjectId`未指定）の既存動作が壊れていないこと
  - **単体テスト要件**: 正常系（`fixedProjectId`指定時、project選択UIなしでそのprojectIdでの作成が呼ばれる）、既存動作の回帰確認（`fixedProjectId`未指定時は従来どおりproject選択が必須のまま）

- [x] **TASK-8-06: `ProjectEditForm`コンポーネントの実装（Red→Green）**
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

- [x] **TASK-8-07: `/dashboard/projects/[id]`ページの実装**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-8-04, TASK-8-05, TASK-8-06
  - **関連要件**: REQ-106, REQ-107
  - **関連設計**: `app/dashboard/page.tsx`の構成パターン
  - **実装詳細**:
    - `app/client/src/app/dashboard/projects/[id]/page.tsx`に、`ProjectServicesProvider`・`TaskServicesProvider`でラップし`ProjectDetail`（`fixedProjectId`付き`TaskCreateForm`を内包）・`ProjectEditForm`を配置するページを実装する
    - Phase 7の`ProjectList`から詳細ページへのリンクが機能することを確認する
  - **完了条件**: `/dashboard/projects/{id}`でproject詳細・編集・そのprojectのtask一覧・そのprojectへのtask追加が確認できること

- [x] **TASK-8-08: 型チェックとテスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-8-07
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
- project詳細画面からproject選択操作なしにそのprojectへtaskを追加できること
- クライアントの型チェック・テストがすべてグリーンであること

## 7. 実施記録

### 計画との差異

- **`output: 'export'`（Cloudflare Pages想定の静的書き出し）と動的ルート`[id]`の衝突**: `next.config.ts`は`output: 'export'`を採用しており、`/dashboard/projects/[id]`はこのアプリで初めての動的セグメントだった。静的書き出しでは`generateStaticParams()`が必須で、ビルド時に未知のprojectIdを列挙できないためビルドが失敗した。requirements.md/design.md/phase8.mdのいずれにもこの制約への言及がなく、計画外の課題として発生した
  - ユーザーに「Cloudflare Workersへの移行（SSR化）」も選択肢として提示したが、CI/CD・IaC・`next.config.ts`に及ぶ大きめの変更のためこのフェーズでは保留し、暫定対応で進める方針が承認された（Workers移行は別タスクとして切り出す）
  - 暫定対応として、`generateStaticParams()`でプレースホルダー1件（`placeholder`）のみ静的生成し、`app/client/public/_redirects`にCloudflare Pages向けSPAフォールバックルール（`/dashboard/projects/* → /dashboard/projects/placeholder/ 200`）を追加した。実行時は`app/client/src/app/dashboard/projects/[id]/ProjectDetailClient.tsx`が`usePathname()`でブラウザの実URLから直接projectIdを解決する（`useParams()`は静的生成時のセグメント値に影響されうるため採用しなかった）
  - `page.tsx`（Server Component、`generateStaticParams`export）と`ProjectDetailClient.tsx`（Client Component）にファイルを分離した
- **`features/todo/hooks/apiErrorHandler.ts`の移設**: Phase 7で実装済みの`useProjects.ts`が`@/features/todo/hooks/apiErrorHandler`をimportしており、design.md §4.3が定める「`features/todo`→`features/project`のみの一方向依存」に反する逆依存が既に生じていた。今回追加した`useProject.ts`が同じ依存を複製する形になったため、Codexレビューの指摘を受けて`app/client/src/lib/apiErrorHandler.ts`へ移設し、依存方向を是正した（`features/todo`側に本来の利用者がいなかったため、移設のみで両featureとも壊れずに解消できた）
- **`ProjectEditForm`の説明文クリア不具合**: 計画にはない実装時の不具合として、説明文を空欄にして保存すると`description: undefined`が送信され、部分更新APIでは「フィールド省略＝変更しない」と解釈されるため既存の説明文を削除できなかった。Codexレビューで指摘を受け、常にtrim後の値（空文字含む）を送信するよう修正した
- **`ProjectDetail`のエラー表示範囲**: 当初はローディング後の`error`または`!project`をすべて「プロジェクトが見つかりません」と表示していたが、404以外のエラー（通信エラー・401等）まで一律「見つかりません」と表示してしまう問題をCodexレビューで指摘され、`error.message`（`useProject`側で404のみ「プロジェクトが見つかりません」に正規化済み）をそのまま表示する形に修正した
- **`ProjectDetailClient`のhooksルール違反と簡潔化**: 当初`TaskServicesProvider`にインラインの`useTasks: () => useTasks(projectId)`を渡す実装にしたところ、biomeの`lint/correctness/useHookAtTopLevel`に抵触した。Codexレビューの simplification 指摘を踏まえ、`TaskList`コンポーネント自体に任意の`projectId` propを追加し、`<TaskList projectId={projectId} />`と渡すだけで済む構成に変更した（`useTasks`のカスタムラップやDIサービスの上書きが不要になった）
- **`fixedProjectId`指定時の不要なproject一覧取得**: `TaskCreateForm`はproject選択セレクトを表示しない場合でも`useProjects()`を無条件に呼び出しており、無駄なAPI呼び出しが発生していた。Codexレビューのefficiency指摘を受け、`useProjects`に`{ enabled?: boolean }`オプションを追加し、`fixedProjectId`指定時は`enabled: false`でクエリを実行しないよう修正した

### コードレビュー

Codex MCPで8観点（line-by-line, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, conventions）のレビューを実施。妥当性の高い指摘は反映した:

- **line-by-line指摘（採用）**: `ProjectEditForm.tsx`の説明文クリア不具合、`ProjectDetail.tsx`の404以外エラーの表示不整合、`ProjectDetailClient.tsx`の`useParams()`信頼性懸念（上記「計画との差異」参照）
- **cross-file指摘（採用）**: `useProject.ts`が`features/todo`への逆依存を新たに拡大していた点。`apiErrorHandler.ts`を`src/lib/`へ移設して解消
- **simplification指摘（採用）**: `ProjectDetailClient.tsx`の`useProjectScopedTasks`ラップを`TaskList`への`projectId` prop追加で置き換え、`TaskCreateForm.tsx`のバリデーション条件を`effectiveProjectId`に一本化
- **efficiency指摘（採用）**: `fixedProjectId`指定時の`useProjects()`不要呼び出しに`enabled`オプションを追加して対応
- **reuse指摘（見送り）**: `ProjectCreateForm.tsx`と`ProjectEditForm.tsx`のバリデーションロジック（trim後1〜100文字）重複を`validateProjectName`等へ共通化する提案。今回のフェーズ範囲外の既存ファイル改修になるため見送り、将来的な検討課題として残す
- **reuse指摘（見送り）**: `useProjectMutations.ts`のエラーハンドリングが`handleApiError`を使わず独自実装している点。参照先の`useTaskMutations.ts`自体も同じ独自実装であり、既存パターンとの一貫性を優先し今回は変更しない
- **efficiency指摘（見送り）**: `updateProject`の`onSuccess`でAPIが返す更新後データを使わず`invalidateQueries`のみで済ませている点（`setQueryData`での即時反映も可能という指摘）。現状の実装でも動作上問題なく、`createProject`との一貫性を優先し変更しない
- **conventions指摘（見送り）**: テストの`mockFetch`に対する`as unknown as`キャストが規約違反という指摘。既存の全hookテストファイル（Phase1〜7）で広く使われている確立されたパターンであり、今回のフェーズ単独でのリファクタリングは対象外とした
- **conventions指摘（見送り）**: モーダルの`max-h`/`overflow-y-auto`未設定、編集ボタンのタップ領域がやや小さい点。既存の`TaskEditModal.tsx`/`TaskItem.tsx`の編集ボタンも同一パターンであり、プロダクト全体の既存デザインとの一貫性を優先し今回は変更しない
- **conventions指摘（見送り）**: `ProjectDetailClient.tsx`が`React.memo`でexportされていない点。同種のページ合成用Client Component（`features/dashboard/components/DashboardShell.tsx`）も同様に`React.memo`化されておらず、既存の慣習と整合しているため変更しない。あわせてガイドライン側の修正案（`React.memo`必須ルールをNext.js特殊ファイル・Server Component・Context Provider等では除外する旨の明記）が提示されたが、ガイドライン改訂は本フェーズの対応範囲外とし、ユーザーへの報告事項として記録する
- **altitude指摘（該当なし）**: `ProjectDetail`のスロットパターン・編集モーダル状態の内包は妥当と判断された

### ブラウザでの動作確認

Playwrightで一時的なE2Eスモークテスト（コミット対象外・確認後削除）を作成し、認証・API呼び出しをモックした上でブラウザ実行で以下を確認した:

- project詳細（名称・説明文）とそのprojectに紐づくtask一覧の表示
- `fixedProjectId`指定によりproject選択セレクトなしでtaskを追加でき、一覧に反映される
- 編集フォームから名称を更新すると画面に反映される
- 存在しないproject（404）で「プロジェクトが見つかりません」表示になる

`next dev`は`output: 'export'`の`generateStaticParams`制約をそのまま強制するため、実際のprojectId（例: UUID）を含むURLへは直接アクセスできず、`_redirects`によるCloudflare Pages側の書き換え後と同じ状態（URLセグメントは`placeholder`）を模して検証した。実際のCloudflare Pages環境での`_redirects`挙動そのものはローカルで検証できていない（Workers移行タスクでの再検証を推奨）。

### 所要時間

- 開始: 2026-08-02 21:31 JST
- 終了: 2026-08-02 22:21 JST
- 合計: 約50分（typecheck/test/lint/semgrep/buildの実行時間、Codexレビュー8観点、ブラウザでのスモーク確認を含む。品質ゲート実行はサブエージェントに一部委譲）
