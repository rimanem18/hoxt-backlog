# TODO リストアプリ - Phase 1: 基盤・インフラ構築

## 📄 フェーズ情報

- **要件名**: todo-app
- **フェーズ**: Phase 1 / 8
- **期間**: 5日間（40時間）
- **担当**: バックエンド
- **目標**: データベーステーブル作成、スキーマ駆動開発の準備、Row-Level Security設定

## 🎯 フェーズ概要

### 目的

TODOリストアプリのデータベース基盤を構築し、スキーマ駆動開発フローを確立する。
Drizzle ORM → Zod → OpenAPI → TypeScript型定義の自動生成パイプラインを整備。

### 成果物

- ✅ tasksテーブル（Drizzle ORMスキーマ定義）
- ✅ Zodスキーマ（shared-schemas/tasks.ts）
- ✅ OpenAPI仕様（docs/api/openapi.yaml）
- ✅ TypeScript型定義（client/src/types/api/generated.ts）
- ✅ Row-Level Security（RLS）ポリシー設定

### 依存関係

- **前提条件**:
  - PostgreSQLデータベースが起動済み
  - usersテーブルが既に存在（Google Auth機能で作成済み）
  - Drizzle ORM、Zodの環境構築済み

- **このフェーズ完了後に開始可能**:
  - Phase 2: バックエンドDomain層実装
  - Phase 6: フロントエンド基盤実装（型定義が必要）

## 📅 週次計画

### Week 1（5日間）

**目標**: データベース基盤とスキーマ駆動開発フロー確立

**Day 1**: TASK-1301 - tasksテーブル作成
**Day 2**: TASK-1302 - Zodスキーマ自動生成設定
**Day 3**: TASK-1303 - OpenAPI仕様自動生成
**Day 4**: TASK-1304 - フロントエンド型定義自動生成
**Day 5**: TASK-1305 - スキーマ駆動開発フロー確認

## 📋 タスク一覧

### TASK-1301: tasksテーブル作成

- [x] **タスク完了**
- **タスクタイプ**: DIRECT
- **推定工数**: 8時間
- **依存タスク**: なし
- **要件名**: todo-app

#### 実装詳細

**1. Drizzle ORMスキーマ定義**

ファイル: `app/server/src/infrastructure/database/schema.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users-schema'; // 既存

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 100 }).notNull(),
    description: text('description'),
    priority: varchar('priority', { length: 10 }).notNull().default('medium'),
    status: varchar('status', { length: 20 }).notNull().default('not_started'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_tasks_user_id').on(table.userId),
    createdAtIdx: index('idx_tasks_created_at').on(table.createdAt),
    priorityIdx: index('idx_tasks_priority').on(table.priority),
    statusIdx: index('idx_tasks_status').on(table.status),
    userCreatedIdx: index('idx_tasks_user_created').on(table.userId, table.createdAt),
    userPriorityIdx: index('idx_tasks_user_priority').on(table.userId, table.priority),
    userStatusIdx: index('idx_tasks_user_status').on(table.userId, table.status),
  })
);
```

**2. CHECK制約追加**

マイグレーションSQL:

```sql
-- 優先度の値制限
ALTER TABLE app_test.tasks
  ADD CONSTRAINT valid_priority
  CHECK (priority IN ('high', 'medium', 'low'));

-- ステータスの値制限
ALTER TABLE app_test.tasks
  ADD CONSTRAINT valid_status
  CHECK (status IN ('not_started', 'in_progress', 'in_review', 'completed'));

-- タイトルの空文字チェック
ALTER TABLE app_test.tasks
  ADD CONSTRAINT non_empty_title
  CHECK (length(trim(title)) > 0);

-- タイトルの文字数制限
ALTER TABLE app_test.tasks
  ADD CONSTRAINT title_length
  CHECK (length(title) <= 100);
```

**3. Row-Level Security (RLS) 設定**

```sql
-- RLS を有効化
ALTER TABLE app_test.tasks ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタスクのみアクセス可能
CREATE POLICY "Users can only access their own tasks"
  ON app_test.tasks
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);
```

**4. updated_at トリガー**

```sql
-- トリガー関数（既存の場合はスキップ）
CREATE OR REPLACE FUNCTION app_test.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON app_test.tasks
  FOR EACH ROW
  EXECUTE FUNCTION app_test.update_updated_at_column();
```

