# TASK-1324: TaskController実装（作成・一覧・詳細）- TDD要件定義書

## 📄 ドキュメント情報

- **作成日**: 2025-12-01
- **要件名**: todo-app
- **タスクID**: TASK-1324
- **機能名**: TaskController実装（作成・一覧・詳細）
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1323（errorMiddleware実装完了）

## 1. 機能の概要

### 信頼性レベル

🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない

### 機能の説明

**何をする機能か**:
- タスクの作成（POST /api/tasks）
- タスク一覧の取得（GET /api/tasks）
- タスク詳細の取得（GET /api/tasks/:id）

の3つのHTTPエンドポイントを提供するPresentation層のコントローラ実装。

**どのような問題を解決するか**:
- ログイン済みユーザーが自分のタスクをHTTP API経由で管理できるようにする
- Application層（ユースケース）とHTTP通信層を適切に分離し、REST APIとして公開する
- Zodバリデーションによる入力検証とOpenAPI仕様準拠のエンドポイント提供

**想定されるユーザー**:
- TODOリストアプリを利用するログイン済みユーザー
- フロントエンド（Next.js）からAPIを呼び出すクライアントアプリケーション

**システム内での位置づけ**:
- **Presentation層**（`app/server/src/presentation/http/controllers/TaskController.ts`）
- DDD + クリーンアーキテクチャにおける最外層
- Honoフレームワーク + @hono/zod-openapiを使用
- Application層のユースケース（CreateTaskUseCase, GetTasksUseCase, GetTaskByIdUseCase）を呼び出し
- authMiddleware（JWT認証）とerrorMiddleware（エラーハンドリング）の後段で動作

### 参照した要件・設計文書

**参照したEARS要件**:
- REQ-001（タスク作成）
- REQ-006（タスク一覧取得）

**参照した設計文書**:
- [architecture.md の Presentation層](../../../design/todo-app/architecture.md)
- [api-endpoints.md の エンドポイント1, 2, 3](../../../design/todo-app/api-endpoints.md)
- [dataflow.md の タスク作成フロー、タスク一覧取得フロー](../../../design/todo-app/dataflow.md)

---

## 2. 入力・出力の仕様

### 信頼性レベル

🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない

### 1. POST /api/tasks（タスク作成）

#### 入力パラメータ

**パスパラメータ**: なし

**クエリパラメータ**: なし

**リクエストボディ（JSON）**:
- `title` (string, 必須): タスクタイトル
  - 制約: 1-100文字、空文字不可
  - Zodバリデーション: `z.string().min(1).max(100)`
- `description` (string, オプション): タスク説明（Markdown対応）
  - 制約: 任意
  - Zodバリデーション: `z.string().optional()`
- `priority` (string, オプション): 優先度
  - 制約: `high`, `medium`, `low` のいずれか
  - デフォルト: `medium`
  - Zodバリデーション: `z.enum(['high', 'medium', 'low']).default('medium')`

**コンテキスト情報**:
- `c.get('userId')`: authMiddlewareで設定されたログインユーザーID（UUID）

#### 出力値

**成功時（201 Created）**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "会議資料の作成",
    "description": "## 内容\n- 概要説明",
    "priority": "high",
    "status": "not_started",
    "createdAt": "2025-11-06T11:00:00.000Z",
    "updatedAt": "2025-11-06T11:00:00.000Z"
  }
}
```

**エラー時（400 Bad Request）**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": {
      "title": ["タイトルを入力してください"]
    }
  }
}
```

**エラー時（401 Unauthorized）**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

### 2. GET /api/tasks（タスク一覧取得）

#### 入力パラメータ

**パスパラメータ**: なし

**クエリパラメータ**:
- `priority` (string, オプション): 優先度フィルタ
  - 値: `high`, `medium`, `low`
- `status` (string, オプション): ステータスフィルタ（カンマ区切り）
  - 値: `not_started`, `in_progress`, `in_review`, `completed`
  - 例: `status=not_started,in_progress`
