# TASK-1325: TaskController実装（更新・削除・ステータス変更）- TDD要件定義書

## 📄 ドキュメント情報

- **作成日**: 2025-12-01
- **要件名**: todo-app
- **タスクID**: TASK-1325
- **機能名**: TaskController実装（更新・削除・ステータス変更）
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1324（TaskController作成・一覧・詳細実装完了）

## 1. 機能の概要

### 信頼性レベル

🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない

### 機能の説明

**何をする機能か**:
- タスクの更新（PUT /api/tasks/:id）
- タスクの削除（DELETE /api/tasks/:id）
- タスクステータスの変更（PATCH /api/tasks/:id/status）

の3つのHTTPエンドポイントを提供するPresentation層のコントローラ実装。

**どのような問題を解決するか**:
- ログイン済みユーザーが自分のタスクをHTTP API経由で編集・削除できるようにする
- タスクステータスの変更を効率的に行う専用エンドポイントを提供
- Application層（ユースケース）とHTTP通信層を適切に分離し、REST APIとして公開する
- Zodバリデーションによる入力検証とOpenAPI仕様準拠のエンドポイント提供

**想定されるユーザー**:
- TODOリストアプリを利用するログイン済みユーザー
- フロントエンド（Next.js）からAPIを呼び出すクライアントアプリケーション

**システム内での位置づけ**:
- **Presentation層**（`app/server/src/presentation/http/controllers/TaskController.ts`）
- DDD + クリーンアーキテクチャにおける最外層
- Honoフレームワーク + @hono/zod-openapiを使用
- Application層のユースケース（UpdateTaskUseCase, DeleteTaskUseCase, ChangeTaskStatusUseCase）を呼び出し
- authMiddleware（JWT認証）とerrorMiddleware（エラーハンドリング）の後段で動作
- TASK-1324で実装済みのTaskControllerクラスに3つのメソッドを追加実装

### 参照した要件・設計文書

**参照したEARS要件**:
- REQ-002（タスク更新）
- REQ-003（タスク削除）
- REQ-004（タスクステータス変更）

**参照した設計文書**:
- [architecture.md の Presentation層](../../../design/todo-app/architecture.md)
- [api-endpoints.md の エンドポイント4, 5, 6](../../../design/todo-app/api-endpoints.md)
- [dataflow.md の タスク更新フロー、タスク削除フロー、ステータス変更フロー](../../../design/todo-app/dataflow.md)

---

## 2. 入力・出力の仕様

### 信頼性レベル

🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない

### 1. PUT /api/tasks/:id（タスク更新）

#### 入力パラメータ

**パスパラメータ**:
- `id` (UUID): タスクID

**クエリパラメータ**: なし

**リクエストボディ（JSON）**:
- `title` (string, オプション): タスクタイトル
  - 制約: 1-100文字、空文字不可
  - Zodバリデーション: `z.string().min(1).max(100).optional()`
- `description` (string | null, オプション): タスク説明（Markdown対応）
  - 制約: 任意、null可能（nullで説明をクリア）
  - Zodバリデーション: `z.string().nullable().optional()`
- `priority` (string, オプション): 優先度
  - 制約: `high`, `medium`, `low` のいずれか
  - Zodバリデーション: `z.enum(['high', 'medium', 'low']).optional()`

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
    "title": "会議資料の作成(完了)",
    "description": "## チェックリスト\n- [x] 資料の構成を考える\n- [x] スライドを作成",
    "priority": "high",
    "status": "not_started",
    "createdAt": "2025-11-06T10:00:00.000Z",
    "updatedAt": "2025-11-06T12:00:00.000Z"
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

**エラー時（401 Unauthorized）**:
JWT認証失敗の場合。

### 2. DELETE /api/tasks/:id（タスク削除）

#### 入力パラメータ

**パスパラメータ**:
- `id` (UUID): タスクID

**クエリパラメータ**: なし

**リクエストボディ**: なし

**コンテキスト情報**:
- `c.get('userId')`: authMiddlewareで設定されたログインユーザーID（UUID）