**5. マイグレーション実行**

```bash
docker compose exec server bun run db:push
```

#### 完了条件

- [x] tasksテーブルが作成される
- [x] すべてのインデックスが作成される
- [x] CHECK制約が正常に動作する（不正な値で INSERT エラー）
- [x] RLSポリシーが有効（他ユーザーのタスクにアクセス不可）
- [x] updated_at が自動更新される

#### 参照

- 要件: REQ-001〜REQ-007, REQ-403, NFR-102
- 設計: [database-schema.sql](../design/todo-app/database-schema.sql)
- 技術スタック: PostgreSQL 15, Drizzle ORM 0.44.4

---

### TASK-1302: Zodスキーマ自動生成設定

- [x] **タスク完了** ✅ 完了 (2025-11-15)
- **タスクタイプ**: DIRECT
- **推定工数**: 8時間
- **依存タスク**: TASK-1301
- **要件名**: todo-app

#### 実装詳細

**1. generate-schemas.ts にtasksテーブル設定追加**

ファイル: `app/server/scripts/generate-schemas.ts`

```typescript
import { tasks } from '../src/infrastructure/database/schema';

const tableConfigs: TableConfig[] = [
  // 既存のテーブル設定...
  {
    tableName: 'tasks',
    tableObject: tasks,
    outputFile: 'tasks.ts',
    enums: [
      {
        name: 'TaskPriority',
        values: ['high', 'medium', 'low'] as const,
        description: 'タスクの優先度',
      },
      {
        name: 'TaskStatus',
        values: ['not_started', 'in_progress', 'in_review', 'completed'] as const,
        description: 'タスクのステータス',
      },
    ],
    customValidations: {
      title: {
        min: 1,
        max: 100,
        errorMessages: {
          min: 'タイトルを入力してください',
          max: 'タイトルは100文字以内で入力してください',
        },
      },
      description: {
        optional: true,
      },
      priority: {
        default: 'medium',
      },
      status: {
        default: 'not_started',
      },
    },
  },
];
```

**2. スキーマ生成実行**

```bash
docker compose exec server bun run generate:schemas
```

**3. 生成ファイル確認**

ファイル: `app/packages/shared-schemas/tasks.ts`

期待される内容:
- TaskPriority enum
- TaskStatus enum
- CreateTaskSchema（POST /api/tasks）
- UpdateTaskSchema（PUT /api/tasks/:id）
- ChangeTaskStatusSchema（PATCH /api/tasks/:id/status）
- GetTasksQuerySchema（GET /api/tasks）
- TaskResponseSchema

#### 完了条件

- [x] shared-schemas/tasks.ts が自動生成される
- [x] TaskPriority, TaskStatus enum が定義される
- [x] すべてのバリデーションスキーマが含まれる
- [x] 型チェックが通る（`bun run typecheck`）
- [x] ファイル冒頭に手動編集禁止の警告コメントがある

#### 参照

- 要件: REQ-001〜REQ-007, REQ-405
- 設計: [interfaces.ts](../design/todo-app/interfaces.ts)
- CLAUDE.md: スキーマ駆動開発ガイドライン

---

### TASK-1303: OpenAPI仕様自動生成

- [x] **タスク完了** ✅ 完了 (2025-11-17)
- **タスクタイプ**: DIRECT
- **推定工数**: 8時間
- **依存タスク**: TASK-1302
- **要件名**: todo-app

#### 実装詳細

**1. generate-openapi.ts にタスクエンドポイント定義追加**

ファイル: `app/server/scripts/generate-openapi.ts`

```typescript
import { createRoute } from '@hono/zod-openapi';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  ChangeTaskStatusSchema,
  GetTasksQuerySchema,
  TaskResponseSchema,
} from '../../packages/shared-schemas/tasks';

// 6つのエンドポイント定義
const taskRoutes = [
  // GET /api/tasks - タスク一覧取得
  createRoute({
    method: 'get',
    path: '/api/tasks',
    request: {
      query: GetTasksQuerySchema,
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: TaskResponseSchema.array(),
          },
        },
        description: 'タスク一覧を取得',
      },
    },
  }),

  // POST /api/tasks - タスク作成
  createRoute({
    method: 'post',
    path: '/api/tasks',
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateTaskSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: TaskResponseSchema,
          },
        },
        description: 'タスクを作成',
      },
    },
  }),

  // GET /api/tasks/:id - タスク詳細取得
  // PUT /api/tasks/:id - タスク更新
  // PATCH /api/tasks/:id/status - タスクステータス変更
  // DELETE /api/tasks/:id - タスク削除
  // ... (同様に定義)
];
```

