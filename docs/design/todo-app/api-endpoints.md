# TODOリストアプリ APIエンドポイント仕様

## 📄 ドキュメント情報

- **作成日**: 2025-11-06
- **要件名**: todo-app
- **バージョン**: 1.0.0
- **関連文書**:
  - [アーキテクチャ設計](./architecture.md)
  - [TypeScript型定義](./interfaces.ts)
  - [要件定義書](../../spec/todo-app-requirements.md)

## 概要

🔵 *要件定義書、技術スタック より*

このドキュメントはTODOリストアプリのREST API仕様を定義します。

**技術構成**:
- **フレームワーク**: Hono 4.9.0
- **バリデーション**: Zod 4.1.12
- **OpenAPI**: @hono/zod-openapi 1.1.3
- **認証**: Supabase Auth (JWT + JWKS)

**重要**:
- 実際の実装では、スキーマ駆動開発フローに従い自動生成される OpenAPI仕様を使用
- この文書は設計段階の仕様定義

## 共通仕様

### ベースURL

🔵 *技術スタック より*

- **開発環境**: `http://localhost:8000`
- **本番環境**: `https://api.example.com` (AWS Lambda + API Gateway)

### 認証

🔵 *要件定義書 REQ-402、NFR-103 より*

すべてのエンドポイントはJWT認証が必須。

**リクエストヘッダー**:
```http
Authorization: Bearer {jwt_token}
```

**JWT取得方法**:
1. Supabase Authでログイン
2. `session.access_token` を取得
3. Authorization ヘッダーに設定

### エラーレスポンス

🔵 *既存エラーハンドリング方針 より*

すべてのエラーは以下の形式で返却:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ(日本語)",
    "details": {
      "field_name": ["エラー詳細1", "エラー詳細2"]
    }
  }
}
```

**共通エラーコード**:
- `UNAUTHORIZED`: 401 - 認証が必要です
- `FORBIDDEN`: 403 - アクセス権限がありません
- `NOT_FOUND`: 404 - リソースが見つかりません
- `VALIDATION_ERROR`: 400 - バリデーションエラー
- `INTERNAL_ERROR`: 500 - サーバーエラー

## エンドポイント一覧

🔵 *要件定義書 より*

| メソッド | エンドポイント | 説明 | 要件 |
|---------|---------------|------|------|
| GET | `/api/tasks` | タスク一覧取得(フィルタ・ソート対応) | REQ-006, REQ-201, REQ-202, REQ-203 |
| POST | `/api/tasks` | タスク作成 | REQ-001 |
| GET | `/api/tasks/:id` | タスク詳細取得 | - |
| PUT | `/api/tasks/:id` | タスク更新 | REQ-002 |
| PATCH | `/api/tasks/:id/status` | タスクステータス変更 | REQ-004 |
| DELETE | `/api/tasks/:id` | タスク削除 | REQ-003 |

---

## 1. タスク一覧取得

### `GET /api/tasks`

🔵 *要件定義書 REQ-006, REQ-201, REQ-202, REQ-203 より*

ログインユーザーのタスク一覧を取得(フィルタ・ソート対応)。

### リクエスト

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 | 例 |
|-----------|---|------|------|-----|
| `priority` | string | No | 優先度フィルタ | `high` |
| `status` | string | No | ステータスフィルタ(カンマ区切り) | `not_started,in_progress` |
| `sort` | string | No | ソート順 | `created_at_desc` |

**優先度の値**:
- `high`: 高
- `medium`: 中
- `low`: 低

**ステータスの値**(複数選択可能、カンマ区切り):
- `not_started`: 未着手
- `in_progress`: 進行中
- `in_review`: レビュー中
- `completed`: 完了

**ソート順の値**:
- `created_at_desc`: 作成日時(新しい順) - **デフォルト**
- `created_at_asc`: 作成日時(古い順)
- `priority_desc`: 優先度(高→低)

**リクエスト例**:
```http
GET /api/tasks?status=not_started,in_progress&sort=priority_desc HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### レスポンス