#### 出力値

**成功時（204 No Content）**:
レスポンスボディなし

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
他ユーザーのタスクを削除しようとした場合（RLSで自動的にブロック）。

**エラー時（401 Unauthorized）**:
JWT認証失敗の場合。

### 3. PATCH /api/tasks/:id/status（タスクステータス変更）

#### 入力パラメータ

**パスパラメータ**:
- `id` (UUID): タスクID

**クエリパラメータ**: なし

**リクエストボディ（JSON）**:
- `status` (string, 必須): ステータス
  - 制約: `not_started`, `in_progress`, `in_review`, `completed` のいずれか
  - Zodバリデーション: `z.enum(['not_started', 'in_progress', 'in_review', 'completed'])`

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
    "status": "in_progress",
    "createdAt": "2025-11-06T10:00:00.000Z",
    "updatedAt": "2025-11-06T12:30:00.000Z"
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
      "status": ["ステータスは not_started, in_progress, in_review, completed のいずれかを選択してください"]
    }
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

**エラー時（401 Unauthorized）**:
JWT認証失敗の場合。

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

    C->>AM: PUT /api/tasks/:id + JWT
    AM->>AM: JWT検証 + RLS設定
    AM->>TC: userId設定
    TC->>TC: Zodバリデーション
    TC->>UC: execute(input)
    UC-->>TC: TaskEntity
    TC-->>C: 200 OK + TaskDTO
```

### 参照した要件・設計文書

**参照したEARS要件**:
- REQ-002（タスク更新）
- REQ-003（タスク削除）
- REQ-004（タスクステータス変更）

**参照した設計文書**:
- [api-endpoints.md の 共通仕様、エンドポイント4, 5, 6](../../../design/todo-app/api-endpoints.md)
- [dataflow.md の タスク更新フロー、タスク削除フロー、ステータス変更フロー](../../../design/todo-app/dataflow.md)

---

## 3. 制約条件

### 信頼性レベル

🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない

### パフォーマンス要件

🔵 *要件定義書 NFR-001, NFR-002 より*

- **レスポンス時間**:
  - `PUT /api/tasks/:id`: 500ms以内
  - `DELETE /api/tasks/:id`: 500ms以内
  - `PATCH /api/tasks/:id/status`: 500ms以内

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
   - コンストラクタでユースケースを注入（TASK-1324で実装済みのTaskControllerクラスを拡張）
   - テスト時のモック化を容易にする

3. **ディレクトリ構造**:
   - `app/server/src/presentation/http/controllers/TaskController.ts`（既存ファイルに追加）
   - `app/server/src/presentation/http/controllers/__tests__/TaskController.test.ts`（既存テストファイルに追加）

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
  - PUT: タスク更新（部分更新）
  - DELETE: タスク削除（物理削除）
  - PATCH: タスクステータス変更
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

#### パターン1: タスク更新（PUT /api/tasks/:id）

```http
PUT /api/tasks/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "会議資料の作成(完了)",
  "description": "## チェックリスト\n- [x] 資料の構成を考える\n- [x] スライドを作成",
  "priority": "high"
}
```

**期待される動作**:
1. authMiddlewareでJWT検証 → user_id抽出
2. Zodバリデーション → 成功
3. UpdateTaskUseCase.execute() → タスク更新 → DB保存
4. 200 OK + TaskDTOレスポンス

#### パターン2: タスク削除（DELETE /api/tasks/:id）

```http
DELETE /api/tasks/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**期待される動作**:
1. authMiddlewareでJWT検証 → user_id抽出
2. DeleteTaskUseCase.execute() → タスク削除
3. 204 No Content

#### パターン3: タスクステータス変更（PATCH /api/tasks/:id/status）

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
1. authMiddlewareでJWT検証 → user_id抽出
2. Zodバリデーション → 成功
3. ChangeTaskStatusUseCase.execute() → ステータス変更 → DB保存
4. 200 OK + TaskDTOレスポンス

### エッジケース

🔵 *api-endpoints.md、dataflow.md より*

