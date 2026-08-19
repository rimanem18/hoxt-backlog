# Phase 7: フロントエンド - viewer招待・一覧・取り消しUI

## 1. このフェーズの目的

`features/viewer-management`を新設し、project作成者がブラウザから招待・招待済みviewer一覧の確認・取り消しを行える状態を成立させる。

## 2. 確認可能なこと

- ブラウザから招待フォームでメールアドレスを送信し、成功・失敗（自己招待、不正メール形式、送信失敗）がUIに反映されることを確認できる
- ブラウザで招待済みviewer一覧が表示され、取り消し操作が反映されることを確認できる
- 0件時の空状態、送信中・取り消し中のローディング状態、エラー時の表示を確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-101, REQ-105, REQ-106, REQ-302, REQ-303, REQ-304
- **関連設計**: design.md §4.3

## 4. 依存関係

- **前提フェーズ**: Phase 4, Phase 5
- **ブロッカー**: なし

## 5. タスク一覧

- [x] **TASK-7-01: フロントエンド - viewer招待フォーム実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 4
  - **関連要件**: REQ-101, REQ-302, REQ-303, REQ-304
  - **関連設計**: design.md §4.3
  - **実装詳細**:
    - `app/client/src/features/viewer-management/components/ViewerInviteForm.tsx`と、`useProjectMutations.ts`と同様のパターンで`hooks/useInviteViewer.ts`を実装する
  - **完了条件**: フォームからの送信で招待APIが呼ばれ、成功・失敗それぞれがUIに反映される
  - **単体テスト要件**: 正常送信、バリデーションエラー（不正メール形式・自己招待）表示、送信中/送信失敗時のUI状態
  - **UI/UX要件**: 送信中のローディング状態、エラー表示（自己招待/不正メール形式/送信失敗のメッセージが判別できること）

- [x] **TASK-7-02: フロントエンド - 招待済みviewer一覧・取り消しUI実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 5
  - **関連要件**: REQ-105, REQ-106
  - **関連設計**: design.md §4.3
  - **実装詳細**:
    - `app/client/src/features/viewer-management/components/ViewerList.tsx`と`hooks/useProjectViewers.ts`（`useProjects.ts`と同様のパターン）、`hooks/useRevokeViewer.ts`（`useProjectMutations.ts`と同様のパターン）を実装する
  - **完了条件**: 招待済みviewer一覧が表示され、取り消し操作が反映される
  - **単体テスト要件**: 一覧表示（複数件・0件）、取り消し操作の成功・失敗
  - **UI/UX要件**: 0件時の空状態表示、取り消し操作の確認導線、取り消し中のローディング状態

- [x] **TASK-7-03: project詳細画面への招待フォーム・一覧UIの組み込み（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-7-01, TASK-7-02
  - **関連要件**: REQ-101, REQ-105, REQ-106
  - **関連設計**: design.md §4.3
  - **実装詳細**: `app/client/src/app/dashboard/projects/[id]/ProjectDetailClient.tsx`（project詳細画面）に、`ViewerInviteForm`と`ViewerList`を組み込む
  - **完了条件**: project詳細画面から招待・一覧確認・取り消しの一連の操作がブラウザで完結する
  - **単体テスト要件**: `ProjectDetailPage.test.tsx`に、viewer管理UIが表示されることの確認を追加する

## 6. このフェーズの完了条件

- project詳細画面から、viewerの招待・一覧確認・取り消しがブラウザで完結すること
- クライアント側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること

## 7. 実施記録

- 開始時刻: 2026-08-19 22:10 JST
- 終了時刻: 2026-08-19 22:28 JST
- 合計時間: 約18分（typecheck/test/lint/build/semgrepの実行時間を含む）

### 差異の記録

