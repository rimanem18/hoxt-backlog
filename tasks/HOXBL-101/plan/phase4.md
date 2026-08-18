# Phase 4: viewer招待API - 別project追加招待・no-op・期限切れ再発行

## 1. このフェーズの目的

`InviteViewerUseCase`に、既存の有効トークンを使った別projectへの追加招待（REQ-103）、既に招待済み（active）への重複招待のno-op（REQ-502）、招待済み（active）だがトークンが期限切れの場合の再発行（REQ-501）という3分岐を組み込む。

取り消し済み（revoked）招待の復元（REQ-503）は、`revoke`/`restore`という対の操作を扱うPhase 5（招待済みviewer一覧・取り消し・復元）でまとめて実装する（4章参照）。

## 2. このフェーズが前提とする不変条件

- ある email に対して`project_viewers`行（`active`または`revoked`）が1件でも存在する場合、その email の`viewer_access_tokens`行は必ず存在する。これは、招待作成の唯一の経路（Phase 3の新規招待、または本フェーズTASK-4-02の追加招待）が常にトークンの存在を前提・保証すること、および送信失敗時の補償操作（Phase 3 TASK-3-03）が招待とトークンを常に対で削除することにより成立する
- したがって、「招待が`active`または`revoked`で存在するが、トークンが存在しない」という組み合わせは正常系では発生しない。本フェーズのタスクはこの不変条件を前提に設計しており、当該組み合わせ用の分岐は実装しない

## 3. 確認可能なこと

- 統合テストで、既に有効なトークンを持つメールアドレスを、まだ招待していない別projectへ招待すると、新しい招待が作成され、トークンは維持され、新しいトークン発行・メール再送信は行われないことを確認できる（AC-02, REQ-103）
- 統合テストで、既に招待済み（active）・トークン有効の組み合わせへ再招待しても、状態が変化せずエラーにもならないことを確認できる（REQ-502）
- 統合テストで、招待済み（active）だがトークンが期限切れの場合、同一projectへの再招待で新しいトークンが発行されメールが再送信されることを確認できる（AC-03, REQ-501）。メール送信失敗時は旧トークンの状態に復元されることも確認できる

## 4. 関連要件・関連設計

- **関連要件**: REQ-103, REQ-501, REQ-502
- **関連設計**: design.md §5.1手順7, §6, §13

## 5. 依存関係

- **前提フェーズ**: Phase 4-before（`tasks/HOXBL-101/plan/phase4-before.md`）。**必ずPhase 4-beforeを先に完了させてから本フェーズに着手すること**。Phase 4-beforeが整備するUnit of Work基盤（`IViewerInvitationUnitOfWork`）を前提に、本フェーズの各分岐を実装する
- **ブロッカー**: なし

## 6. タスク一覧

- [x] **TASK-4-01: `IViewerAccessTokenRepository.replace`の追加実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 3
  - **関連要件**: REQ-501
  - **関連設計**: design.md §4.1（`IViewerAccessTokenRepository`）, §6
  - **実装詳細**: `IViewerAccessTokenRepository`に`replace(existingId, newTokenHash, newExpiresAt)`を追加し、`PostgreSQLViewerAccessTokenRepository`で既存行を新しいハッシュ・有効期限で上書きする実装を行う（履歴は保持しない）。呼び出し元が事前に旧`tokenHash`/`expiresAt`を保持しておき、補償時に同じ`replace`で元の値へ戻せるようにする
  - **完了条件**: `replace`実行後、DBの`tokenHash`/`expiresAt`が更新され、`email`単位で行が1件のまま維持されること。旧値へ戻す`replace`呼び出しで元通りに復元できること
  - **統合テスト要件**: 既存トークンを`replace`した際に、旧ハッシュで検索できなくなり新ハッシュで検索できること。旧値への再`replace`で完全に復元できること

