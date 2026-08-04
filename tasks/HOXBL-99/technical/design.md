# project基盤 技術設計書

## 1. 概要

- **Requirement ID**: HOXBL-99
- **参照要件**: tasks/HOXBL-99/spec/requirements.md
- **参照技術メモ**: tasks/HOXBL-99/spec/technical-spec.md
- **目的**: `task` を束ねる `project` エンティティを新設し、project単位でのtask管理（作成時必須選択・後からの変更・一覧・詳細・編集）を実現する技術構成を定める
- **対象**: project ドメインの新設（server）、`tasks.project_id` の追加、project/task 関連API、フロントエンドのproject機能一式
- **対象外**: project削除、他ユーザーprojectの閲覧共有（②以降）、通知・リアクション、汎用task絞り込みUI

## 2. 入力と前提

### 2.1 参照した情報

- `tasks/HOXBL-99/spec/requirements.md`（正本）
- `tasks/HOXBL-99/spec/technical-spec.md`（補助）
- 既存実装: `app/server/src/task/**`（domain/application/infrastructure/presentation の一式）
- `app/server/src/shared/database/schema.ts`（tasks/usersテーブル定義、CHECK制約パターン）
- `app/server/scripts/setup-rls.ts`（RLSポリシー適用の実装）
- `app/server/src/shared/database/DatabaseConnection.ts`（DB接続方式）
- `app/server/src/shared/middleware/errorMiddleware.ts`（エラー→HTTPステータス変換）
- `app/server/scripts/generate-schemas.ts`（Drizzle→Zod自動生成の設定パターン）
- `app/packages/shared-schemas/src/tasks.ts`（API契約スキーマパターン）
- `app/client/src/features/todo/**`（フロントエンドfeature構成パターン）

### 2.2 設計前提

- DBアクセスは `DatabaseConnection.ts` の単一プールコネクション経由であり、Supabaseのリクエスト単位認証コンテキスト（`auth.uid()`）はアプリケーションの通常クエリには伝播しない。実際のアクセス制御は **リポジトリのクエリ条件（`WHERE user_id = :userId`）が一次的な担保** であり、RLSは直接SQLアクセス等に対する多層防御として位置づけられている（既存task実装の`PostgreSQLTaskRepository`が全メソッドで`userId`条件を必須にしている事実から確認）。project も同じ方式を踏襲する。
- 既存の `TaskAccessDeniedError` は定義・exportされているが、`errorMiddleware`のマッピング対象にも、どのUseCaseからも実際にはスローされていない（grep調査で確認）。実際のアクセス拒否は「`userId`条件付きクエリがヒットしない→`TaskNotFoundError`→404」という**存在の有無を明かさない拒否**で実現されている。project についても同じ方式（403ではなく404での拒否）を採用する。詳細は9章・11章で扱う。
- `TaskTitle.create()` はバリデーション失敗時に汎用`Error`を投げており、`InvalidTaskDataError`にラップされていないため、現状は`errorMiddleware`のマッピングに引っかからず500になる（既存の実装ギャップ）。project側では同種の不具合を再現させず、`ProjectName.create()`が直接ドメインエラー（`InvalidProjectDataError`）を投げる設計とする（4章・7.2章参照）。

### 2.3 要件との差分・要確認事項

- なし。requirements.md 13章の通り未決事項はない。設計上の判断はすべて3.1節・11章に根拠と確信度を付けて明示する。

## 3. 設計方針

### 3.1 採用方針

- **project を独立ドメイン（`src/project/`）として新設する**（domain/application/infrastructure/presentation の4層）
  - **根拠**: technical-spec.md TS-001。project は task から参照されるが、taskとはライフサイクルが異なり、②viewer招待・③通知・④リアクションの起点にもなる。既存のドメインファースト構成（`.claude/rules/backend.md`）にも合致する
  - **確信度**: 高