**2. OpenAPI仕様生成実行**

```bash
docker compose exec server bun run generate:openapi
```

**3. 生成ファイル確認**

ファイル: `docs/api/openapi.yaml`

期待される内容:
- 6つのタスクエンドポイント定義
- リクエスト/レスポンススキーマ
- エラーレスポンス定義
- 認証スキーム（Bearer JWT）

#### 完了条件

- [x] docs/api/openapi.yaml が生成される
- [x] 6つのエンドポイントがすべて定義される
- [x] Swagger UIでAPIドキュメントを確認できる
- [x] スキーマバリデーションが正しく定義される
- [x] ファイル冒頭に手動編集禁止の警告コメントがある

#### 参照

- 要件: REQ-001〜REQ-007, REQ-405
- 設計: [api-endpoints.md](../design/todo-app/api-endpoints.md)
- 技術スタック: @hono/zod-openapi 1.1.3

---

### TASK-1304: フロントエンド型定義自動生成

- [x] **タスク完了** ✅ 完了 (2025-11-19)
- **タスクタイプ**: DIRECT
- **推定工数**: 8時間
- **依存タスク**: TASK-1303
- **要件名**: todo-app

#### 実装詳細

**1. フロントエンド型定義生成実行**

```bash
docker compose exec client bun run generate:types
```

このコマンドは `openapi-typescript` を使用して、
`docs/api/openapi.yaml` から TypeScript型定義を生成します。

**2. 生成ファイル確認**

ファイル: `app/client/src/types/api/generated.ts`

期待される型定義:
```typescript
// 自動生成ファイル - 手動編集禁止
export interface paths {
  '/api/tasks': {
    get: operations['getTasks'];
    post: operations['createTask'];
  };
  '/api/tasks/{id}': {
    get: operations['getTaskById'];
    put: operations['updateTask'];
    delete: operations['deleteTask'];
  };
  '/api/tasks/{id}/status': {
    patch: operations['changeTaskStatus'];
  };
}

export interface components {
  schemas: {
    TaskDTO: {
      id: string;
      userId: string;
      title: string;
      description: string | null;
      priority: 'high' | 'medium' | 'low';
      status: 'not_started' | 'in_progress' | 'in_review' | 'completed';
      createdAt: string;
      updatedAt: string;
    };
    // ... その他のスキーマ
  };
}
```

**3. openapi-fetch の設定**

ファイル: `app/client/src/lib/api.ts`

```typescript
import createClient from 'openapi-fetch';
import type { paths } from '@/types/api/generated';

export const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});
```

#### 完了条件

- [x] types/api/generated.ts が生成される
- [x] TaskDTO型が含まれる
- [x] 6つのエンドポイントの型定義が含まれる
- [x] 型チェックが通る（`bun run typecheck`）
- [x] ファイル冒頭に手動編集禁止の警告コメントがある

#### 参照

- 要件: REQ-405
- 設計: [interfaces.ts](../design/todo-app/interfaces.ts)
- 技術スタック: openapi-typescript 7.10.1

---

### TASK-1305: スキーマ駆動開発フロー確認

- [x] **タスク完了**
- **タスクタイプ**: DIRECT
- **推定工数**: 8時間
- **依存タスク**: TASK-1304
- **要件名**: todo-app

#### 実装詳細

**1. 型チェック実行**

```bash
# サーバー側
docker compose exec server bun run typecheck

# クライアント側
docker compose exec client bun run typecheck
```

期待される結果: エラーなし

**2. ビルド確認**

```bash
# サーバー側
docker compose exec server bun run build

# クライアント側（本番ビルドは後のフェーズで実行）
docker compose exec client bun run build
```

**3. スキーマ変更フローの動作確認**

変更テスト: tasksテーブルに新しいフィールドを追加してみる（テスト後削除）

