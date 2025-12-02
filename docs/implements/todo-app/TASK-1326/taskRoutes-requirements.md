# taskRoutes統合・テスト - TDD要件定義書

## 📄 ドキュメント情報

- **作成日**: 2025-12-01
- **タスクID**: TASK-1326
- **要件名**: todo-app
- **機能名**: taskRoutes統合・テスト
- **推定工数**: 8時間
- **依存タスク**: TASK-1325

## 【信頼性レベル指示】

各項目について、元の資料（EARS要件定義書・設計文書含む）との照合状況を以下の信号でコメント:

- 🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない場合
- 🟡 **黄信号**: EARS要件定義書・設計文書から妥当な推測の場合
- 🔴 **赤信号**: EARS要件定義書・設計文書にない推測の場合

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

🔵 **青信号** - タスクファイル、設計文書、既存実装より

### 何をする機能か

taskRoutesは、タスク管理APIの6つのエンドポイント（作成・一覧・詳細・更新・削除・ステータス変更）を統合し、以下を実現する:

1. **ルーティング定義の統合**: 各エンドポイントにTaskControllerのメソッドをバインド
2. **ミドルウェアの適用**: authMiddleware（JWT認証）とerrorMiddleware（エラーハンドリング）を統一的に適用
3. **依存性注入**: 6つのUseCaseをTaskControllerに注入
4. **OpenAPI仕様の提供**: Swagger UIでAPIドキュメントを表示可能にする

### どのような問題を解決するか

- **コントローラとルーティングの分離**: TaskControllerは実装済みだが、Honoアプリケーションへの統合が未完了
- **認証・エラーハンドリングの統一**: 全エンドポイントで一貫した認証・エラーレスポンスを提供
- **テスタビリティの確保**: 統合テストで全エンドポイントの動作を検証

### 想定されるユーザー

- **API開発者**: ルーティング定義を確認し、エンドポイントを呼び出す
- **フロントエンド開発者**: Swagger UIでAPIドキュメントを確認
- **QAエンジニア**: 統合テストで全エンドポイントの動作を検証

### システム内での位置づけ

- **Presentation層**: `app/server/src/presentation/http/routes/taskRoutes.ts`
- **依存関係**:
  - TaskController（実装済み）
  - authMiddleware（実装済み）
  - errorMiddleware（実装済み）
  - 6つのUseCase（実装済み）
  - taskRoutes.schema.ts（OpenAPI定義、実装済み）

### 参照したEARS要件

- REQ-001: タスク作成
- REQ-002: タスク更新
- REQ-003: タスク削除
- REQ-004: ステータス変更
- REQ-006: タスク一覧取得
- REQ-402: JWT認証
- REQ-403: RLS設定
- NFR-103: 認証必須

### 参照した設計文書

- architecture.md: DDD + クリーンアーキテクチャ、レイヤ構成
- api-endpoints.md: 6つのエンドポイント仕様
- dataflow.md: データフローとセキュリティフロー

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

🔵 **青信号** - 既存実装（TaskController, taskRoutes.schema.ts）より

### 入力パラメータ

#### DIコンテナ設定（依存性注入）

```typescript
// 6つのUseCaseインスタンス
const createTaskUseCase: CreateTaskUseCase;
const getTasksUseCase: GetTasksUseCase;
const getTaskByIdUseCase: GetTaskByIdUseCase;
const updateTaskUseCase: UpdateTaskUseCase;
const deleteTaskUseCase: DeleteTaskUseCase;
const changeTaskStatusUseCase: ChangeTaskStatusUseCase;
```

#### ルーティング定義

```typescript
// OpenAPIスキーマ（taskRoutes.schema.ts）
const taskRoutes = [
  listTasksRoute,      // GET /tasks
  createTaskRoute,     // POST /tasks
  getTaskRoute,        // GET /tasks/{id}
  updateTaskRoute,     // PUT /tasks/{id}
  changeTaskStatusRoute, // PATCH /tasks/{id}/status
  deleteTaskRoute,     // DELETE /tasks/{id}
];
```

#### ミドルウェア

```typescript
// JWT認証ミドルウェア（AuthMiddleware.ts）
authMiddleware: (c: Context, next: Next) => Promise<void>;

// エラーハンドリングミドルウェア（errorMiddleware.ts）
errorMiddleware: (c: Context, next: Next) => Promise<Response | undefined>;
```

### 出力値

#### Honoアプリケーションインスタンス

```typescript
// 統合されたHonoアプリ（OpenAPIHono）
const app: OpenAPIHono;
```

#### Swagger UIエンドポイント