- `sort` (string, オプション): ソート順
  - 値: `created_at_desc`, `created_at_asc`, `priority_desc`
  - デフォルト: `created_at_desc`

**コンテキスト情報**:
- `c.get('userId')`: authMiddlewareで設定されたログインユーザーID（UUID）

#### 出力値

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "title": "重要な会議の資料作成",
      "description": "## チェックリスト\n- [ ] 資料の構成を考える",
      "priority": "high",
      "status": "not_started",
      "createdAt": "2025-11-06T10:00:00.000Z",
      "updatedAt": "2025-11-06T10:00:00.000Z"
    }
  ]
}
```

**エラー時（400 Bad Request）**:
不正なクエリパラメータの場合。

**エラー時（401 Unauthorized）**:
JWT認証失敗の場合。

### 3. GET /api/tasks/:id（タスク詳細取得）

#### 入力パラメータ

**パスパラメータ**:
- `id` (UUID): タスクID

**クエリパラメータ**: なし

**コンテキスト情報**:
- `c.get('userId')`: authMiddlewareで設定されたログインユーザーID（UUID）

#### 出力値

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "重要な会議の資料作成",
    "description": "## チェックリスト\n- [ ] 資料の構成を考える",
    "priority": "high",
    "status": "not_started",
    "createdAt": "2025-11-06T10:00:00.000Z",
    "updatedAt": "2025-11-06T10:00:00.000Z"
  }
}
```

**エラー時（404 Not Found）**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "タスクが見つかりません"
  }
}
```

**エラー時（403 Forbidden）**:
他ユーザーのタスクにアクセスしようとした場合（RLSで自動的にブロック）。

### 入出力の関係性

1. **認証フロー**:
   - クライアント → authMiddleware（JWT検証 → userId抽出 → RLS設定）
   - TaskController → `c.get('userId')` でユーザーIDを取得

2. **バリデーションフロー**:
   - クライアント → Zodスキーマバリデーション（TaskController）
   - バリデーション成功 → ユースケース実行
   - バリデーション失敗 → 400エラーレスポンス

3. **エラーハンドリングフロー**:
   - ユースケース実行時の例外 → errorMiddleware
   - errorMiddleware → 適切なHTTPステータスコード + JSONレスポンス

### データフロー

```mermaid
sequenceDiagram
    participant C as Client
    participant AM as authMiddleware
    participant TC as TaskController
    participant UC as UseCase
    participant EM as errorMiddleware

    C->>AM: POST /api/tasks + JWT
    AM->>AM: JWT検証 + RLS設定
    AM->>TC: userId設定
    TC->>TC: Zodバリデーション
    TC->>UC: execute(input)
    UC-->>TC: TaskEntity
    TC-->>C: 201 Created + TaskDTO