- [x] **TASK-4-02: `InviteViewerUseCase`への分岐追加 - 別projectへの追加招待（招待なし＋有効トークン）（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-01
  - **関連要件**: REQ-103
  - **関連設計**: design.md §5.1手順7
  - **実装詳細**: 対象project×emailの招待が存在せず（`findByProjectAndEmail`が`null`）、かつ既存トークンが有効期限内の場合、新しい`ProjectViewerEntity`（active）のみを保存し、トークンの発行・メール送信は行わない分岐を`InviteViewerUseCase`に追加する
  - **完了条件**: 別projectへの追加招待で新しい招待行が作成される。既存トークンのハッシュ・有効期限は変化せず、メール送信も呼ばれないこと
  - **単体テスト要件**: 既存の`InviteViewerUseCase`テストファイルに、AC-02（REQ-103）の観点でテストケースを追加する

- [x] **TASK-4-03: `InviteViewerUseCase`への分岐追加 - 既存active招待+有効トークン（完全no-op）（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-02
  - **関連要件**: REQ-502
  - **関連設計**: design.md §5.1手順7
  - **実装詳細**: 対象project×emailの招待が既に`active`、かつトークンが有効期限内の場合、DB更新・メール送信のいずれも行わずに成功として扱う分岐を`InviteViewerUseCase`に追加する
  - **完了条件**: 既存active招待+有効トークンへの再招待でエラーにならず、DB状態・メール送信呼び出し回数が変化しないこと
  - **単体テスト要件**: 既存の`InviteViewerUseCase`テストファイルに、REQ-502の観点でテストケースを追加する

- [x] **TASK-4-04: `InviteViewerUseCase`への分岐追加 - 期限切れトークンの再発行（補償込み）（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-01
  - **関連要件**: REQ-501
  - **関連設計**: design.md §5.1手順7, §6, §13
  - **実装詳細**:
    - 対象project×emailの招待が`active`、かつトークンが`isExpired(now)`の場合、新しい生トークンを生成し`replace`で保存、コミット後にメールを再送信する分岐を`InviteViewerUseCase`に追加する
    - 送信失敗時は、`replace`実行前に保持しておいた旧`tokenHash`/`expiresAt`へ`replace`で戻す補償操作を行い、`InvitationMailDeliveryError`を返す（design.md §13が要求する「既存招待+新規トークン(REQ-501)」パターンの補償テスト）。補償操作自体（DB接続断等）が失敗した場合はエラーレベルでログ出力する（design.md 6章、overview.md RISK-01）
  - **完了条件**: 期限切れトークンへの同一project再招待で新トークンが発行されメールが再送信される。送信失敗時は旧トークンの状態に復元されること
  - **単体テスト要件**: 既存の`InviteViewerUseCase`テストファイルに、AC-03（REQ-501）の正常系、送信失敗時の補償（旧トークンへの復元）、補償操作自体が失敗した場合のエラーログ出力のテストケースを追加する

- [x] **TASK-4-05: `POST /api/projects/{projectId}/viewers`統合テストへの分岐ケース追加（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-02, TASK-4-03, TASK-4-04
  - **関連要件**: REQ-103, REQ-501, REQ-502
  - **関連設計**: design.md §7.1
  - **実装詳細**: 既存`viewerManagementRoutes.integration.test.ts`に、AC-02・AC-03、およびREQ-502のno-opに対応するAPIレベルのテストケースを追加する
  - **完了条件**: 3分岐すべてがAPIレベルで検証されること

## 7. このフェーズの完了条件

- `InviteViewerUseCase`が、別project追加招待・no-op・期限切れ再発行の3分岐を正しく処理すること
- メール送信失敗時の補償操作が、再発行のケースでも正しく動作すること
- サーバー側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること

## 8. 実施記録

- 開始時刻: 2026-08-18 20:39 JST
- 終了時刻: 2026-08-18 20:54 JST
- 合計時間: 約15分（typecheck/test/lint/build/semgrepの実行時間を含む）

### 差異の記録