- **`tasks.project_id` はNULL許容カラムとし、必須性はアプリケーション層（Zodスキーマ + UseCase）で制御する**
  - **根拠**: REQ-003（既存taskは未所属のまま）とREQ-102/REQ-302（新規task作成時は必須）が両立するのはDBレベルではなくアプリケーション層でのみ。既存taskの`title`と同様、DB CHECK制約とZodの二重管理パターンを踏襲（TS-101, TS-301, TDQ-02, TDQ-04）
  - **確信度**: 高
- **アクセス制御は既存task同様「所有者IDを条件に含めたクエリ→ヒットしなければ404」で実現し、RLSを多層防御として追加する**
  - **根拠**: 既存`PostgreSQLTaskRepository`の全メソッドがこのパターン。NFR-101のfail-closed方針にも合致し、他ユーザーprojectの存在有無を漏らさない点でより安全（TS-201, TDQ-03）
  - **確信度**: 高
- **project詳細画面のtask一覧は、新規の「project配下task取得」専用APIを作らず、既存 `GET /api/tasks` にオプションの `projectId` クエリを追加して実現する**
  - **根拠**: technical-spec.md TS-303 / RISK-03。task一覧は既に`userId`スコープの検索基盤（`TaskFilters`, `findByUserId`）を持っており、`projectId`を`TaskFilters`に1項目追加するだけで要件を満たせる。将来の汎用絞り込み機能とも自然に合流できる一方、過剰な抽象化はしない
  - **確信度**: 中（要件からの直接指定ではなく設計判断のため）
- **project選択肢の取得は専用の「選択肢API」を作らず、`GET /api/projects` の一覧結果をフロントエンドで流用する**
  - **根拠**: REQ-104とREQ-105は同じ「自分のprojectのみを返す」という制約であり、レスポンス形状も同一。API重複を避ける（reuse方針）
  - **確信度**: 高
- **project名の制約（trim後1〜100文字）を持つ値オブジェクト `ProjectName` を project ドメイン配下に新設する（`TaskTitle`とロジックは類似するが複製する）**
  - **根拠**: 既存構成では値オブジェクトはドメインごとに`domain/valueobjects/`配下に閉じており、ドメイン間で共有されるvalueobjectの前例がない。現時点で共有化するとドメイン境界を跨ぐ依存が生まれ、独立ドメインとした3.1節の方針と矛盾する
  - **確信度**: 中。将来的に3つ目の同種VOが出た場合は`shared/`への抽出を検討する（12章RISKに記載）

### 3.2 不採用案と理由

- **project を task ドメイン配下のサブ概念として扱う**: 不採用。②viewer招待・③通知・④リアクションがproject起点で積み上がる前提（requirements.md 4.2）があり、taskへの内包は将来の再設計コストが大きい
- **`tasks.project_id` をNOT NULL制約にし、既存taskには移行用ダミーprojectを自動生成して割り当てる**: 不採用。REQ-003「project未所属のまま保持」およびUS-03「移行タイミングをユーザーが選ぶ」に反する
- **project詳細画面用に `GET /api/projects/{id}/tasks` を新設する**: 不採用。3.1節の通り、既存`GET /api/tasks?projectId=`で要件を満たせるため、エンドポイント重複を避ける
- **RLSポリシーのみでアクセス制御を担保し、アプリケーション層のクエリ条件を省略する**: 不採用。2.2節の前提の通り、通常のアプリケーションDB接続経由ではSupabaseの`auth.uid()`が設定されずRLSが実効しないため、アプリケーション層の条件が唯一の実効的な制御になる

## 4. システム構成と責務分割

### 4.1 コンポーネント構成（server: `src/project/`）

- **`ProjectEntity`（domain）**: project の本質的な状態（id, userId, name, description, createdAt, updatedAt）と`updateName`/`updateDescription`のふるまいを保持
  - **関連要件**: REQ-001, REQ-107, REQ-304, REQ-306
  - **根拠**: `TaskEntity`と同一パターン（ファクトリメソッド`create`/`reconstruct`、private constructor）
  - **確信度**: 高
