# Phase 6: ステータス・優先度変更イベントの配信とproject付け替え除外

## 1. このフェーズの目的

- taskのステータス変更・優先度変更それぞれで、変更後の値を含むWeb Push通知が個別に届く状態を成立させ、project間のtask付け替え・値が変化していない更新を誤通知しないことを保証する（UC-04）。Phase 5で確立した配信パイプラインをこの2イベント種別に拡張する

## 2. 確認可能なこと

- taskのステータスを変更すると、変更後のステータスの日本語ラベルを含む通知が届く（前進方向・後退方向どちらの遷移でも）
- taskの優先度を変更すると、変更後の優先度の日本語ラベルを含む通知が届く
- 同一taskへステータス変更と優先度変更が続けて発生した場合、それぞれ個別の通知として届く（1通に集約されない）
- 既存taskの所属projectを変更（project間付け替え）しても「追加」通知は発生しない
- 変更前後で値が変わらない更新（同じステータス・同じ優先度を再設定した場合）では通知が発生しない
- 招待取り消し・通知OFFの場合、ステータス変更・優先度変更イベントでも通知されない（Phase 5で確立したフィルタがtask_added以外でも機能すること）

## 3. 関連要件・関連設計

- **関連要件**: REQ-102, REQ-103, REQ-104（status/priority部分）, REQ-305, REQ-501, AC-01（status/priority）, AC-02, AC-08, AC-09
- **関連設計**: design.md 4.2節（ChangeTaskStatusUseCase/UpdateTaskUseCase変更）, 5.1節手順2, 7.3節（文言表とラベル定義）

## 4. 依存関係

- **前提フェーズ**: Phase 5（`ITaskChangeNotifier`, `DispatchTaskEventNotificationsUseCase`, `TaskChangeNotifierRegistry`を再利用）
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-6-01: ステータス・優先度ラベルのshared-schemas共通定数化**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-104
  - **関連設計**: design.md 7.3節（reuse方針の根拠）
  - **実装詳細**: `app/client/src/features/todo/components/TaskItem.tsx`内の`statusLabelMap`（`not_started`→未着手 等）と優先度ラベル（`high`/`medium`/`low`の日本語表示）を、`app/packages/shared-schemas/src/tasks.ts`へ共通定数として抽出する。`TaskItem.tsx`はこの共通定数を参照するようリファクタリングし、表示内容が変わらないことを既存テストで確認する
  - **完了条件**: `app/packages/shared-schemas/__tests__/`に定数のテストを追加し、`TaskItem.tsx`の既存テストがそのまま通過する
  - **単体テスト要件**: 全ステータス値・全優先度値に対応するラベルが定義されていること
  - **注意点**: 既存の表示文言を変更しない（車輪の再発明防止、CLAUDE.mdの重複排除方針）

- [ ] **TASK-6-02: DispatchTaskEventNotificationsUseCaseのstatus_changed/priority_changed対応**
  - **タイプ**: TDD
  - **依存タスク**: TASK-6-01
  - **関連要件**: REQ-102, REQ-103, REQ-104, REQ-303, REQ-304, REQ-501
  - **関連設計**: design.md 5.1節手順7, 7.3節文言表
  - **実装詳細**: `DispatchTaskEventNotificationsUseCase`のpayload組み立てロジックを拡張し、`type: 'status_changed'`では`「{taskTitle}」のステータスが{newStatusLabel}に変更されました`、`type: 'priority_changed'`では`「{taskTitle}」の優先度が{newPriorityLabel}に変更されました`を生成する。ラベルはTASK-6-01の共通定数を参照し、変更前の値は一切含めない（REQ-104）。対象者フィルタ（`active`かつ`notificationEnabled`）はtask_addedと共通のロジックであることを、イベント種別をパラメータ化したテストで明示する
  - **完了条件**: `DispatchTaskEventNotificationsUseCase.test.ts`の追加テストが通過する
  - **単体テスト要件**: AC-01相当（status_changed/priority_changedそれぞれで変更後の値を含む通知が生成されること、変更前の値が含まれないこと）／AC-08相当（同一taskへの複数イベントがそれぞれ個別のpayloadとして生成され1通に集約されないこと）／REQ-303・REQ-304相当（`status_changed`・`priority_changed`いずれも、revoked・通知OFFのviewerが除外されること。task_addedと同じフィルタが3イベント種別すべてで機能することをパラメータ化テストで検証する）