**成功 (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "title": "重要な会議の資料作成",
      "description": "## チェックリスト\n- [ ] 資料の構成を考える\n- [ ] スライドを作成",
      "priority": "high",
      "status": "not_started",
      "createdAt": "2025-11-06T10:00:00.000Z",
      "updatedAt": "2025-11-06T10:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "title": "バグ修正: ログイン画面",
      "description": null,
      "priority": "medium",
      "status": "in_progress",
      "createdAt": "2025-11-05T15:30:00.000Z",
      "updatedAt": "2025-11-06T09:00:00.000Z"
    }
  ]
}
```

**エラー (401 Unauthorized)**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

**エラー (400 Bad Request)** - 不正なクエリパラメータ:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "不正なクエリパラメータです",
    "details": {
      "status": ["ステータスは not_started, in_progress, in_review, completed のいずれかを指定してください"]
    }
  }
}
```

---

## 2. タスク作成

### `POST /api/tasks`

🔵 *要件定義書 REQ-001 より*

新しいタスクを作成します。

### リクエスト

**ボディ (JSON)**:

| フィールド | 型 | 必須 | 説明 | 制約 |
|-----------|---|------|------|------|
| `title` | string | Yes | タスクタイトル | 1-100文字、空文字不可 |
| `description` | string | No | タスク説明(Markdown) | 任意 |
| `priority` | string | No | 優先度 | `high`, `medium`, `low` / デフォルト: `medium` |

**リクエスト例**:
```http
POST /api/tasks HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "会議資料の作成",
  "description": "## 内容\n- 概要説明\n- 提案内容",
  "priority": "high"
}
```

### レスポンス

**成功 (201 Created)**:

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "会議資料の作成",
    "description": "## 内容\n- 概要説明\n- 提案内容",
    "priority": "high",
    "status": "not_started",
    "createdAt": "2025-11-06T11:00:00.000Z",
    "updatedAt": "2025-11-06T11:00:00.000Z"
  }
}
```

**エラー (400 Bad Request)** - バリデーションエラー:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": {
      "title": ["タイトルを入力してください"],
      "priority": ["優先度は high, medium, low のいずれかを選択してください"]
    }
  }
}
```

**エラー (400 Bad Request)** - タイトル文字数超過:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": {
      "title": ["タイトルは100文字以内で入力してください"]
    }
  }
}
```

---

## 3. タスク詳細取得

### `GET /api/tasks/:id`

🟡 *REST API慣習から推測*

指定されたIDのタスク詳細を取得します。

### リクエスト

**パスパラメータ**:

| パラメータ | 型 | 説明 |
|-----------|---|------|
| `id` | UUID | タスクID |

**リクエスト例**:
```http
GET /api/tasks/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### レスポンス

**成功 (200 OK)**:

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

**エラー (404 Not Found)**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "タスクが見つかりません"
  }
}
```

**エラー (403 Forbidden)** - 他ユーザーのタスク:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "このタスクにアクセスする権限がありません"
  }
}
```

---

## 4. タスク更新

### `PUT /api/tasks/:id`

🔵 *要件定義書 REQ-002 より*

指定されたIDのタスクを更新します(部分更新)。

### リクエスト

**パスパラメータ**:

| パラメータ | 型 | 説明 |
|-----------|---|------|
| `id` | UUID | タスクID |

**ボディ (JSON)**:

| フィールド | 型 | 必須 | 説明 | 制約 |
|-----------|---|------|------|------|
| `title` | string | No | タスクタイトル | 1-100文字、空文字不可 |
| `description` | string \| null | No | タスク説明(Markdown) | 任意、null可 |
| `priority` | string | No | 優先度 | `high`, `medium`, `low` |

**リクエスト例**:
```http
PUT /api/tasks/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "会議資料の作成(完了)",
  "description": "## チェックリスト\n- [x] 資料の構成を考える\n- [x] スライドを作成",
  "priority": "high"
}
```

### レスポンス

**成功 (200 OK)**:

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