- **`ProjectName`（domain/valueobjects）**: trim後1〜100文字を保証する値オブジェクト。違反時は`InvalidProjectDataError`を直接スロー
  - **関連要件**: REQ-001, REQ-301, REQ-304, REQ-306
  - **根拠**: `TaskTitle`パターンを踏襲しつつ、2.2節で述べた既存の例外ラップ漏れを再発させないため、`Error`ではなく最初からドメインエラーを投げる
  - **確信度**: 高
- **`IProjectRepository`（domain）**: `save` / `findByUserId` / `findById(userId, projectId)` / `update(userId, projectId, input)` を定義（`delete`は未定義＝スコープ外）
  - **関連要件**: REQ-101, REQ-104, REQ-106, REQ-107
  - **確信度**: 高
- **`CreateProjectUseCase` / `GetProjectsUseCase` / `GetProjectByIdUseCase` / `UpdateProjectUseCase`（application）**: `ITaskRepository`と対になるユースケース群。`findById`/`update`は必ず`userId`を条件に含める
  - **関連要件**: REQ-101, REQ-104, REQ-106, REQ-107, REQ-303, REQ-305
  - **確信度**: 高
- **`PostgreSQLProjectRepository`（infrastructure）**: Drizzle経由の永続化実装。`PostgreSQLTaskRepository`と同一パターン
  - **確信度**: 高
- **`ProjectDIContainer`（infrastructure）**: `TaskDIContainer`と同一パターンのシングルトンDI
  - **確信度**: 高
- **`ProjectController` / `projectRoutes.schema.ts` / `projectRoutes.ts`（presentation）**: `TaskController`等と同一パターン
  - **確信度**: 高

### 4.2 既存task側の変更

- **`ITaskRepository`**: `TaskFilters`に`projectId?: string`を追加し、`findByUserId`のWHERE条件に反映
- **`TaskEntity` / `CreateTaskEntityInput` / `TaskEntityProps`**: `projectId: string | null`を追加。`create()`の入力では必須（`undefined`不可）とし、`reconstruct()`では既存task互換のため`null`を許容
- **`CreateTaskUseCase`**: `projectId`を受け取り、`IProjectRepository.findById(userId, projectId)`で所有権を検証してから`TaskEntity.create`を呼ぶ（所有権検証はUseCase層、値の形式検証はEntity層という既存の役割分担を維持）
- **`UpdateTaskUseCase`**: `projectId`が渡された場合のみ同様に所有権検証を行う（REQ-103）

### 4.3 システム境界

- project ドメインは task ドメインから**参照される**が、task ドメインへは依存しない（一方向）。`CreateTaskUseCase`/`UpdateTaskUseCase`が`IProjectRepository`に依存する形で境界を跨ぐ（`@/project/domain/IProjectRepository`の絶対パスimport、`.claude/rules/backend.md`の他ドメインimport規約に従う）
- フロントエンドも同様に、`features/project`を新設し、`features/todo`（task機能）側がproject選択のために`features/project`のフックを利用する一方向依存とする

## 5. 処理フロー

### 5.1 正常系フロー（project作成 → task作成 → project詳細表示）

1. ユーザーがproject作成フォームで名前（必須）・説明文（任意）を送信 → `POST /api/projects` → `CreateProjectUseCase` → `ProjectEntity.create`でバリデーション → 保存 → 201
2. ユーザーがtask作成フォームを開く → `GET /api/projects` で自分のproject一覧を取得し選択肢に表示（REQ-105）
3. projectを選択してtask作成 → `POST /api/tasks`（body に必須`projectId`）→ `CreateTaskUseCase`が`IProjectRepository.findById(userId, projectId)`で所有権確認 → `TaskEntity.create` → 保存 → 201
4. ユーザーがproject詳細画面を開く → `GET /api/projects/{id}`で名称・説明文を取得（所有権確認込み）→ `GET /api/tasks?projectId={id}`で紐づくtaskのみ取得（REQ-106）