```
GET /docs - Swagger UI表示
GET /api-spec - OpenAPI仕様（JSON）
```

### 入出力の関係性

```mermaid
flowchart TD
    A["6つのUseCase<br/>（DI）"] --> B["TaskController<br/>（インスタンス化）"]
    C["taskRoutes.schema.ts<br/>（OpenAPI定義）"] --> D["taskRoutes.ts<br/>（統合実装）"]
    B --> D
    E["authMiddleware"] --> D
    F["errorMiddleware"] --> D
    D --> G["OpenAPIHono<br/>（アプリケーション）"]
    G --> H["Swagger UI<br/>（/docs）"]
```

### データフロー

🔵 **青信号** - dataflow.md より

1. **リクエスト受信**: Honoアプリがリクエストを受信
2. **errorMiddleware実行**: try-catchでラップ
3. **authMiddleware実行**: JWT検証 → RLS設定
4. **ルートハンドラ実行**: TaskControllerメソッド呼び出し
5. **UseCase実行**: ビジネスロジック実行
6. **レスポンス返却**: JSON形式で返却

### 参照したEARS要件

- REQ-001〜REQ-007: 各エンドポイントの機能要件
- REQ-402: JWT認証

### 参照した設計文書

- interfaces.ts: TaskDTO型定義（TaskController.ts内）
- taskRoutes.schema.ts: OpenAPI定義
- api-endpoints.md: エンドポイント仕様

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

🔵 **青信号** - architecture.md, tech-stack.md, CLAUDE.md より

### パフォーマンス要件

🔵 **青信号** - api-endpoints.md より

- **レスポンス時間**:
  - `GET /api/tasks`: 1秒以内
  - `POST /api/tasks`: 500ms以内
  - `PUT /api/tasks/:id`: 500ms以内
  - `PATCH /api/tasks/:id/status`: 500ms以内
  - `DELETE /api/tasks/:id`: 500ms以内

### セキュリティ要件

🔵 **青信号** - architecture.md, api-endpoints.md より

- **JWT認証**: すべてのエンドポイントで必須（authMiddleware）
- **JWKS認証**: Supabase Auth JWKSエンドポイントで署名検証
- **RLS設定**: `SET LOCAL app.current_user_id = '{user_id}'` で自動的にユーザー分離
- **Supabase JWT Secret認証禁止**: JWKS認証を使用（CLAUDE.md）

### 互換性要件

🟡 **黄信号** - 既存実装から推測

- **Honoバージョン**: 4.9.0
- **@hono/zod-openapi**: 1.1.3
- **Zodバージョン**: 4.1.12
- **Node.js本番環境**: 22.x（AWS Lambda）

### アーキテクチャ制約

🔵 **青信号** - architecture.md より

- **DDD + クリーンアーキテクチャ**: Presentation層の責務に限定
- **依存性注入**: コンストラクタでUseCaseを注入
- **レイヤ分離**: Application層のUseCaseを呼び出し、Domain層には依存しない

### データベース制約

🔵 **青信号** - architecture.md より

- **RLSポリシー**: `app.current_user_id` を使用したユーザー分離
- **スキーマ**: `app_test`（環境変数 BASE_SCHEMA）

### API制約

🔵 **青信号** - api-endpoints.md より

- **ベースURL**: `/api`
- **認証ヘッダー**: `Authorization: Bearer {jwt_token}`
- **レスポンス形式**: JSON（`{ success: boolean, data?: T, error?: ErrorObject }`）

### 参照したEARS要件

- NFR-001, NFR-002: パフォーマンス要件
- NFR-103: JWT認証必須
- NFR-102: RLS設定
- REQ-402: JWT認証
- REQ-403: RLS設定

### 参照した設計文書

- architecture.md: DDD + クリーンアーキテクチャ、レイヤ構成、RLSポリシー
- tech-stack.md: Hono 4.9.0, @hono/zod-openapi 1.1.3, Zod 4.1.12
- api-endpoints.md: パフォーマンス要件、API制約

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

🔵 **青信号** - タスクファイル、api-endpoints.md、dataflow.md より

### 基本的な使用パターン

#### パターン1: タスク作成

```http
POST /api/tasks HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "会議資料の作成",
  "description": "## 内容\n- 概要説明\n- 提案内容",
  "priority": "high"
}
```

**期待される動作**:
1. errorMiddleware → authMiddleware → TaskController.create
2. JWT検証 → RLS設定（`app.current_user_id`）
3. CreateTaskUseCase実行 → PostgreSQLTaskRepository.save
4. 201 Created レスポンス

#### パターン2: タスク一覧取得（フィルタ・ソート）

