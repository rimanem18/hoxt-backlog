# project基盤 実装プラン概要

## 1. 概要

- **Requirement ID**: HOXBL-99
- **参照要件**: tasks/HOXBL-99/spec/requirements.md
- **参照技術設計**: tasks/HOXBL-99/technical/design.md
- **目的**: `task` を束ねる `project` エンティティを新設し、project単位でのtask管理（作成時必須選択・後からの変更・一覧・詳細・編集）を実現する
- **対象**: project ドメイン新設（server）、`tasks.project_id` 追加、project/task 関連API、フロントエンドのproject機能一式（一覧・作成・詳細・編集、taskフォームへのproject選択統合）
- **対象外**: project削除、他ユーザーprojectの閲覧共有（②viewer招待以降）、通知・リアクション、汎用task絞り込みUI

## 2. 前提と確認事項

- requirements.md 13章の通り、業務要件レベルの未決事項はない
- technical-design.md 12章 RISK-01: 他ユーザーprojectへのアクセスは403ではなく404で拒否する（存在の有無を明かさないfail-closed設計）。フロントエンドのエラーメッセージも「見つかりません」系の文言になる前提で実装する
- technical-design.md 12章 RISK-02: `ProjectName`と`TaskTitle`のバリデーションロジック重複は今回許容する（3つ目の同種VOが出た時点で共通化を検討）
- technical-design.md 13章: `CreateTaskUseCase`/`UpdateTaskUseCase`の`projectId`所有権検証（`IProjectRepository.findById`呼び出し）は1リクエストにつき1回のみであることをテストで担保する（N+1回避）
- 既存taskの`project_id`はNULL許容のまま運用し、一括移行は行わない（REQ-003、US-03）
- `GET /api/tasks?projectId=`は、`tasks`側の`userId`条件だけでは他ユーザー・存在しないprojectIdに対して「空配列」を返してしまい、REQ-303/NFR-101が求める「操作の拒否」が表現できない。Phase 6で`IProjectRepository.findById`による事前所有権検証を組み込み、該当しない場合は`ProjectNotFoundError`（404）とする

## 3. ユースケース一覧

- **UC-01**: project作成
  - **結果**: ログイン済みユーザーが名前（必須・trim後1〜100文字）と説明文（任意）でprojectを新規作成できる。同名projectの重複は許可される
  - **関連要件**: REQ-001, REQ-002, REQ-101, REQ-301, REQ-306
  - **関連設計**: design.md §4.1, §5.1, §7.1, §8

- **UC-02**: project一覧取得
  - **結果**: ユーザーが自分の作成したprojectのみを一覧で確認できる
  - **関連要件**: REQ-104
  - **関連設計**: design.md §4.1, §7.1

- **UC-03**: project詳細取得（アクセス制御込み）
  - **結果**: ユーザーが自分のprojectの名称・説明文を確認できる。他ユーザーのprojectは404で拒否される
  - **関連要件**: REQ-106, REQ-303, NFR-101
  - **関連設計**: design.md §3.1, §7.1, §7.2, §9

- **UC-04**: project編集
  - **結果**: ユーザーが自分のprojectの名称・説明文を更新できる。バリデーション違反・他ユーザーprojectへの編集は拒否される
  - **関連要件**: REQ-107, REQ-304, REQ-305, REQ-306
  - **関連設計**: design.md §4.1, §7.1

- **UC-05**: task新規作成時のproject必須選択
  - **結果**: task作成時に自分のprojectの中から所属先を1つ選択しないと作成できない。他ユーザーのprojectは指定できない
  - **関連要件**: REQ-102, REQ-105, REQ-302, REQ-303
  - **関連設計**: design.md §4.2, §5.1, §5.2, §7.1

- **UC-06**: task編集時のproject変更
  - **結果**: 既存taskの所属projectを、自分が作成した別のprojectに変更できる
  - **関連要件**: REQ-103
  - **関連設計**: design.md §4.2, §7.1