### 5.2 異常系フロー

- project名が空/空白のみ/101文字以上（REQ-301, REQ-304, REQ-306）: `ProjectName.create`が`InvalidProjectDataError`をスロー → 400
- task作成時に`projectId`未指定（REQ-302）: Zodスキーマで必須項目違反 → 400（`VALIDATION_ERROR`）
- task作成・更新・project編集で他ユーザーのproject/taskを指定（REQ-303, REQ-305）: 所有権付きクエリがヒットせず`ProjectNotFoundError`/`TaskNotFoundError` → 404（存在の有無を明かさないfail-closed。3.1節参照）
- 存在しないprojectIdを`GET /api/projects/{id}`で指定: `ProjectNotFoundError` → 404

### 5.3 データフロー

- **入力**: project作成/編集フォーム、task作成/編集フォームのproject選択
- **中間処理**: Zodスキーマによる形式検証（presentation層への入口）→ UseCaseでの所有権検証 → Entity/ValueObjectでの業務ルール検証
- **保存先**: `projects`テーブル、`tasks.project_id`
- **返却内容**: project/task のDTO（既存`TaskDTO`と同型の`ProjectDTO`、`TaskDTO`に`projectId`追加）

## 6. 状態管理と整合性

- **project未所属状態**: `tasks.project_id = NULL`。既存task移行時は変更せず、REQ-201の通りtask一覧・編集画面には引き続き表示する（フィルタ条件に含めないだけで除外しない）
- **project所属の変更**: `tasks.project_id`は作成後も更新可能（REQ-103）。楽観ロックやバージョン管理は導入しない（既存`UpdateTaskUseCase`にも存在せず、要件上も同時編集の整合性要求は出ていないため、既存task更新と同じ「後勝ち（last-write-wins）」を踏襲）
- **重複実行対策**: project作成・task作成のいずれも冪等性キーは導入しない（既存task作成と同水準。二重送信で複数件作成され得るのは既存仕様と同一の既知の制約であり、本要件のスコープでは変更しない）
- **部分成功の扱い**: project作成とtask作成は別トランザクション・別APIであり、部分成功は発生しない（task作成時のproject所有権検証は同一リクエスト内の事前チェックであり、保存前に完結する）
- **project名の重複**: 一意性制約を設けない（REQ-002）。UI/API上の識別は常に`id`で行う（technical-spec.md RISK-02）

## 7. インターフェース設計

### 7.1 API一覧

- **`POST /api/projects`**: project作成。入力`{ name, description? }`、出力`201 ProjectDTO`。関連: REQ-101, REQ-301, REQ-306, AC-01, AC-02, AC-07
- **`GET /api/projects`**: 自分のproject一覧取得。出力`200 ProjectDTO[]`。project選択肢表示にも流用。関連: REQ-104, REQ-105, AC-03, AC-06
- **`GET /api/projects/{id}`**: project詳細（名称・説明文）取得。所有権チェックあり。出力`200 ProjectDTO` / `404`。関連: REQ-106, REQ-303, AC-06, AC-10
- **`PUT /api/projects/{id}`**: project名称・説明文更新（部分更新）。所有権チェックあり。出力`200 ProjectDTO` / `400` / `404`。関連: REQ-107, REQ-304, REQ-305, REQ-306, AC-08, AC-09
- **`POST /api/tasks`（既存拡張）**: bodyに`projectId`（必須, uuid）を追加。関連: REQ-102, REQ-302, REQ-303, AC-03
- **`PUT /api/tasks/{id}`（既存拡張）**: bodyに`projectId`（任意, uuid）を追加。関連: REQ-103, AC-05
- **`GET /api/tasks`（既存拡張）**: クエリに`projectId`（任意, uuid）を追加し、project詳細画面のtask一覧取得に利用。関連: REQ-106, AC-10

### 7.2 エラー方針

