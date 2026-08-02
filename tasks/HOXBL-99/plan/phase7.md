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

- [x] **TASK-7-01: `useProjects`フック（一覧取得）の実装（Red→Green）**（Phase 6で前倒し実装済み）
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-104
  - **関連設計**: design.md §4.3, `features/todo/hooks/useTasks.ts`パターン
  - **実装詳細**:
    - `app/client/src/features/project/hooks/useProjects.ts`に、TanStack React Queryで`GET /api/projects`を呼び出すフックを実装する（`useTasks.ts`と同一のエラーハンドリングパターン: ネットワークエラーは統一メッセージ、その他はそのまま伝播）
    - テストは`app/client/src/features/project/__tests__/useProjects.test.ts`に配置
  - **完了条件**: 正常系でproject一覧が取得できること。APIエラー時に適切なエラーメッセージがthrowされること
  - **単体テスト要件**: 正常系（一覧取得）、異常系（APIエラー、ネットワークエラー）、境界値（0件）

- [x] **TASK-7-02: `useProjectMutations`フック（作成）の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-101, REQ-301, REQ-306
  - **関連設計**: design.md §4.3, `features/todo/hooks/useTaskMutations.ts`パターン
  - **実装詳細**:
    - `app/client/src/features/project/hooks/useProjectMutations.ts`に、`POST /api/projects`を呼び出す`createProject`ミューテーションを実装する。成功時にproject一覧のクエリキャッシュを無効化する
  - **完了条件**: 作成成功時に一覧キャッシュが再取得されること。APIエラー（`400`）がフォーム側で扱えるErrorとしてthrowされること
  - **単体テスト要件**: 正常系（作成成功）、異常系（バリデーションエラーのAPIレスポンス）

- [x] **TASK-7-03: `ProjectServicesContext`の実装**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-7-01, TASK-7-02
  - **関連要件**: なし（テスト基盤）
  - **関連設計**: design.md §13, `.claude/rules/frontend.md`のContext-based DIパターン
  - **実装詳細**:
    - `app/client/src/features/project/lib/ProjectServicesContext.tsx`に、`TaskServicesContext.tsx`と同一パターンで`useProjects`/`useProjectMutations`を注入するProviderを実装する
  - **完了条件**: `ProjectServicesProvider`未使用時にエラーがスローされ、テストでモックサービスを注入できること

- [x] **TASK-7-04: `ProjectList`コンポーネントの実装（Red→Green）**
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

- [x] **TASK-7-05: `ProjectCreateForm`コンポーネントの実装（Red→Green）**
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

- [x] **TASK-7-06: `/dashboard/projects`ページの実装**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-7-04, TASK-7-05
  - **関連要件**: REQ-101, REQ-104
  - **関連設計**: `app/dashboard/page.tsx`の構成パターン
  - **実装詳細**:
    - `app/client/src/app/dashboard/projects/page.tsx`に、`ProjectServicesProvider`でラップし`ProjectCreateForm`・`ProjectList`を配置するページを実装する
    - ダッシュボードから`/dashboard/projects`への導線（ナビゲーションリンク）を追加する
  - **完了条件**: ページにアクセスするとproject作成フォームと一覧が表示されること

- [x] **TASK-7-07: 型チェックとテスト実行**
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

## 7. 実施記録

### 計画との差異