- **UC-07**: project詳細画面でのtask絞り込み表示
  - **結果**: project詳細画面を開くと、そのprojectに紐づくtaskのみが一覧表示される（0件時は空一覧、他ユーザーprojectId指定時は拒否）
  - **関連要件**: REQ-106, REQ-303
  - **関連設計**: design.md §3.1, §7.1

- **UC-08**: project未所属taskの継続表示
  - **結果**: 移行前から存在するproject未所属taskが、一覧・編集画面に引き続き表示される
  - **関連要件**: REQ-003, REQ-201
  - **関連設計**: design.md §6

## 4. フェーズ一覧

- **Phase 1: project基盤整備（DB・ドメイン・リポジトリ）**
  - **目的**: `projects`テーブル・RLS・スキーマ生成設定・`ProjectName`/`ProjectEntity`/`IProjectRepository.save`を、複数フェーズの前提となる最小限のwalking skeletonとして成立させる
  - **確認可能なこと**: `PostgreSQLProjectRepository.save`の統合テストでDBへの永続化が確認できる。`ProjectName`/`ProjectEntity`の単体テストでバリデーションが機能する
  - **関連要件**: REQ-001, REQ-002
  - **関連設計**: design.md §4.1, §8, §8.1
  - **依存**: なし

- **Phase 2: project作成API（POST /api/projects）**
  - **目的**: `POST /api/projects`により、project作成をAPI応答まで一貫して成立させる
  - **確認可能なこと**: 名前のみ/名前+説明文でprojectが作成でき、名前未入力・空白のみ・101文字でエラーになる。同名projectの重複作成がエラーにならない（AC-01, AC-02, AC-07）
  - **関連要件**: REQ-001, REQ-002, REQ-101, REQ-301, REQ-306
  - **関連設計**: design.md §5.1, §5.2, §7.1, §7.2
  - **依存**: Phase 1

- **Phase 3: project一覧・詳細取得API（アクセス制御込み）**
  - **目的**: `GET /api/projects`、`GET /api/projects/{id}`により、自分のprojectのみを一覧・詳細取得できる状態を成立させる
  - **確認可能なこと**: 自分のproject一覧が取得できる。他ユーザーのprojectを`{id}`指定した場合に404が返る（AC-06）
  - **関連要件**: REQ-104, REQ-106, REQ-303, NFR-101
  - **関連設計**: design.md §3.1, §7.1, §7.2, §9
  - **依存**: Phase 1, Phase 2

- **Phase 4: project編集API**
  - **目的**: `PUT /api/projects/{id}`により、project名称・説明文の更新を成立させる。更新はEntity（`ProjectName`）による検証を経由する
  - **確認可能なこと**: 自分のprojectの名称・説明文を更新できる。空白のみ・101文字への更新、他ユーザーprojectへの編集がいずれも拒否される（AC-08, AC-09）
  - **関連要件**: REQ-107, REQ-304, REQ-305, REQ-306
  - **関連設計**: design.md §4.1, §7.1
  - **依存**: Phase 1, Phase 3

- **Phase 5: task側DB拡張とEntity/Repository対応**
  - **目的**: `tasks.project_id`カラムを追加し、`TaskEntity`/`ITaskRepository`にprojectId関連の型・検索条件を組み込む
  - **確認可能なこと**: `PostgreSQLTaskRepository`の統合テストで、`projectId`フィルタあり/なしの検索、project未所属task（`project_id = null`）が`projectId`未指定時に引き続き返ることが確認できる
  - **関連要件**: REQ-003, REQ-102, REQ-103, REQ-201
  - **関連設計**: design.md §4.2, §8
  - **依存**: Phase 1