- **既存招待・既存トークンの読み取り位置**: phase4-beforeの完了により`InviteViewerUseCase`のコンストラクタから`IProjectViewerRepository`/`IViewerAccessTokenRepository`の直接注入が外れているため、design.md 5.1節手順5・6（既存招待・既存トークンの読み取り）を、手順7（判断・書き込み）と同じ`unitOfWork.execute()`コールバック内で実行する構成にした。読み取りと書き込みを単一トランザクションにまとめることで、design.mdが想定する「読み取り→トランザクション内書き込み」より厳密な一貫性（読み取り後に他のリクエストが割り込むレースコンディションの排除）を得られるため、設計意図に反しない拡張と判断した
- **Codexレビュー（8観点）で検出し、対応不要と判断した指摘**:
  - 【line-by-line, 重要】`existingViewer !== null`の判定が`status`（active/revoked）を見ておらず、取り消し済み招待への再招待でも「既存招待あり」として扱われる点を指摘された。ただしrevoke機能（`ProjectViewerEntity.revoke()`を呼び出すUseCase・エンドポイント）はPhase 5で実装予定であり、現時点のコードベースには`revoked`状態の行を作る経路が一切存在しない（`grep`で確認済み）。phase4.md自体が「取り消し済み招待の復元はPhase 5で実装する」と明記しており、本フェーズでは意図的に未対応とした。Phase 5でrevoke/restoreを実装する際、この分岐判定に`status`チェックを追加する必要がある点をここに記録する
  - 【reuse, 中】`IViewerAccessTokenRepository.replace`を新設せず既存の`save`（email単位のupsert）を再利用できるとの指摘があったが、`replace`はID・新ハッシュ・新有効期限のプリミティブ値のみで補償復元を表現できる設計として元々phase4.mdのTASK-4-01で意図的に採用したもの。`save`を使う場合は補償復元のたびに`ViewerAccessTokenEntity.reconstruct()`で完全なエンティティを再構築する必要があり、かえって複雑になるため、既存設計を維持した
  - 【altitude, 軽微】トークン再発行のロジックを`ViewerAccessTokenEntity`に`reissue()`のような変更メソッドを持たせる形にすべきとの指摘があったが、`ViewerAccessTokenEntity`は現状すべてのフィールドがreadonlyな不変オブジェクトであり、変更を許容する設計へ拡張するには他の呼び出し箇所への影響範囲が広く、本フェーズの完了条件（3分岐の実装）に対して実施コストが見合わないため見送った。将来的な改善候補としてここに記録する
  - 【simplification, 軽微】メール補償復元時に`updatedAt`が現在時刻で更新され、旧`updatedAt`までは復元されない点を指摘されたが、要件・受け入れ基準のいずれも`updatedAt`の完全な復元を求めておらず、対応コストに見合わないため見送った
- **Codexレビューで対応した指摘**: 【conventions, 軽微】`InviteViewerUseCase.ts`内のWhatを説明するだけのコメント3箇所（トランザクション処理の説明、no-op分岐の説明、`TokenCompensation`型の説明）を削除・Why中心の記述へ修正した。【simplification, 軽微】トークン新規発行と期限切れ再発行で重複していたrawToken生成・ハッシュ計算・有効期限計算のロジックを`needsTokenIssuance`による共通化に統合し、`expiresAt`の起算時刻も`Date.now()`ではなく既に取得済みの`now`に統一した

### 所要時間

- `bunx tsc --noEmit`（server）: エラーゼロ
- `bun test`（server）: 918 pass / 0 fail（約21秒）
- `bun run fix`（Biome lint & format、server/client）: 修正なし
- `docker compose build server`: 正常にビルド完了
- `semgrep --config auto`（viewer関連パス対象）: 210ルール・42ファイルスキャンで0 findings
- `bun run knip`: viewer関連の新規未使用ファイル・exportsなし（`src/schemas/project-viewers.ts`等の指摘はPhase1から続く既存の技術的負債であり本フェーズ固有ではない）