- TASK-7-01（`useProjects`フック）は本フェーズ開始前、Phase 6で`createTaskBodySchema.projectId`必須化に伴うクライアント型チェック解消のため前倒し実装済みだった。本フェーズでは新規実装せず、既存実装・既存テストをそのまま採用した
- TASK-7-03（`ProjectServicesContext`）もPhase 6で`useProjects`のみを注入する形で前倒し実装済みだったため、本フェーズでは`useProjectMutations`をinterface・デフォルトサービスに追加する差分のみ実施した
- `ProjectCreateForm`の名前入力欄には、他の入力フォーム（`TaskCreateForm`）と異なり`maxLength`属性を付与していない。101文字超をHTML側で機械的にブロックすると、phase7.mdが要求する「101文字超のクライアント側バリデーションエラー表示」（API側と同一メッセージ）を検証できなくなるため、意図的にJS側の文字数チェックのみで検証する設計とした
- Codexレビューで指摘を受け、以下を計画外に追加修正した:
  - `ProjectList.tsx`に`'use client'`ディレクティブが漏れており、`docker compose exec client bun run build`がサーバー/クライアント境界違反でエラーになっていた（`useProjectServices()`をServer Componentからimportする構成だったため）。追加して解消
  - `ProjectCreateForm.tsx`のバリデーションで、空文字判定は`name.trim()`、文字数判定は未加工の`name.length`を使っており、前後空白を含む実質100文字以内の名前を誤って拒否する不整合があったため、`trimmedName`に統一し、API送信値もtrim後の値に統一した
  - 既存の`TaskCreateForm.test.tsx`が`ProjectServicesProvider`に`useProjects`のみを注入しており、`ProjectServices`interfaceに`useProjectMutations`が必須化されたことで型定義と実態が乖離していた（テストファイルは`tsconfig.json`の`exclude`対象のため`tsc --noEmit`自体は通過するが、DIパターンとしての一貫性を優先し）モックを追加した
  - `app/dashboard/page.tsx`のタイトル行を横並び固定（`flex`のみ）にしていたため、狭い画面幅で導線リンクとタイトルが窮屈になる懸念があった。`flex-col sm:flex-row`に変更し、モバイルでは縦積みになるよう修正した

### コードレビュー

Codex MCPで8観点（line-by-line, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, conventions）のレビューを実施。妥当性の高い指摘は反映した:

- **line-by-line指摘（採用）**: `ProjectList.tsx`の`'use client'`欠落、`ProjectCreateForm.tsx`のtrim不整合（上記「計画との差異」参照）
- **removed-behavior/cross-file指摘（採用）**: `TaskCreateForm.test.tsx`の`ProjectServicesProvider`モックに`useProjectMutations`を追加
- **altitude指摘（一部採用）**: `ProjectList.tsx`の`'use client'`欠落は階層観点でも指摘され、修正に反映した
- **line-by-line指摘（見送り）**: project詳細ページ（`/dashboard/projects/{id}`）が未実装のため、`ProjectList`からのリンクが現時点で404になる旨の指摘。Phase 8で詳細ページを実装予定であり、overview.mdの依存関係上想定内のため今回は対応しない
- **removed-behavior指摘（採用）**: `dashboard/page.tsx`のタイトル行が狭幅で窮屈になる懸念を修正（`flex-col sm:flex-row`化）
- **reuse指摘（見送り）**: `useProjectMutations.ts`が`handleApiError`共通関数を使わず`error.error?.message || fallback`を直接記述している点。Phase 6で実装済みの`useTaskMutations.ts`と同一パターンを踏襲したものであり、今回のフェーズ単独では変更せず、共通化は別途検討課題として残す
- **simplification指摘（見送り）**: `UseProjectMutationsResult`の明示的な戻り値型が省略可能という指摘、`React.memo`の効果が限定的という指摘はいずれも軽微であり、既存の`useTaskMutations.ts`/`TaskItem.tsx`等の既存パターンとの一貫性を優先し今回は変更しない
- **conventions指摘（見送り）**: テスト用`wrapper`が無名関数かつprops分割代入になっている点。既存の`useTasks.test.tsx`等でも同一パターンが広く使われており、テスト用ローカルwrapperは規約の対象外の実態と判断し変更しない
- **efficiency指摘（見送り）**: `invalidateQueries`の`exact: false`について、将来ページネーション導入時に無関係なクエリまで再フェッチする可能性がある指摘。現状`['projects']`クエリキーは1種類のみで実害がないため、ページネーション導入時に別途対応する

### 所要時間

- 開始: 2026-08-02 20:55 JST
- 終了: 2026-08-02 21:09 JST
- 合計: 約14分（typecheck/test/lint/semgrep/buildの実行時間含む。品質ゲート実行はサブエージェントに一部委譲）