- 新設エラークラス（`src/project/domain/errors/`）: `ProjectDomainError`（抽象基底、`TaskDomainError`と同型）, `InvalidProjectDataError`（400, `INVALID_PROJECT_DATA`）, `ProjectNotFoundError`（404, `PROJECT_NOT_FOUND`）
- `errorMiddleware`の`ERROR_MAPPINGS`に上記2種を追加登録する（既存の`TaskNotFoundError`/`InvalidTaskDataError`と同列）
- 他ユーザーのproject/taskへのアクセスは403ではなく404で拒否する（3.1節・2.2節の通り、既存task実装の実際の挙動に合わせる）。`taskRoutes.schema.ts`が仕様上403を文書化しているが実装は404である、という既存の食い違いは今回のスコープでは是正せず、project側のOpenAPI定義は実装と一致する404のみを記載する（11.1節に差分として明記）

## 8. データモデル

- **`projects`テーブル（新設）**
  - **役割**: task を束ねるエンティティ
  - **主な属性**: `id`(uuid, PK), `userId`(uuid, FK→users.id, NOT NULL, onDelete cascade), `name`(varchar(100), NOT NULL), `description`(text, nullable), `createdAt`, `updatedAt`
  - **制約**: `non_empty_name`（`length(trim(name)) > 0`）, `name_length`（`length(name) <= 100`）, `idx_projects_user_id`（`userId`検索用）, `idx_projects_user_created`（`userId`+`createdAt desc`、一覧のデフォルトソート用）
  - **関連要件**: REQ-001, REQ-002（一意制約を意図的に設けない）
  - **根拠**: `users`/`tasks`テーブルのCHECK制約・命名パターンを踏襲
  - **確信度**: 高
- **`tasks`テーブル（拡張）**
  - **追加属性**: `projectId`(uuid, nullable, FK→projects.id)
  - **制約**: `idx_tasks_project_id`（フィルタ用）, FK は `onDelete: 'set null'`
    - **根拠/確信度**: project削除は今回スコープ外だが、将来削除機能が追加された際にREQ-201と同じ「project未所属として保持」という業務ルールをDBレベルでも自然に継続できるよう`set null`を選択（`restrict`だと削除機能追加時に別途対応が必要になる）。要件からの直接指定ではないため確信度は中
  - **関連要件**: REQ-003, REQ-102, REQ-103, REQ-201, REQ-302
  - **確信度**: 高（NULL許容自体は3.1節で高確信度と判断済み）

### 8.1 マイグレーション手順（`.claude/rules/schema-db.md`準拠）

1. `schema.ts`に`projects`テーブル定義を追加、`tasks`テーブルに`projectId`カラム・インデックス・FKを追加
2. `scripts/generate-schemas.ts`の`tableConfigs`に`projects`を追加（`title`同様のカスタムバリデーションで100文字上限を反映）
3. `docker compose exec server bun run db:generate`でマイグレーションファイル生成 → コミット
4. `generate:schemas` → `generate:openapi` → `generate:types`の順で実行
5. `scripts/setup-rls.ts`に`projects`テーブルのRLS有効化・ポリシー作成を追加（既存`users_own_tasks_policy`と同型で`users_own_projects_policy`を追加。`auth.uid()::text = user_id::text`）
6. Preview/Production環境へは既存の`db:migrate:preview` / `db:migrate:production` → `db:setup`の順で適用（新規追加のみで既存データへの破壊的変更はない）

## 9. 認証・認可・監査・ログ

- **認証前提**: 既存のSupabase JWT（JWKS検証）による認証済みユーザーであることを前提とする（requirements.md 4.1、変更なし）
- **認可方針**: project/task いずれも「作成者本人のみ操作可能」。実効的な担保はリポジトリ層の`userId`スコープ付きクエリ（2.2節）。RLSは多層防御として追加するが、アプリ接続では実効しないことを明示しておく（誤った安心感を持たないため）
- **監査対象**: technical-spec.md 4.6の通り、今回のヒアリングでは監査要件は明示されていない。追加実装は行わない
- **ログ方針**: 既存の`errorMiddleware`内`console.error`によるエラーログ方針を踏襲。project固有の追加ログは設けない