```bash
# 1. schema.ts を変更（テストフィールド追加）
# 2. スキーマ生成
docker compose exec server bun run generate:schemas
# 3. OpenAPI生成
docker compose exec server bun run generate:openapi
# 4. 型定義生成
docker compose exec client bun run generate:types
# 5. 型チェック
docker compose exec server bun run typecheck
docker compose exec client bun run typecheck
```

**4. ドキュメント更新**

必要に応じて、以下のドキュメントを更新:
- `docs/tech-stack.md`: スキーマ駆動開発フローの更新
- `CLAUDE.md`: 新規テーブル追加手順の更新

#### 完了条件

- [x] サーバー側の型チェックが通る
- [x] クライアント側の型チェックが通る
- [x] ビルドが成功する
- [x] スキーマ変更フローが正常に動作する
- [x] ドキュメントが最新の状態になっている

#### 参照

- CLAUDE.md: スキーマ駆動開発ガイドライン
- 技術スタック: Drizzle, Zod, OpenAPI, TypeScript

---

## 🎉 フェーズ完了チェックリスト

### データベース

- [x] tasksテーブルが作成される
- [x] すべてのインデックスが作成される
- [x] CHECK制約が正常に動作する
- [x] RLSポリシーが有効
- [x] updated_atトリガーが動作する

### スキーマ生成

- [x] Zodスキーマが自動生成される（shared-schemas/tasks.ts）
- [x] OpenAPI仕様が生成される（docs/api/openapi.yaml）
- [x] TypeScript型定義が生成される（types/api/generated.ts）
- [x] すべての生成ファイルに警告コメントがある

### 型チェック・ビルド

- [x] サーバー側の型チェックが通る
- [x] クライアント側の型チェックが通る
- [x] サーバー側のビルドが成功する
- [x] スキーマ変更フローが正常に動作する

### ドキュメント

- [x] tech-stack.mdが更新される（必要に応じて）
- [x] CLAUDE.mdが更新される（必要に応じて）

---

## 📚 参考資料

- [要件定義書](../spec/todo-app-requirements.md)
- [技術設計](../design/todo-app/architecture.md)
- [データベーススキーマ](../design/todo-app/database-schema.sql)
- [技術スタック](../tech-stack.md)
- [CLAUDE.md](../../CLAUDE.md)

---

## 📝 メモ

### 実装時の注意事項

1. **RLS設定**: 必ずJWT認証後に `SET LOCAL app.current_user_id` を実行
2. **インデックス**: 複合インデックスの順序に注意（user_id, created_at の順）
3. **CHECK制約**: エラーメッセージが日本語になるよう設定
4. **自動生成ファイル**: 手動編集禁止の警告コメントを必ず含める

### トラブルシューティング

- **マイグレーションエラー**: `docker compose restart db` で解決することがある
- **型定義生成エラー**: OpenAPI仕様が正しいか確認（Swagger UIで検証）
- **RLS動作確認**: `SELECT current_setting('app.current_user_id')` でユーザーID確認

---

## 📌 タスク実行テンプレート

### DIRECTタスクの実行例（TASK-1301）

**ステップ1**: `/tsumiki:direct-setup`

```bash
# 1. スキーマファイル編集
vim app/server/src/infrastructure/database/schema.ts

# 2. マイグレーション実行
docker compose exec server bun run db:push

# 3. 動作確認
docker compose exec server bun run db:studio
```

**ステップ2**: `/tsumiki:direct-verify`

```bash
# 1. テーブル作成確認
docker compose exec db psql -U postgres -d postgres -c "\dt app_test.*"

# 2. インデックス確認
docker compose exec db psql -U postgres -d postgres -c "\di app_test.*"

# 3. RLS確認
docker compose exec db psql -U postgres -d postgres -c "SELECT * FROM pg_policies WHERE tablename = 'tasks';"
```

### TDDタスクの実行例（Phase 2以降）

**ステップ1**: `/tsumiki:tdd-requirements` - 詳細要件定義
**ステップ2**: `/tsumiki:tdd-testcases` - テストケース作成
**ステップ3**: `/tsumiki:tdd-red` - テスト実装（失敗）
**ステップ4**: `/tsumiki:tdd-green` - 最小実装
**ステップ5**: `/tsumiki:tdd-refactor` - リファクタリング
**ステップ6**: `/tsumiki:tdd-verify-complete` - 品質確認