```http
GET /api/tasks?status=not_started,in_progress&sort=priority_desc HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**期待される動作**:
1. errorMiddleware → authMiddleware → TaskController.getAll
2. JWT検証 → RLS設定
3. GetTasksUseCase実行（フィルタ・ソート適用）
4. 200 OK レスポンス（TaskDTO[]）

#### パターン3: タスクステータス変更

```http
PATCH /api/tasks/550e8400-e29b-41d4-a716-446655440000/status HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "status": "in_progress"
}
```

**期待される動作**:
1. errorMiddleware → authMiddleware → TaskController.changeStatus
2. JWT検証 → RLS設定
3. ChangeTaskStatusUseCase実行
4. 200 OK レスポンス（更新されたTaskDTO）

### データフロー

🔵 **青信号** - dataflow.md より

```mermaid
sequenceDiagram
    participant C as クライアント
    participant M1 as errorMiddleware
    participant M2 as authMiddleware
    participant TC as TaskController
    participant UC as UseCase
    participant R as Repository
    participant DB as PostgreSQL

    C->>M1: HTTP Request
    M1->>M2: try-catch開始
    M2->>M2: JWT検証（JWKS）
    M2->>M2: RLS設定（app.current_user_id）
    M2->>TC: 認証成功
    TC->>UC: execute()
    UC->>R: save/update/delete/findByUserId
    R->>DB: SQL実行（RLS適用）
    DB-->>R: 結果
    R-->>UC: TaskEntity
    UC-->>TC: TaskEntity
    TC-->>M2: Response
    M2-->>M1: Response
    M1-->>C: JSON Response
```

### エッジケース

🔵 **青信号** - api-endpoints.md より

#### エッジケース1: 認証失敗（401 Unauthorized）

```http
POST /api/tasks HTTP/1.1
Host: localhost:8000
Authorization: Bearer invalid-token
```

**期待される動作**:
1. authMiddleware → JWT検証失敗
2. AuthError → errorMiddleware
3. 401 Unauthorized レスポンス

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "ログインが必要です"
  }
}
```

#### エッジケース2: タスクが見つからない（404 Not Found）

```http
GET /api/tasks/nonexistent-uuid HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**期待される動作**:
1. GetTaskByIdUseCase実行 → TaskNotFoundError
2. errorMiddleware → 404 Not Found レスポンス

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "タスクが見つかりません"
  }
}
```

#### エッジケース3: バリデーションエラー（400 Bad Request）

```http
POST /api/tasks HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "",
  "priority": "invalid"
}
```

**期待される動作**:
1. CreateTaskUseCase実行 → InvalidTaskDataError
2. errorMiddleware → 400 Bad Request レスポンス

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "タイトルを入力してください"
  }
}
```

### エラーケース

🔵 **青信号** - dataflow.md, errorMiddleware.ts より

#### エラーケース1: 他ユーザーのタスクへのアクセス（403 Forbidden）

```http
DELETE /api/tasks/other-user-task-id HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**期待される動作**:
1. RLSポリシーで他ユーザーのタスクへのアクセスをブロック
2. 0件削除 → TaskNotFoundError（404）
3. errorMiddleware → 404 Not Found レスポンス

**注記**: RLSポリシーにより、他ユーザーのタスクは「存在しない」と同等の扱い

#### エラーケース2: データベースエラー（500 Internal Server Error）