```

### 参照した要件・設計文書

**参照したEARS要件**:
- REQ-001（タスク作成）
- REQ-006（タスク一覧取得）
- REQ-201（優先度フィルタ）
- REQ-202（ステータスフィルタ）
- REQ-203（ソート機能）

**参照した設計文書**:
- [api-endpoints.md の 共通仕様、エンドポイント1, 2, 3](../../../design/todo-app/api-endpoints.md)
- [dataflow.md の タスク作成フロー](../../../design/todo-app/dataflow.md)

---

## 3. 制約条件

### 信頼性レベル

🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない

### パフォーマンス要件

🔵 *要件定義書 NFR-001, NFR-002 より*

- **レスポンス時間**:
  - `POST /api/tasks`: 500ms以内
  - `GET /api/tasks`: 1秒以内
  - `GET /api/tasks/:id`: 500ms以内

- **同時接続数**: 10ユーザー以下（軽負荷想定）

### セキュリティ要件

🔵 *要件定義書 REQ-402, REQ-403, NFR-102, NFR-103 より*

1. **JWT認証必須**:
   - すべてのエンドポイントで`Authorization: Bearer {token}`ヘッダー必須
   - JWKS認証（Supabase JWT Secret認証は非推奨）
   - JWT検証失敗 → 401 Unauthorized

2. **Row-Level Security（RLS）**:
   - authMiddlewareで`SET LOCAL app.current_user_id = '{userId}'`を設定
   - データベースレベルで自動的に`user_id`フィルタが適用
   - 他ユーザーのタスクへのアクセスを完全にブロック

3. **入力バリデーション**:
   - Zodスキーマによるサーバーサイドバリデーション（必須）
   - クライアントサイドバリデーションは補助的
   - バリデーションエラー → 400 Bad Request

### 互換性要件

🔵 *技術スタック、CLAUDE.md より*

- **Honoフレームワーク**: 4.9.0
- **Zodバリデーション**: 4.1.12
- **@hono/zod-openapi**: 1.1.3
- **TypeScript**: 5.9.2
- **Node.js本番環境**: 22.x（AWS Lambda）

### アーキテクチャ制約

🔵 *architecture.md、CLAUDE.md より*

1. **DDD + クリーンアーキテクチャ**:
   - Presentation層はApplication層のユースケースのみに依存
   - Domain層に直接依存しない
   - Infrastructure層に直接依存しない

2. **依存性注入**:
   - コンストラクタでユースケースを注入
   - テスト時のモック化を容易にする

3. **ディレクトリ構造**:
   - `app/server/src/presentation/http/controllers/TaskController.ts`
   - `app/server/src/presentation/http/controllers/__tests__/TaskController.test.ts`

### データベース制約

🔵 *database-schema.sql より*

- **user_id制約**: NOT NULL, UUIDフォーマット
- **RLS Policy**: `user_id = current_setting('app.current_user_id')::uuid`
- **CHECK制約**:
  - `priority IN ('high', 'medium', 'low')`
  - `status IN ('not_started', 'in_progress', 'in_review', 'completed')`

### API制約

🔵 *api-endpoints.md より*

- **HTTPメソッド**:
  - POST: タスク作成
  - GET: タスク一覧取得、タスク詳細取得
- **Content-Type**: `application/json`
- **エラーレスポンス形式**: 統一された`success: false, error: {code, message}`形式

### 参照した要件・設計文書

**参照したEARS要件**:
- REQ-402（JWT認証）
- REQ-403（RLS）
- NFR-001（レスポンス時間）
- NFR-002（同時接続数）
- NFR-102（セキュリティ）
- NFR-103（認証）

**参照した設計文書**:
- [architecture.md の レイヤ構成](../../../design/todo-app/architecture.md)
- [api-endpoints.md の 共通仕様、セキュリティ](../../../design/todo-app/api-endpoints.md)

---

## 4. 想定される使用例

### 信頼性レベル

🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない

### 基本的な使用パターン

#### パターン1: タスク作成（POST /api/tasks）

```http
POST /api/tasks HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "会議資料の作成",
  "description": "## 内容\n- 概要説明",
  "priority": "high"
}
```

**期待される動作**:
1. authMiddlewareでJWT検証 → user_id抽出
2. Zodバリデーション → 成功
3. CreateTaskUseCase.execute() → TaskEntity生成 → DB保存
4. 201 Created + TaskDTOレスポンス

#### パターン2: タスク一覧取得（フィルタ・ソート）

```http
GET /api/tasks?status=not_started,in_progress&sort=created_at_desc HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**期待される動作**:
1. authMiddlewareでJWT検証 → user_id抽出
2. クエリパラメータ解析（status, sort）
3. GetTasksUseCase.execute() → フィルタ・ソート適用
4. 200 OK + TaskDTO[]レスポンス

#### パターン3: タスク詳細取得