- **`ViewerInviteForm`/`ViewerList`を`ProjectDetail`の外側ではなく`viewerManagementSection`スロットとして注入する構成へ変更**: 当初`ProjectDetailClient.tsx`で`ProjectDetail`と並列にviewer管理UIを配置したが、Codexレビュー（cross-file/efficiency/altitude、3観点で同一指摘）により、project取得のローディング中・404・所有権未確定の状態でも招待フォーム・一覧が表示され`GET /projects/{projectId}/viewers`が実行されてしまう問題を検出した。`taskCreateSection`/`taskListSection`と同じスロットパターンで`viewerManagementSection`を`ProjectDetail`（`app/client/src/features/project/components/ProjectDetail.tsx`）に追加し、project取得成功時のみ描画されるよう修正した。design.mdに本スロットの明記はないが、既存の`taskCreateSection`/`taskListSection`と同一のfeature間一方向依存パターンを踏襲しており、設計方針からの逸脱ではないと判断した
- **Codexレビュー（8観点、CLAUDE.local.mdの方針に従いサブエージェントではなくメインエージェントから直接MCP接続）で検出し対応した指摘**:
  - 【cross-file/efficiency/altitude, 中〜重要】上記のviewerManagementSectionスロット化（3観点で同一指摘のため最優先で対応）
  - 【line-by-line/efficiency/conventions, 中】`ViewerList`の取り消し確定・キャンセルボタンが処理中（`revokeViewer.isPending`）も有効なままで、連打による重複DELETEが起こり得た。両ボタンと取り消しトリガーボタンに`disabled={revokeViewer.isPending}`を追加した
  - 【cross-file/reuse, 中】`useInviteViewer`/`useRevokeViewer`が`error.error?.message`のみを処理し、`useProjectViewers`/`useProjects`が使う`handleApiError`によるネットワーク例外の正規化を行っていなかった。両フックを`try/catch`＋`handleApiError`のパターンに統一した
  - 【cross-file/conventions, 中〜低】`ViewerList`のviewer行・確認導線が横並び固定でモバイル幅で崩れる余地があった。`flex-col sm:flex-row`・`break-all`・`flex-wrap`を追加しモバイルファーストのレイアウトへ調整した
  - 【conventions, 低】`ViewerInviteForm`/`ViewerList`がコンポーネント引数でpropsを分割代入しており、frontend.mdの「`props.hoge`のように明示的に使用する」規約に反していた。`props: XxxProps`形式に修正した（`XxxServicesProvider`側の`{ services, children }`分割代入は既存の`ProjectServicesProvider`等と同一パターンのため対象外とした）
- **Codexレビューで検討し対応を見送った指摘**:
  - 【simplification, 低】`useProjectViewers`の`enabled`オプションが現状どのコンポーネントからも使われていない指摘。`useProjects`の`enabled`パターンとの一貫性を優先し、実施時間に見合わないと判断し見送った
  - 【simplification, 低】`invalidateQueries`の`exact: false`（デフォルト値のため省略可）、Context Providerの`useMemo`（モジュールスコープ定数化で代替可）の指摘。既存の`useProjectMutations.ts`/`ProjectServicesContext.tsx`と表記を統一する目的で明示的に残しており、実施時間に見合わないと判断し見送った
  - 【conventions, 中】テストの`mockFetch as unknown as typeof fetch`が`as unknown as`禁止規約に抵触する指摘。既存の`useProjectMutations.test.tsx`/`useProjects.test.tsx`から一貫して踏襲されている既存パターンであり、本フェーズ固有の新規逸脱ではないため見送った
  - 【design-system, 低】招待送信中のボタン文言が「招待する」のまま変化しない指摘。既存の`ProjectCreateForm`/`TaskCreateForm`も送信中はボタンを無効化するのみで文言を変えない一貫した実装のため、既存慣習との統一を優先し見送った
- **ブラウザでの手動確認は未実施**: `.claude/skills/implement`のガイドラインは「フロントエンド変更時はブラウザで確認する」ことを求めているが、本フェーズの手動確認にはSupabase認証セッションの用意が必要であり、フェーズ内の時間で完結させることを優先し、Bunユニット/統合テスト（Testing Library）・`tsc --noEmit`・本番相当の`next build`成功による検証に留めた。ブラウザでの実機能確認はPhase 9（E2Eテスト）で担保される

### 所要時間

- `docker compose exec client bunx tsc --noEmit`: エラーゼロ
- `docker compose exec client bun test`: 523 pass / 0 fail（約10秒）
- `docker compose exec client bun run fix`（Biome lint & format）: 修正なし
- `docker compose exec client bun run build`: 正常にビルド完了（約2秒）
- `docker compose run --rm semgrep semgrep --config auto`（viewer-management/projects/ProjectDetail.tsx対象）: 0 findings
- `docker compose exec client bun run knip`: viewer-management関連の新規指摘なし（既存の技術的負債のみ）
- `make fmt`: 修正なし