#### エッジケース1: バリデーションエラー（タイトル空文字）

```json
{
  "title": ""
}
```

**期待される動作**:
- 400 Bad Request
- エラーメッセージ: `{"title": ["タイトルを入力してください"]}`

#### エッジケース2: バリデーションエラー（不正なステータス）

```json
{
  "status": "invalid_status"
}
```

**期待される動作**:
- 400 Bad Request
- エラーメッセージ: `{"status": ["ステータスは not_started, in_progress, in_review, completed のいずれかを選択してください"]}`

#### エッジケース3: タスクが見つからない

```http
PUT /api/tasks/00000000-0000-0000-0000-000000000000 HTTP/1.1
```

**期待される動作**:
- 404 Not Found
- エラーメッセージ: `{"code": "NOT_FOUND", "message": "タスクが見つかりません"}`

#### エッジケース4: 部分更新（一部フィールドのみ更新）

```json
{
  "priority": "low"
}
```

**期待される動作**:
- 200 OK
- 優先度のみ更新され、他のフィールドは変更なし

#### エッジケース5: descriptionをnullでクリア

```json
{
  "description": null
}
```

**期待される動作**:
- 200 OK
- descriptionがnullに更新される

### エラーケース

#### エラーケース1: JWT認証失敗

```http
PUT /api/tasks/:id HTTP/1.1
Authorization: Bearer invalid_token
```

**期待される動作**:
- 401 Unauthorized
- エラーメッセージ: `{"code": "UNAUTHORIZED", "message": "JWT検証に失敗しました"}`

#### エラーケース2: Authorizationヘッダーなし

```http
DELETE /api/tasks/:id HTTP/1.1
```

**期待される動作**:
- 401 Unauthorized
- エラーメッセージ: `{"code": "UNAUTHORIZED", "message": "認証が必要です"}`

#### エラーケース3: 他ユーザーのタスクを更新・削除

```http
PUT /api/tasks/{other_user_task_id} HTTP/1.1
Authorization: Bearer {user_a_token}
```

**期待される動作**:
- 404 Not Found（RLSで自動的にブロック）
- エラーメッセージ: `{"code": "NOT_FOUND", "message": "タスクが見つかりません"}`

### データフロー

🔵 *dataflow.md の タスク更新フロー、タスク削除フロー、ステータス変更フロー より*

**タスク更新フロー**:
1. クライアント → PUT /api/tasks/:id + JWT
2. authMiddleware → JWT検証 + RLS設定
3. TaskController → Zodバリデーション
4. UpdateTaskUseCase → TaskEntity更新
5. PostgreSQLTaskRepository → DB保存
6. TaskController → 200 OK + TaskDTO

**タスク削除フロー**:
1. クライアント → DELETE /api/tasks/:id + JWT
2. authMiddleware → JWT検証 + RLS設定
3. TaskController → パラメータ取得
4. DeleteTaskUseCase → タスク削除
5. PostgreSQLTaskRepository → DB削除
6. TaskController → 204 No Content

**ステータス変更フロー**:
1. クライアント → PATCH /api/tasks/:id/status + JWT
2. authMiddleware → JWT検証 + RLS設定
3. TaskController → Zodバリデーション
4. ChangeTaskStatusUseCase → ステータス変更
5. PostgreSQLTaskRepository → DB保存
6. TaskController → 200 OK + TaskDTO

### 参照した要件・設計文書

**参照したEARS要件**:
- REQ-002（タスク更新）
- REQ-003（タスク削除）
- REQ-004（タスクステータス変更）

**参照した設計文書**:
- [api-endpoints.md の エンドポイント4, 5, 6](../../../design/todo-app/api-endpoints.md)
- [dataflow.md の タスク更新フロー、タスク削除フロー、ステータス変更フロー](../../../design/todo-app/dataflow.md)

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- **US-004**: ログイン済みユーザーがタスクを更新できる
- **US-005**: ログイン済みユーザーがタスクを削除できる
- **US-006**: ログイン済みユーザーがタスクステータスを変更できる

### 参照した機能要件