```http
GET /api/tasks/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**期待される動作**:
1. authMiddlewareでJWT検証 → user_id抽出
2. GetTaskByIdUseCase.execute() → タスク取得
3. 200 OK + TaskDTOレスポンス

### エッジケース

🔵 *api-endpoints.md、dataflow.md より*

#### エッジケース1: バリデーションエラー（タイトル空文字）

```json
{
  "title": "",
  "priority": "high"
}
```

**期待される動作**:
- 400 Bad Request
- エラーメッセージ: `{"title": ["タイトルを入力してください"]}`

#### エッジケース2: バリデーションエラー（不正な優先度）

```json
{
  "title": "タスク",
  "priority": "invalid"
}
```

**期待される動作**:
- 400 Bad Request
- エラーメッセージ: `{"priority": ["優先度は high, medium, low のいずれかを選択してください"]}`

#### エッジケース3: タスクが見つからない

```http
GET /api/tasks/00000000-0000-0000-0000-000000000000 HTTP/1.1
```

**期待される動作**:
- 404 Not Found
- エラーメッセージ: `{"code": "NOT_FOUND", "message": "タスクが見つかりません"}`

### エラーケース

#### エラーケース1: JWT認証失敗

```http
POST /api/tasks HTTP/1.1
Authorization: Bearer invalid_token
```

**期待される動作**:
- 401 Unauthorized
- エラーメッセージ: `{"code": "UNAUTHORIZED", "message": "JWT検証に失敗しました"}`

#### エラーケース2: Authorizationヘッダーなし

```http
POST /api/tasks HTTP/1.1
Content-Type: application/json