- [ ] **TASK-6-03: ChangeTaskStatusUseCaseへの通知発行追加**
  - **タイプ**: TDD
  - **依存タスク**: TASK-5-05, TASK-6-02
  - **関連要件**: REQ-102
  - **関連設計**: design.md 4.2節, 5.1節手順2
  - **実装詳細**: `app/server/src/task/application/ChangeTaskStatusUseCase.ts`の更新成功後に`TaskChangeEvent(type: 'status_changed', newStatus)`を組み立て、`TaskChangeNotifierRegistry.getNotifier().notify(event)`を`await`して呼び出す（`try/catch`でログのみに留め、UseCase自体の戻り値・例外に影響させない）
  - **完了条件**: `ChangeTaskStatusUseCase.test.ts`が通過する
  - **単体テスト要件**: AC-02相当（前進方向・後退方向どちらのステータス変更でも`notify()`が呼ばれること）／`notify()`失敗時もUseCaseの戻り値・例外に影響しないこと

- [ ] **TASK-6-04: UpdateTaskUseCaseへの優先度変更通知追加とproject付け替え除外**
  - **タイプ**: TDD
  - **依存タスク**: TASK-5-05, TASK-6-02
  - **関連要件**: REQ-103, REQ-305
  - **関連設計**: design.md 4.2節, 5.1節手順2
  - **実装詳細**: `app/server/src/task/application/UpdateTaskUseCase.ts`で、更新前に`task.getPriority()`（現在の値）を取得しておき、`input.data.priority`が指定されておりかつ**現在値と異なる場合のみ**`TaskChangeEvent(type: 'priority_changed', newPriority)`を組み立て、変更後の`projectId`（`input.data.projectId`が指定されていればその値、なければ既存の`projectId`）を宛先として`TaskChangeNotifierRegistry.getNotifier().notify(event)`を`await`して呼び出す（`try/catch`でログのみに留め、UseCase自体の戻り値・例外に影響させない）。同一値が再設定された場合（`changePriority()`は現行実装では値の異同を問わず呼ばれるため、UseCase側で明示的に比較する）は通知しない。`input.data.projectId`のみの変更（priorityが同時に変わらない、または同値の場合）では`notify()`を一切呼び出さない（REQ-305）
  - **完了条件**: `UpdateTaskUseCase.test.ts`が通過する
  - **単体テスト要件**: AC-09相当（`projectId`のみ変更時に`notify()`が呼ばれないこと）／priority変更時に変更後の`projectId`を宛先として`notify()`が呼ばれること／priorityとprojectIdが同時に変わった場合も「追加」イベントとしては送信されないこと／**同一値のpriorityを再設定した場合に`notify()`が呼ばれないこと**（REQ-103「優先度が変更されたとき」の解釈補強）

- [ ] **TASK-6-05: Phase 6品質ゲート確認と全体疎通確認**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-6-01〜TASK-6-04
  - **関連要件**: なし（品質保証）
  - **関連設計**: なし
  - **実装詳細**: quality-gate-runnerサブエージェントへserver・client双方の`tsc --noEmit`・`bun test`・`biome`・`semgrep`・`knip`の実行を依頼する。加えてAC-01〜AC-10全項目の手動疎通確認チェックリストを実施する
  - **完了条件**: 全チェックがパスし、AC-01〜AC-10のいずれも期待結果通りであることを確認する

## 6. このフェーズの完了条件

- ステータス変更・優先度変更それぞれで、変更後の値を含む個別の通知が届くことが確認できる（AC-01, AC-02, AC-08）
- project間のtask付け替え、および値が変化しない更新が「追加」通知・誤通知を発生させないことが確認できる（AC-09）
- HOXBL-102の受け入れ基準（AC-01〜AC-10）がすべて満たされていることを確認できる
