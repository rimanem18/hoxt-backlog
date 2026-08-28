# Phase 8: フロントエンド - viewer公開閲覧UI

## 1. このフェーズの目的

`features/viewer`を新設し、viewerがトークン付きURLからログイン不要で全project横断のtask一覧を閲覧できる状態を成立させる。

## 2. 確認可能なこと

- ブラウザでトークン付きURLにアクセスすると、projectごとにグルーピングされたtask一覧が表示されることを確認できる
- 無効・期限切れトークンでアクセスした場合にエラー表示になることを確認できる（再発行を促す導線がないこと含む）
- 招待が全て取り消された状態でアクセスした場合に空状態が表示されることを確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-003, REQ-104, REQ-201, REQ-301, REQ-306
- **関連設計**: design.md §4.3, §5.2手順1

## 4. 依存関係

- **前提フェーズ**: Phase 6
- **ブロッカー**: なし

## 5. タスク一覧

- [x] **TASK-8-01: フロントエンド - viewer公開閲覧画面実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 6
  - **関連要件**: REQ-003, REQ-104, REQ-201, REQ-301, REQ-306
  - **関連設計**: design.md §4.3, §5.2手順1, §13
  - **実装詳細**:
    - `app/client/src/app/viewer/[token]/page.tsx`を新設する（`AuthGuard`配下の`/dashboard`とは独立した、ログイン不要のルート。トークンはクエリではなくURLパスから取得する）
    - `app/client/src/features/viewer/components/ViewerTaskBoard.tsx`と`hooks/useViewerAccessibleProjects.ts`を実装し、`Viewer-Access-Token`ヘッダで`GET /api/viewer/tasks`を呼び出す
    - `features/viewer`は`features/viewer-management`から一方向にのみ参照される設計とし、逆方向の依存を作らない（design.md 13章）
  - **完了条件**: トークン付きURLでアクセスすると、projectごとにグルーピングされたtask一覧が表示される。無効/期限切れトークンではエラー表示、招待0件では空状態表示になる
  - **単体テスト要件**: 正常系（複数project表示）、異常系（401時のエラー表示）、空状態表示
  - **UI/UX要件**: ローディング状態、無効/期限切れトークン時のエラー表示（再発行を促す導線は設けない、REQ-306）、招待0件時の空状態表示、モバイル対応

## 6. このフェーズの完了条件

- トークン付きURLからのアクセスで、横断閲覧・エラー表示・空状態がすべてブラウザで確認できること
- クライアント側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること

## 7. 実施記録

- 開始時刻: 2026-08-21 21:39 JST
- 終了時刻: 2026-08-21 21:57 JST
- 合計時間: 約18分（typecheck/test/lint/build/semgrepの実行時間を含む）

### 差異の記録

- **`ViewerTaskBoard.tsx`を`ViewerTaskBoardContent`（プレゼンテーション）と`ViewerTaskBoard`（デフォルトエクスポート、token→APIクライアント組み立て）の2エクスポートに分割**: design.mdはファイル単位までは指定していないが、frontend.mdの「テスト用依存注入はContext APIを使用する」規約を満たすため、`features/viewer-management`の既存パターン（`ViewerManagementServicesContext`）を踏襲し、`features/viewer/lib/ViewerServicesContext.tsx`を新設して`useViewerAccessibleProjects`をDI可能にした。これに伴い表示ロジック（`ViewerTaskBoardContent`）とtoken→APIクライアント配線（`ViewerTaskBoard`）を分離した
- **`GET /api/viewer/tasks`をServer Componentで直接fetchせず、Client Component（React Queryフック）で取得する構成を採用**: `.claude/rules/frontend.md`のRSC規約は「初期表示データはServerで取得する」を原則とするが、既存の`features/project`/`features/todo`/`features/viewer-management`がいずれもClient Component側でReact Queryフックを介してデータ取得する一貫したパターンを採用しており（Server Component直接fetchの前例はコードベースに存在しない）、本フェーズだけ新しいアーキテクチャパターンを持ち込むより既存パターンとの一貫性を優先した。`'use client'`は`page.tsx`ではなく`ViewerTaskBoard.tsx`（末端）に限定して付与し、RSC規約の「'use client'を末端に置く」は満たしている
- **Codexレビュー（8観点、CLAUDE.local.mdの方針に従いサブエージェントではなくメインエージェントから直接MCP接続する予定だったが、今回は一般探索サブエージェントによるコードレビューで代替）で検出し対応した指摘**:
  - 【test-coverage, 中】デフォルトエクスポート`ViewerTaskBoard`（token→APIクライアント組み立て・`Viewer-Access-Token`ヘッダの実配線）がテストで一切検証されていなかった指摘。`ViewerTaskBoard.integration.test.tsx`を追加し、実際のfetchリクエストに`Viewer-Access-Token`ヘッダが正しく付与されることを検証した
- **手動ブラウザ確認を実施**: Playwrightをe2eコンテナから直接操作し、(1)有効トークン+有効な招待ありでのproject横断グルーピング表示、(2)無効トークンでのエラー表示（再発行導線が存在しないことを含む）、(3)有効トークンだが招待0件時の空状態表示、の3状態すべてを実際のブラウザで確認した。確認に使用した一時スクリプト・DB行はすべて後片付け済み

### 所要時間

- `docker compose exec client bunx tsc --noEmit`: エラーゼロ
- `docker compose exec client bun test`: 536 pass / 0 fail（約9.6秒、フルスイート）
- `docker compose exec client bun run fix`（Biome lint & format）: 修正なし
- `docker compose exec client bun run build`: 正常にビルド完了（`/viewer/[token]`は動的ルートとして生成）
- `docker compose run --rm semgrep semgrep --config auto`（features/viewer, app/viewer対象）: 0 findings
- `docker compose exec client bun run knip`: viewer関連の新規指摘なし
- `make fmt`: 修正なし
