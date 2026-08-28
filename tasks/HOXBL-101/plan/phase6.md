# Phase 6: viewer横断閲覧API（トークンアクセス）

## 1. このフェーズの目的

`GET /api/viewer/tasks`により、viewerがトークン付きリンクからログイン不要で全project横断のtask一覧を閲覧できる状態をHTTP応答まで一貫して成立させる。無効・失効・期限切れトークンの拒否と、招待0件時の空状態表示を両立させる。viewerトークンが既存の編集系APIを一切認証できないことも確認する。

## 2. 確認可能なこと

- 統合テストで、有効なトークンでアクセスすると、招待されている全projectのtaskがprojectごとにグルーピングされ、title・description・status・priorityとともに表示されることを確認できる（AC-09）
- 統合テストで、存在しない・失効・期限切れのトークンでアクセスが拒否され、再発行手段は提供されないことを確認できる（AC-10、30日ちょうど＝有効/30日超過＝無効の境界含む）。overview.md 2章の用語整理の通り、「失効済み」は(a)期限切れ、(b)再発行により旧ハッシュが検索不能になった状態、のいずれかとして検証する（`viewer_access_tokens`にトークン単位の失効フラグは存在しないため）
- 統合テストで、有効なトークンだが招待が全て取り消されている場合、アクセスは拒否されず空状態が表示されることを確認できる（AC-11）
- 統合テストで、`Viewer-Access-Token`ヘッダを付与しても既存のtask/project更新系APIが認証されないことを確認できる（REQ-002）

## 3. 関連要件・関連設計

- **関連要件**: REQ-002, REQ-003, REQ-104, REQ-201, REQ-301, REQ-306, NFR-102
- **関連設計**: design.md §4.2, §5.2, §5.3, §7.1, §9, §10.1, §10.2, §13

## 4. 依存関係

- **前提フェーズ**: Phase 2（招待APIとは独立して着手可能だが、招待0件でない状態での動作確認にはPhase 3の完了が必要）
- **ブロッカー**: なし

## 5. タスク一覧

- [x] **TASK-6-01: `IProjectRepository.findByIds`/`ITaskRepository.findByProjectIds`の追加実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 2
  - **関連要件**: REQ-104
  - **関連設計**: design.md §4.2, §10.1, §12 RISK-02
  - **実装詳細**:
    - `IProjectRepository`に`findByIds(projectIds: string[]): Promise<ProjectEntity[]>`（所有者検証なし）を追加する
    - `ITaskRepository`に`findByProjectIds(projectIds: string[]): Promise<TaskEntity[]>`（同上）を追加する
    - いずれも`PostgreSQLProjectRepository`/`PostgreSQLTaskRepository`にDrizzleの`inArray`等で一括取得するよう実装する
  - **完了条件**: 複数`projectId`を渡した一括取得で、projectごとのループによる個別クエリが発生しないこと
  - **統合テスト要件**: 複数project/task混在時の一括取得、N+1にならないこと（クエリ発行回数またはモック呼び出し回数で検証）
  - **注意点**: RISK-02（overview.md 5章）。所有者スコープなしの強い権限を持つメソッドであることをコード上のコメントで明示し、呼び出し元をTASK-6-04の`GetViewerAccessibleProjectsUseCase`のみに限定する

- [x] **TASK-6-02: `IProjectViewerRepository.findActiveByEmail`の追加実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 2
  - **関連要件**: REQ-104, REQ-201
  - **関連設計**: design.md §4.1, §10.1
  - **実装詳細**: `IProjectViewerRepository`に`findActiveByEmail(email)`（`status = 'active'`の`projectId`一覧を`(email, status)`インデックス経由で取得）を追加し実装する
  - **完了条件**: 有効な招待のみの`projectId`一覧が返る。招待0件のメールアドレスでは空配列が返る
  - **統合テスト要件**: 複数project招待時の一括取得、全取り消し後の空配列（AC-11の前提）