- **Phase 6: task作成・更新・一覧APIのproject統合（所有権検証込み）**
  - **目的**: `POST/PUT/GET /api/tasks`にproject連携を組み込み、REQ-102/103/106/201/302/303をAPIレベルで成立させる
  - **確認可能なこと**: `POST /api/tasks`でprojectId必須・所有権検証が機能する。`PUT /api/tasks/{id}`でprojectId変更ができる。`GET /api/tasks?projectId=`で絞り込みでき、他ユーザー・存在しないprojectIdの指定は404で拒否される。project未所属taskが引き続き一覧に含まれる
  - **関連要件**: REQ-003, REQ-102, REQ-103, REQ-106, REQ-201, REQ-302, REQ-303
  - **関連設計**: design.md §4.2, §5.1, §5.2, §7.1, §13
  - **依存**: Phase 3, Phase 5

- **Phase 7: フロントエンド - project一覧・作成UI**
  - **目的**: `features/project`を新設し、ブラウザ上でproject一覧の閲覧とproject作成を成立させる
  - **確認可能なこと**: ブラウザでproject作成フォームから送信し、一覧に反映されることを確認できる。0件時の空状態、送信中・エラー時の表示を確認できる
  - **関連要件**: REQ-001, REQ-002, REQ-101, REQ-104, REQ-301, REQ-306
  - **関連設計**: design.md §4.3, §13
  - **依存**: Phase 2, Phase 3

- **Phase 8: フロントエンド - project詳細・編集UI**
  - **目的**: project詳細画面（そのprojectに紐づくtask一覧を含む）と編集フォームを成立させる
  - **確認可能なこと**: project詳細画面を開き、そのprojectのtaskのみが表示されることを確認できる。名称・説明文の編集ができる。他ユーザーprojectへの直接アクセス（URL指定）が「見つかりません」表示になることを確認できる
  - **関連要件**: REQ-106, REQ-107, REQ-303, REQ-304, REQ-305, REQ-306
  - **関連設計**: design.md §4.3, §7.2, §12 RISK-01
  - **依存**: Phase 3, Phase 4, Phase 6, Phase 7

- **Phase 9: フロントエンド - task作成・編集へのproject選択統合**
  - **目的**: `TaskCreateForm`/`TaskEditModal`にproject選択UIを組み込み、task⇔project連携をユーザー操作として成立させる
  - **確認可能なこと**: task作成時にproject選択が必須になり、未選択でエラー表示される。task編集時に所属projectを変更できる。project未所属taskが一覧・編集画面に引き続き表示される
  - **関連要件**: REQ-003, REQ-102, REQ-103, REQ-105, REQ-201, REQ-302
  - **関連設計**: design.md §4.3, §13
  - **依存**: Phase 6, Phase 7

## 5. リスクと注意点

- **RISK-01**: 他ユーザーprojectへのアクセス拒否は403ではなく404で表現される。Phase 8のフロントエンド実装で「権限がない」ではなく「見つかりません」という文言になる点を関係者と合わせる（design.md §12 RISK-01）
- **RISK-02**: `ProjectName`と`TaskTitle`のバリデーションロジックは意図的に重複させる（design.md §12 RISK-02）。Phase 1で共通化を試みないこと
- **RISK-03**: Phase 6の`CreateTaskUseCase`/`UpdateTaskUseCase`/`GetTasksUseCase`は所有権検証のため`IProjectRepository.findById`を呼ぶが、1リクエストにつき1回のみであることをテストで担保する（design.md §13）。ループ内呼び出し等でN+1化しないよう実装時に注意する
- **RISK-04**: project未所属taskのUI表現は、要件・設計に明記がないため既存の一覧表示をそのまま維持する（未所属を示す特別なバッジ等は今回追加しない）。表示上の課題が実際に見つかった場合のみ、別タスクとして扱う
- **RISK-05**: `GET /api/tasks?projectId=`は`tasks`側の`userId`条件だけでは他ユーザー・存在しないprojectIdに対して「空配列」を返してしまい得るため、Phase 6で`IProjectRepository.findById`による事前検証を必須で組み込む（2章参照）

## 6. スコープ外

- project の削除機能
- 自分以外のユーザーが作成したprojectの閲覧・編集（②viewer招待・閲覧で別途対応）
- task一覧に対する汎用的な複数条件の絞り込みUI
- organization / backlog / backlogItem階層
- 通知機能（③）、リアクション機能（④）