{"title": "タスク"}
```

**期待される動作**:
- 401 Unauthorized
- エラーメッセージ: `{"code": "UNAUTHORIZED", "message": "認証が必要です"}`

#### エラーケース3: 他ユーザーのタスクにアクセス

```http
GET /api/tasks/{other_user_task_id} HTTP/1.1
Authorization: Bearer {user_a_token}
```

**期待される動作**:
- 404 Not Found（RLSで自動的にブロック）
- エラーメッセージ: `{"code": "NOT_FOUND", "message": "タスクが見つかりません"}`

### データフロー

🔵 *dataflow.md の タスク作成フロー、タスク一覧取得フロー より*

**タスク作成フロー**:
1. クライアント → POST /api/tasks + JWT
2. authMiddleware → JWT検証 + RLS設定
3. TaskController → Zodバリデーション
4. CreateTaskUseCase → TaskEntity生成
5. PostgreSQLTaskRepository → DB保存
6. TaskController → 201 Created + TaskDTO

**タスク一覧取得フロー（フィルタ・ソート）**:
1. クライアント → GET /api/tasks?status=... + JWT
2. authMiddleware → JWT検証 + RLS設定
3. TaskController → クエリパラメータ解析
4. GetTasksUseCase → フィルタ・ソート適用
5. PostgreSQLTaskRepository → SQL実行（WHERE + ORDER BY）
6. TaskController → 200 OK + TaskDTO[]

### 参照した要件・設計文書

**参照したEARS要件**:
- REQ-001（タスク作成）
- REQ-006（タスク一覧取得）
- REQ-201（優先度フィルタ）
- REQ-202（ステータスフィルタ）
- REQ-203（ソート機能）

**参照した設計文書**:
- [api-endpoints.md の エンドポイント1, 2, 3](../../../design/todo-app/api-endpoints.md)
- [dataflow.md の タスク作成フロー、タスク一覧取得フロー](../../../design/todo-app/dataflow.md)

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- **US-001**: ログイン済みユーザーがタスクを作成できる
- **US-002**: ログイン済みユーザーがタスク一覧を確認できる
- **US-003**: ログイン済みユーザーがタスク詳細を確認できる

### 参照した機能要件

- **REQ-001**: タスク作成機能
- **REQ-006**: タスク一覧取得機能
- **REQ-201**: 優先度フィルタ機能
- **REQ-202**: ステータスフィルタ機能
- **REQ-203**: ソート機能

### 参照した非機能要件

- **NFR-001**: レスポンス時間（POST: 500ms以内、GET: 1秒以内）
- **NFR-002**: 同時接続数（10ユーザー以下）
- **NFR-102**: セキュリティ（RLS）
- **NFR-103**: 認証（JWT）

### 参照したEdgeケース

- **EDGE-001**: 空文字列タイトル → 400エラー
- **EDGE-002**: 不正な優先度 → 400エラー
- **EDGE-003**: 存在しないタスクID → 404エラー

### 参照した受け入れ基準

- タスク作成後、201 Createdレスポンスが返却されること
- タスク一覧取得時、フィルタ・ソートが正しく適用されること
- タスク詳細取得時、指定されたタスクが返却されること
- バリデーションエラー時、400エラーが返却されること
- JWT認証失敗時、401エラーが返却されること
- 存在しないタスク取得時、404エラーが返却されること

### 参照した設計文書

#### アーキテクチャ

- **[architecture.md の Presentation層](../../../design/todo-app/architecture.md)**:
  - TaskControllerの責務
  - 依存性注入パターン
  - レイヤ構成

#### データフロー

- **[dataflow.md の タスク作成フロー](../../../design/todo-app/dataflow.md)**:
  - クライアント → authMiddleware → TaskController → UseCase → Repository
- **[dataflow.md の タスク一覧取得フロー](../../../design/todo-app/dataflow.md)**:
  - フィルタ・ソート適用のフロー

#### 型定義

- **既存のユースケース実装**:
  - `CreateTaskUseCase.ts` の `CreateTaskInput`
  - `GetTasksUseCase.ts` の `GetTasksInput`
  - `GetTaskByIdUseCase.ts` の `GetTaskByIdInput`

#### データベース

- **RLS Policy**:
  - `user_id = current_setting('app.current_user_id')::uuid`

#### API仕様

- **[api-endpoints.md の エンドポイント1, 2, 3](../../../design/todo-app/api-endpoints.md)**:
  - POST /api/tasks
  - GET /api/tasks
  - GET /api/tasks/:id

---

## 6. 実装時の注意事項

### アーキテクチャ

1. **依存性注入**:
   - コンストラクタでユースケースを注入
   - テスト時のモック化を容易にする

2. **レイヤ分離**:
   - Presentation層はApplication層のみに依存
   - Domain層、Infrastructure層に直接依存しない

3. **エラーハンドリング**:
   - ユースケース実行時の例外は`throw`して、errorMiddlewareで統一的に処理
   - TaskNotFoundError → 404
   - InvalidTaskDataError → 400

### セキュリティ

1. **JWT認証**:
   - authMiddlewareで事前に検証済み
   - `c.get('userId')` でユーザーIDを取得

2. **RLS**:
   - authMiddlewareで`SET LOCAL app.current_user_id`設定済み
   - データベースレベルで自動的に`user_id`フィルタが適用

3. **バリデーション**:
   - Zodスキーマによるサーバーサイドバリデーション（必須）
   - バリデーションエラー → 400 Bad Request

### パフォーマンス

1. **レスポンス時間**:
   - POST: 500ms以内
   - GET: 1秒以内

2. **キャッシュ戦略**:
   - バックエンドではキャッシュなし（データベース直接アクセス）
   - フロントエンドでTanStack Query（30秒キャッシュ）

### テスト戦略

1. **ユニットテスト**:
   - Bun標準テスト
   - モックによるユースケースの差し替え
   - テストケース名は日本語

2. **テストカバレッジ**:
   - 100%を目標

3. **テストケース**:
   - 正常系: タスク作成（201）
   - 正常系: タスク一覧取得（200）
   - 正常系: タスク詳細取得（200）
   - 異常系: バリデーションエラー（400）
   - 異常系: タスクが見つからない（404）

---

## 7. 次のステップ

次のお勧めステップ: `/tsumiki:tdd-testcases` でテストケースの洗い出しを行います。