- [x] **TASK-6-03: `viewerTokenMiddleware`実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 2
  - **関連要件**: REQ-002, REQ-301, REQ-306, NFR-102
  - **関連設計**: design.md §5.2手順2-4, §9, §10.2
  - **実装詳細**:
    - `app/server/src/viewer/presentation/middleware/viewerTokenMiddleware.ts`に、`Viewer-Access-Token`ヘッダの値を`TokenHasher.hash()`でハッシュ化し`IViewerAccessTokenRepository.findByTokenHash()`で検索する処理を実装する
    - 見つからない、または`isExpired(now)`が真の場合は`InvalidViewerAccessTokenError`（401）。判定はPhase 2 TASK-2-03で実装した`now > expiresAt`のみ無効とする境界に従う
    - 見つかった場合、Honoの`Context`に`viewerEmail`をセットして次のハンドラへ
    - このミドルウェアは`/api/viewer/*`専用ルーターにのみ適用し、既存の`authMiddleware`配下のルート（task/project更新系API）には一切組み込まない
  - **完了条件**: ヘッダ未指定・存在しないトークン・期限切れトークンでいずれも401になる。有効なトークンで`viewerEmail`がセットされる
  - **単体テスト要件**: 正常系、異常系（ヘッダなし、存在しないトークン、期限切れトークン）。AC-10の境界値（発行から30日ちょうど＝有効、30日超過＝無効）をミドルウェアレベルでも検証する

- [x] **TASK-6-04: `GetViewerAccessibleProjectsUseCase`実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-6-01, TASK-6-02
  - **関連要件**: REQ-003, REQ-104, REQ-201
  - **関連設計**: design.md §5.2手順5-7, §7.1
  - **実装詳細**:
    - `findActiveByEmail(viewerEmail)`で`projectId`一覧を取得し、0件でも空配列として扱いエラーにしない（REQ-201, AC-11）
    - `findByIds(projectIds)`/`findByProjectIds(projectIds)`で一括取得し、projectごとにグルーピングしたDTO（`ViewerAccessibleProjectDTO[]`）を返す。各taskはtitle/description/status/priorityを含む（REQ-003）
  - **完了条件**: 複数project混在時に正しくグルーピングされる。招待0件時は空配列が返る
  - **単体テスト要件**: 複数projectのグルーピング（AC-09）、0件時の空配列（AC-11）、taskの各項目が含まれること

- [x] **TASK-6-05: `GET /api/viewer/tasks`ルート実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-6-03, TASK-6-04
  - **関連要件**: REQ-003, REQ-104, REQ-201, REQ-301, REQ-306
  - **関連設計**: design.md §7.1, §7.2, §13
  - **実装詳細**:
    - `app/server/src/viewer/presentation/viewerAccessRoutes.ts`/`viewerAccessRoutes.schema.ts`/`ViewerAccessController.ts`を実装する。`viewerTokenMiddleware`配下、`/api/viewer/*`として既存`authMiddleware`配下のルーターとは別ルーターに分離する
    - `errorMiddleware`の`ERROR_MAPPINGS`に`InvalidViewerAccessTokenError`（401）を追加登録する
    - レスポンスDTOの型に生トークン・トークンハッシュを保持するフィールドを持たせないことで、型レベルで漏洩を防ぐ
  - **完了条件**: AC-09, AC-10, AC-11に沿って200/401が返ること
  - **統合テスト要件**: `viewerAccessRoutes.integration.test.ts`に正常系・異常系・空状態のテストケースを配置する

- [x] **TASK-6-06: viewerトークンによる既存編集系APIへのアクセス拒否確認（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-6-05
  - **関連要件**: REQ-002
  - **関連設計**: design.md §4.3（システム境界）
  - **実装詳細**: 既存の`PUT /api/tasks/{id}`（ステータス変更等）や`POST/PUT /api/projects`系エンドポイントに対し、`Viewer-Access-Token`ヘッダのみを付与し`Authorization`ヘッダを付与せずにリクエストした場合、`authMiddleware`により未認証として拒否されることを統合テストで確認する
  - **完了条件**: viewerトークンだけでは既存の編集系APIが一切認証を通過しないことがテストで担保されること
  - **単体テスト要件**: 該当なし（統合テストのみ）
  - **統合テスト要件**: 代表的な編集系エンドポイント（task更新、project更新）それぞれで401になることを確認する