- **REQ-002**: タスク更新機能
- **REQ-003**: タスク削除機能
- **REQ-004**: タスクステータス変更機能

### 参照した非機能要件

- **NFR-001**: レスポンス時間（PUT, DELETE, PATCH: 500ms以内）
- **NFR-002**: 同時接続数（10ユーザー以下）
- **NFR-102**: セキュリティ（RLS）
- **NFR-103**: 認証（JWT）

### 参照したEdgeケース

- **EDGE-001**: 空文字列タイトル → 400エラー
- **EDGE-002**: 不正なステータス → 400エラー
- **EDGE-003**: 存在しないタスクID → 404エラー
- **EDGE-004**: 部分更新（一部フィールドのみ更新）
- **EDGE-005**: descriptionをnullでクリア

### 参照した受け入れ基準

- タスク更新後、200 OKレスポンスが返却されること
- タスク削除後、204 No Contentレスポンスが返却されること
- タスクステータス変更後、200 OKレスポンスが返却されること
- バリデーションエラー時、400エラーが返却されること
- JWT認証失敗時、401エラーが返却されること
- 存在しないタスク更新・削除時、404エラーが返却されること

### 参照した設計文書

#### アーキテクチャ

- **[architecture.md の Presentation層](../../../design/todo-app/architecture.md)**:
  - TaskControllerの責務
  - 依存性注入パターン
  - レイヤ構成

#### データフロー

- **[dataflow.md の タスク更新フロー](../../../design/todo-app/dataflow.md)**:
  - クライアント → authMiddleware → TaskController → UseCase → Repository
- **[dataflow.md の タスク削除フロー](../../../design/todo-app/dataflow.md)**:
  - 削除フローと確認ダイアログ
- **[dataflow.md の ステータス変更フロー](../../../design/todo-app/dataflow.md)**:
  - ステータス変更の効率的な処理

#### 型定義

- **既存のユースケース実装**:
  - `UpdateTaskUseCase.ts` の `UpdateTaskInput`
  - `DeleteTaskUseCase.ts` の `DeleteTaskInput`
  - `ChangeTaskStatusUseCase.ts` の `ChangeTaskStatusInput`

#### データベース

- **RLS Policy**:
  - `user_id = current_setting('app.current_user_id')::uuid`

#### API仕様

- **[api-endpoints.md の エンドポイント4, 5, 6](../../../design/todo-app/api-endpoints.md)**:
  - PUT /api/tasks/:id
  - DELETE /api/tasks/:id
  - PATCH /api/tasks/:id/status

---

## 6. 実装時の注意事項

### アーキテクチャ

1. **依存性注入**:
   - TASK-1324で実装済みのTaskControllerクラスのコンストラクタに新しいユースケースを追加注入
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
   - PUT, DELETE, PATCH: 500ms以内

2. **キャッシュ戦略**:
   - バックエンドではキャッシュなし（データベース直接アクセス）
   - フロントエンドでTanStack Query（30秒キャッシュ）

### テスト戦略

1. **ユニットテスト**:
   - Bun標準テスト
   - モックによるユースケースの差し替え
   - テストケース名は日本語
   - TASK-1324の既存テストファイルに追加

2. **テストカバレッジ**:
   - 100%を目標

3. **テストケース**:
   - 正常系: タスク更新（200）
   - 正常系: タスク削除（204）
   - 正常系: ステータス変更（200）
   - 異常系: バリデーションエラー（400）
   - 異常系: タスクが見つからない（404）

### 既存コードとの統合

1. **TaskControllerクラスの拡張**:
   - TASK-1324で実装済みの`TaskController`クラスに3つのメソッドを追加
   - コンストラクタに新しいユースケースを追加
   - 既存の`toDTO()`メソッドを再利用

2. **型定義の再利用**:
   - 既存の`TaskDTO`型を再利用
   - 既存の`SuccessResponseSingle`型を再利用

---

## 7. 次のステップ

次のお勧めステップ: `/tsumiki:tdd-testcases` でテストケースの洗い出しを行います。