**エラー (404 Not Found)**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "タスクが見つかりません"
  }
}
```

**エラー (400 Bad Request)** - バリデーションエラー:
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

---

## 5. タスクステータス変更

### `PATCH /api/tasks/:id/status`

🔵 *要件定義書 REQ-004 より*

指定されたIDのタスクのステータスを変更します。

### リクエスト

**パスパラメータ**:

| パラメータ | 型 | 説明 |
|-----------|---|------|
| `id` | UUID | タスクID |

**ボディ (JSON)**:

| フィールド | 型 | 必須 | 説明 | 制約 |
|-----------|---|------|------|------|
| `status` | string | Yes | ステータス | `not_started`, `in_progress`, `in_review`, `completed` |

**リクエスト例**:
```http
PATCH /api/tasks/550e8400-e29b-41d4-a716-446655440000/status HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "status": "in_progress"
}
```

### レスポンス

**成功 (200 OK)**:

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

**エラー (400 Bad Request)** - 不正なステータス値:
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

**エラー (404 Not Found)**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "タスクが見つかりません"
  }
}
```

---

## 6. タスク削除

### `DELETE /api/tasks/:id`

🔵 *要件定義書 REQ-003 より*

指定されたIDのタスクを削除します(物理削除)。

### リクエスト

**パスパラメータ**:

| パラメータ | 型 | 説明 |
|-----------|---|------|
| `id` | UUID | タスクID |

**リクエスト例**:
```http
DELETE /api/tasks/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### レスポンス

**成功 (204 No Content)**:

レスポンスボディなし

**エラー (404 Not Found)**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "タスクが見つかりません"
  }
}
```

**エラー (403 Forbidden)** - 他ユーザーのタスク:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "このタスクにアクセスする権限がありません"
  }
}
```

---

## セキュリティ

### JWT認証

🔵 *要件定義書 REQ-402、技術スタック より*

**検証フロー**:
1. `Authorization: Bearer {token}` ヘッダーから JWT トークンを抽出
2. Supabase Auth の JWKS エンドポイントで署名検証
3. トークンから `user_id` (sub クレーム) を抽出
4. `SET LOCAL app.current_user_id = '{user_id}'` で RLS 設定

**重要**:
- Supabase JWT Secret認証は非推奨、JWKS認証を使用
- JWKSエンドポイント: `https://{supabase_url}/auth/v1/jwks`

### Row-Level Security (RLS)

🔵 *要件定義書 REQ-403、NFR-102 より*

すべてのSQL実行前に `SET LOCAL app.current_user_id = '{user_id}'` を実行。
PostgreSQL の RLS ポリシーが自動的に `user_id` フィルタを適用。

**効果**:
- 他ユーザーのタスクへのアクセスを完全にブロック
- アプリケーション層のバグによるデータ漏洩を防止

### バリデーション

🔵 *要件定義書 NFR-104、CLAUDE.md より*

**多層バリデーション**:
1. **クライアント**: Zodバリデーション(早期エラー検出)
2. **サーバー**: Zodバリデーション(必須)
3. **データベース**: CHECK制約(最終防御)

**Zodスキーマ例**:
```typescript
import { z } from 'zod';

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください').max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});
```

---

## パフォーマンス

### レスポンス時間目標

🔵 *要件定義書 NFR-001, NFR-002 より*

| エンドポイント | 目標 |
|--------------|------|
| `GET /api/tasks` | 1秒以内 |
| `POST /api/tasks` | 500ms以内 |
| `PUT /api/tasks/:id` | 500ms以内 |
| `PATCH /api/tasks/:id/status` | 500ms以内 |
| `DELETE /api/tasks/:id` | 500ms以内 |

### キャッシュ戦略

🟡 *一般的なキャッシュ戦略*

- **フロントエンド**: TanStack Query (30秒キャッシュ)
- **バックエンド**: キャッシュなし(データベース直接アクセス)
- **データベース**: PostgreSQL クエリキャッシュ + インデックス最適化

---

## 参考資料

🔵 *既存資料*

- [Hono公式ドキュメント](https://hono.dev/)
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- [OpenAPI Specification 3.0](https://swagger.io/specification/)
- [REST API デザインベストプラクティス](https://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api)