- [x] **TASK-6-07: OpenAPI仕様・TypeScript型定義の生成**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-6-05
  - **関連要件**: なし（インフラ）
  - **関連設計**: `.claude/rules/schema-db.md`
  - **実装詳細**:
    ```bash
    docker compose exec server bun run generate:openapi
    docker compose exec client bun run generate:types
    docker compose exec server bunx tsc --noEmit
    docker compose exec client bunx tsc --noEmit
    ```
  - **完了条件**: 型エラーがないこと

## 6. 実施記録

- 開始時刻: 2026-08-19 17:23 JST
- 終了時刻: 2026-08-19 18:02 JST
- 合計時間: 約39分（typecheck/test/lint/build/semgrepの実行時間を含む）

### 差異の記録

- **`IViewerAccessTokenRepository.findByTokenHash`の追加**: design.md §4.1の`IViewerAccessTokenRepository`契約一覧に`findByTokenHash`が明記されていなかったが、TASK-6-03（`viewerTokenMiddleware`が`findByTokenHash()`で検索する）を満たすために追加した。design.mdの記述漏れとして扱う（Phase 5の`findById`追加と同種の差異）
- **`IProjectViewerRepository.findActiveByEmail`の戻り値をprojectId配列に決定**: design.md §4.2は「`status = 'active'`の`projectId`一覧を取得」とのみ記述しており、戻り値の型（Entity配列かID配列か）が明記されていなかった。`GetViewerAccessibleProjectsUseCase`が直後に`findByIds`へprojectId配列を渡すだけの用途であるため、`Promise<string[]>`（projectId配列）として実装した
- **`TaskDIContainer.getTaskRepository()`をprivate→publicに変更**: `GetViewerAccessibleProjectsUseCase`のDI組み立て（`ViewerDIContainer`）が、`TaskDIContainer`が管理する`ITaskRepository`の共有インスタンスを取得する必要があったため。既存の`ProjectDIContainer.getProjectRepository()`が同様にpublicである既存パターンに揃えた
- **Codexレビュー（8観点）で検出し対応した重大な指摘（Critical）**:
  - 【cross-file, Critical】実装当初、`viewerAccessRoutes.ts`で`app.use('*', viewerTokenMiddleware(...))`としていたところ、`app.route('/api', viewerAccess)`でマウントすると合成後の親ルーターで`/api/*`という広いパターンとして登録され、`task`/`project`ドメインの未マッチパスへのリクエストまでこのミドルウェアが横取りしてしまう問題を実装中に自己発見し、`app.use('/viewer/tasks', ...)`へスコープを限定して対応した
  - 【cross-file, Critical】上記の対応後もレビューで「合成後のサーバーで`GET /api/viewer/tasks`が到達不能（401になる）」という、上記とは逆方向の重大な指摘を受けた。原因は`taskRoutes.ts`/`projectRoutes.ts`/`viewerManagementRoutes.ts`が本番用の別インスタンス（`export default tasks/projects/viewers`）に対して`app.use('*', authMiddleware(...))`を適用しており、これも合成後に`/api/*`として登録され、マウント順が`viewerAccess`より先であるため`Viewer-Access-Token`のみを持つリクエストがSupabase JWT認証を要求する既存ミドルウェアに先に横取りされ401になっていた。実際に`entrypoints/index.ts`経由の合成アプリで再現確認した上で、`task`/`project`/`viewerManagement`側の`'*'`スコープを、各ドメイン自身のパス（`/tasks/*`、`/projects/*`、`/projects/:projectId/viewers/*`）に限定する形へ修正した（末尾`/*`パターンは末尾セグメント無しの完全一致パスにもマッチすることをHono 4.12の実動作で確認し、単一の`use()`呼び出しに統一した）。この修正はPhase 6の対象外ファイル（`taskRoutes.ts`, `projectRoutes.ts`）に及ぶが、Phase 6の中核機能（`GET /api/viewer/tasks`）が実運用で完全に機能しない状態だったため「対応必須」として修正した
  - なお`app.use()`に配列で複数パスを渡す実装（`app.use(['/tasks', '/tasks/*'], mw)`）を最初に試みたが、Hono 4.12の`use()`は第1引数が`string`型でない場合`path = '*'`にフォールバックする実装であることが判明し、単一パス文字列での複数回呼び出しに修正した