## 10. 非機能要件の実現方針

### 10.1 パフォーマンス

- project一覧・project詳細のtask一覧はいずれも`userId`（+`projectId`）の複合インデックスで検索可能な範囲に留まる。既存taskの検索パターンと同規模であり追加のパフォーマンス対策は不要
  - **根拠**: 既存`idx_tasks_user_id`等のインデックス設計を踏襲
  - **確信度**: 高

### 10.2 セキュリティ

- NFR-101（fail-closed）は、9章の通りリポジトリ層のクエリスコープを一次防御、RLSを二次防御として二重に実現する
  - **根拠**: requirements.md NFR-101、既存task実装の実際の担保方式
  - **確信度**: 高

### 10.3 可用性・運用性

- 新規テーブル追加のみで既存データへの破壊的変更を伴わないため、ダウンタイムなしでマイグレーション可能
  - **根拠**: 8.1節のマイグレーション手順
  - **確信度**: 高

## 11. 既存設計・既存実装との差分

### 11.1 既存設計との差分

- `taskRoutes.schema.ts`はOpenAPI上403レスポンスを文書化しているが、実装（`errorMiddleware`, 各UseCase）は403を一切スローせず404で拒否している。この食い違いは既存の設計文書化漏れであり、本要件では是正しない（project側は実装に合わせて404のみ文書化する）
- `InvalidTaskDataError`は定義されているが`TaskTitle.create()`から実際には投げられておらず、バリデーションエラーが意図せず500になる既存のギャップがある。project側では同種のギャップを再発させない設計とする（7.2節）

### 11.2 既存実装との差分

- `ITaskRepository` / `TaskEntity` / `CreateTaskUseCase` / `UpdateTaskUseCase` / `TaskFilters` / `taskRoutes.schema.ts` / `shared-schemas/src/tasks.ts` を変更する（4.2節、7.1節）
- `scripts/setup-rls.ts`、`scripts/generate-schemas.ts`、`schema.ts`を変更する（8.1節）
- フロントエンド`features/todo`のtask作成・編集フォームにproject選択UIを追加する（4.3節）

## 12. リスクと確認事項

- **RISK-01**: `TaskAccessDeniedError`と同様、project用に用意する`ProjectNotFoundError`ベースの404拒否は「存在しない」のか「権限がない」のか外部から区別できない。これは意図した設計（fail-closed、情報漏洩防止）だが、フロントエンドのエラーメッセージ表示で「見つかりません」という文言になる点を実装時に合わせて確認する
- **RISK-02**: `ProjectName`と`TaskTitle`のロジック重複（trim・1〜100文字）は、3つ目の同種バリデーションが発生した時点で`shared/`への抽出を検討する。今回はドメイン独立性を優先し重複を許容する
- 確認事項なし（要件・設計判断のいずれも本文書内で確定済み）

## 13. 実装への引き継ぎ事項

- `CreateTaskUseCase`/`UpdateTaskUseCase`の`projectId`所有権検証は、`IProjectRepository.findById`の呼び出しコストがtask作成の都度発生する点を踏まえ、N+1が発生しない設計であることをテストで担保する（1リクエストにつき1回のみ）
- テスト設計では、AC-01〜AC-10の受け入れ基準をそのままテストケース化できる粒度で本設計を分解済み（4章コンポーネント、7章API、8章データモデル）。特にAC-06/AC-09の「他ユーザーproject操作の拒否」は404で検証すること（403を期待しない）
- フロントエンド`features/project`は`features/todo`と同様の構成（`components/`, `hooks/`, `lib/`, `store/`, `__tests__/`）とし、`TaskServicesContext.tsx`に相当する`ProjectServicesContext.tsx`を新設する
- `TaskCreateForm.tsx`/`TaskEditModal.tsx`は`features/project`のフック（project一覧取得）に依存する形で改修する（4.3節の一方向依存を維持すること）