**期待される動作**:
1. Repository → データベース接続エラー
2. errorMiddleware → 500 Internal Server Error レスポンス

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "サーバーエラーが発生しました"
  }
}
```

### 参照したEARS要件

- REQ-001〜REQ-007: 各エンドポイントの機能要件
- EDGE-101: 認証失敗
- EDGE-102: タスクが見つからない
- EDGE-103: バリデーションエラー

### 参照した設計文書

- dataflow.md: データフロー図、セキュリティフロー、エラーハンドリングフロー
- api-endpoints.md: エンドポイント仕様、エラーレスポンス

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

🔵 **青信号** - タスクファイル、要件定義書より

- ユーザーストーリー: 「ログインユーザーが自分のタスクをCRUD操作できる」

### 参照した機能要件

🔵 **青信号** - api-endpoints.md より

- **REQ-001**: タスク作成（POST /api/tasks）
- **REQ-002**: タスク更新（PUT /api/tasks/:id）
- **REQ-003**: タスク削除（DELETE /api/tasks/:id）
- **REQ-004**: ステータス変更（PATCH /api/tasks/:id/status）
- **REQ-006**: タスク一覧取得（GET /api/tasks）
- **REQ-201**: 優先度フィルタ（?priority=high）
- **REQ-202**: ステータスフィルタ（?status=not_started,in_progress）
- **REQ-203**: ソート機能（?sort=created_at_desc）

### 参照した非機能要件

🔵 **青信号** - architecture.md, api-endpoints.md より

- **NFR-001**: レスポンス時間（GET /api/tasks: 1秒以内）
- **NFR-002**: レスポンス時間（POST/PUT/PATCH/DELETE: 500ms以内）
- **NFR-102**: RLS設定によるユーザー分離
- **NFR-103**: JWT認証必須

### 参照したEdgeケース

🔵 **青信号** - api-endpoints.md より

- **EDGE-101**: 認証失敗（401 Unauthorized）
- **EDGE-102**: タスクが見つからない（404 Not Found）
- **EDGE-103**: バリデーションエラー（400 Bad Request）

### 参照した受け入れ基準

🔵 **青信号** - タスクファイルより

- taskRoutesが実装される
- 統合テストが通る
- Swagger UIでAPIドキュメント確認
- すべてのエンドポイントが動作する

### 参照した設計文書

#### アーキテクチャ

🔵 **青信号** - architecture.md より

- **DDD + クリーンアーキテクチャ**: Presentation層の責務
- **レイヤ構成**: Presentation層 → Application層 → Domain層 → Infrastructure層
- **依存性注入**: TaskControllerのコンストラクタで6つのUseCaseを注入
- **RLSポリシー**: `app.current_user_id` を使用したユーザー分離

#### データフロー

🔵 **青信号** - dataflow.md より

- **タスク作成フロー**: クライアント → errorMiddleware → authMiddleware → TaskController → UseCase → Repository → PostgreSQL
- **セキュリティフロー**: JWT検証（JWKS） → RLS設定（`app.current_user_id`）
- **エラーハンドリングフロー**: try-catch → エラー種別判定 → HTTPステータスコード変換

#### 型定義

🔵 **青信号** - TaskController.ts, taskRoutes.schema.ts より

- **TaskDTO**: TaskControllerの`toDTO`メソッド
  ```typescript
  interface TaskDTO {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }
  ```
- **OpenAPIスキーマ**: taskRoutes.schema.ts の6つのルート定義

#### データベース

🔵 **青信号** - architecture.md より

- **RLSポリシー**:
  ```sql
  CREATE POLICY "Users can only access their own tasks"
  ON app_test.tasks
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);
  ```
- **スキーマ**: `app_test`（環境変数 BASE_SCHEMA）

#### API仕様

🔵 **青信号** - api-endpoints.md, taskRoutes.schema.ts より

- **6つのエンドポイント**:
  - `GET /tasks`: タスク一覧取得
  - `POST /tasks`: タスク作成（201 Created）
  - `GET /tasks/{id}`: タスク詳細取得
  - `PUT /tasks/{id}`: タスク更新
  - `PATCH /tasks/{id}/status`: ステータス変更
  - `DELETE /tasks/{id}`: タスク削除（204 No Content）
- **認証**: `Authorization: Bearer {jwt_token}`（全エンドポイント必須）
- **エラーレスポンス**:
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "エラーメッセージ"
    }
  }
  ```

---

## 品質判定

### ✅ 高品質

- **要件の曖昧さ**: なし（すべて既存実装と設計文書から確認済み）
- **入出力定義**: 完全（TypeScript型定義とOpenAPIスキーマが存在）
- **制約条件**: 明確（アーキテクチャ制約、パフォーマンス要件、セキュリティ要件すべて明記）
- **実装可能性**: 確実（すべての依存コンポーネントが実装済み）

### 次のステップ

次のお勧めステップ: `/tsumiki:tdd-testcases` でテストケースの洗い出しを行います。

---

## 参考資料

### 既存ファイル

- `app/server/src/presentation/http/controllers/TaskController.ts`: 実装済みコントローラ
- `app/server/src/presentation/http/routes/taskRoutes.schema.ts`: OpenAPI定義
- `app/server/src/presentation/http/middleware/auth/AuthMiddleware.ts`: JWT認証ミドルウェア
- `app/server/src/presentation/http/middleware/errorMiddleware.ts`: エラーハンドリングミドルウェア
- `app/server/src/application/usecases/`: 6つのUseCase実装

### 設計文書

- `docs/design/todo-app/architecture.md`: DDD + クリーンアーキテクチャ
- `docs/design/todo-app/api-endpoints.md`: APIエンドポイント仕様
- `docs/design/todo-app/dataflow.md`: データフロー図
- `docs/tech-stack.md`: 技術スタック定義

### タスクファイル

- `docs/tasks/todo-app-phase5.md`: TASK-1326タスク定義