- **Codexレビューで対応した指摘（High/Medium）**:
  - 【High】CORS許可ヘッダーに`Viewer-Access-Token`が含まれていなかった指摘を受け、`terraform/bootstrap/main.tf`（production/preview）、`.github/workflows/server-test.yml`、`.github/workflows/e2e-test.yml`の`ACCESS_ALLOW_HEADERS`に追加した。ただし`.github/workflows/deploy-backend.yml`はGitHub Actionsのリポジトリ変数`vars.ACCESS_ALLOW_HEADERS`を参照しており、コードからは変更できないため、ユーザー側でのGitHub環境変数更新が別途必要
  - 【Medium】テストコードの`as unknown as TokenHasher`キャスト（`backend.md`で禁止）を、構造的に型が一致するプレーンオブジェクトへ変更しキャストを削除した
  - 【Medium】`GetViewerAccessibleProjectsUseCase.ts`の`task.getProjectId?.() ?? undefined`という不要なoptional chainingを`task.getProjectId()`に簡潔化した
  - 【Medium】`viewerTokenMiddleware.test.ts`の「30日ちょうど」境界値テストが、テスト内で捕捉した`now`とミドルウェア内部で新たに生成される`new Date()`の間にミリ秒差が生じうるため理論上flakyであり、かつ境界値自体は`ViewerAccessTokenEntity.test.ts`（Phase 2）で決定論的に検証済みで重複していたため、当該テストケースを削除した
  - 【Low】`viewerAccessRoutes.ts`のコメントに含まれていた`REQ-002, RISK-05`という要件ID表記をCLAUDE.mdの禁止事項に従い削除し、要件IDに依存しない説明文へ書き換えた
  - 【Low】`c.get('viewerEmail') as string`のキャストを、`viewerAccess.d.ts`のContextVariableMap拡張により不要と判断し削除した
  - 【Low】`app/packages/shared-schemas/index.ts`が`./src/viewers`を未exportだった（Phase 3から続く既存の抜け）ため追加し、client側から新しい型を参照可能にした
- **Codexレビューで検討し対応を見送った指摘**:
  - 【altitude, Medium】`findByIds`/`findByProjectIds`という所有者スコープなしメソッドを`project`/`task`ドメイン自身の`IProjectRepository`/`ITaskRepository`に追加する設計（viewer専用の読み取りIFを別に持たせるべきという指摘）は、design.md §4.2で明示的に採用された設計方針であり、Phase 6独自の逸脱ではないため変更を見送った
  - 【altitude, Medium】`viewerTokenMiddleware.ts`が具象クラス`TokenHasher`を直接参照しインターフェース化していない指摘は、Phase 3/4で先行実装済みの`InviteViewerUseCase`が同じく`TokenHasher`を直接受け取る既存パターンと一貫させるため見送った（`ITokenHasher`抽象化はviewerドメイン全体に関わる設計変更でありPhase 6単体の対象外と判断）
  - 【efficiency, Medium】`findActiveByEmail`が`lower(email) = lower($1)`比較のため式インデックス化が必要という指摘は、Phase 1〜5で一貫して採用されている既存パターン（`findByProjectAndEmail`等）と同一であり、Phase 6単体でのインデックス設計変更（マイグレーション追加）は見送った
  - 【conventions, Low】project/taskの応答順序に`ORDER BY`がなく非決定的という指摘は、REQ-104/AC-09が順序を要求しておらず、実施時間に見合わないと判断し見送った

### 所要時間

- `bunx tsc --noEmit`（server/client）: エラーゼロ
- `bun test`（server）: 974 pass / 0 fail（約22秒）、`bun test`（client）: 499 pass / 0 fail（約10秒）
- `bun run fix`（Biome lint & format、server/client）: 修正なし
- `docker compose build server`: 正常にビルド完了
- `semgrep --config auto`（viewer/project/task/entrypoints対象）: 0 findings
- `bun run knip`: viewer関連の新規指摘なし（既存の技術的負債のみ）

## 7. このフェーズの完了条件

- `GET /api/viewer/tasks`が、有効トークンでの横断閲覧・無効トークンの拒否・招待0件時の空状態表示をすべて満たすこと
- `findByIds`/`findByProjectIds`の呼び出し元が`GetViewerAccessibleProjectsUseCase`のみに限定されていること（RISK-02）
- viewerトークンが既存の編集系APIを一切認証できないことがテストで担保されていること（REQ-002）
- サーバー側・クライアント側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること
