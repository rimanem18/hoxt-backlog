# TODO リストアプリ - Phase 5: バックエンドPresentation層実装

## 📄 フェーズ情報

- **要件名**: todo-app
- **フェーズ**: Phase 5 / 8
- **期間**: 5日間（40時間）
- **担当**: バックエンド
- **目標**: HTTP APIエンドポイント、コントローラ、ミドルウェア実装

## 🎯 フェーズ概要

### 目的

Presentation層にHTTP APIを実装し、Honoフレームワークとzod-openapiを使用してRESTful APIを提供。
JWT認証ミドルウェアとエラーハンドリングを実装。

### 成果物

- ✅ TaskController（6つのエンドポイント）
- ✅ taskRoutes（ルーティング定義 + Zodスキーマ）
- ✅ authMiddleware（JWT認証ミドルウェア）
- ✅ errorMiddleware（エラーハンドリングミドルウェア）
- ✅ 統合テスト（実際のHTTPリクエスト）

### 依存関係

- **前提条件**: Phase 3, 4完了（UseCases, Repository）
- **このフェーズ完了後に開始可能**: Phase 7（フロントエンドUI）

## 📅 週次計画

### Week 1（5日間）

**Day 1**: TASK-1322 - authMiddleware実装
**Day 2**: TASK-1323 - errorMiddleware実装
**Day 3**: TASK-1324 - TaskController実装（作成・一覧・詳細）
**Day 4**: TASK-1325 - TaskController実装（更新・削除・ステータス変更）
**Day 5**: TASK-1326 - taskRoutes統合・テスト

## 📋 タスク一覧

### TASK-1322: authMiddleware実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1321
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/presentation/http/middleware/authMiddleware.ts`

```typescript
import type { Context, Next } from 'hono';
import { SupabaseJwtVerifier } from '@/infrastructure/auth/SupabaseJwtVerifier';
import { RlsHelper } from '@/infrastructure/database/RlsHelper';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const verifier = new SupabaseJwtVerifier();
    const { userId } = await verifier.verify(token);

    // RLS設定
    await RlsHelper.setCurrentUser(c.get('db'), userId);

    // コンテキストに userId を設定
    c.set('userId', userId);

    await next();
  } catch (error) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'JWT検証に失敗しました' } }, 401);
  }
};
```

テストケース:
- 正常系: 有効なJWTで認証成功
- 異常系: Authorizationヘッダーなし
- 異常系: Bearer以外のスキーム
- 異常系: 無効なJWT

#### 完了条件

- [x] authMiddlewareが実装される
- [x] テストカバレッジ100%

#### 参照

- 要件: REQ-402, NFR-103

---

### TASK-1323: errorMiddleware実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1322
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/presentation/http/middleware/errorMiddleware.ts`

```typescript
import type { Context, Next } from 'hono';
import { TaskNotFoundError, InvalidTaskDataError } from '@/domain/task/errors';

export const errorMiddleware = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof TaskNotFoundError) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message },
      }, 404);
    }

    if (error instanceof InvalidTaskDataError) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      }, 400);
    }

    // その他のエラー
    console.error('Unexpected error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' },
    }, 500);
  }
};
```

テストケース:
- 正常系: エラーなし
- 異常系: TaskNotFoundError（404）
- 異常系: InvalidTaskDataError（400）
- 異常系: その他のエラー（500）

#### 完了条件

- [x] errorMiddlewareが実装される
- [x] テストカバレッジ100%

---

### TASK-1324: TaskController実装（作成・一覧・詳細）

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1323
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/presentation/http/controllers/TaskController.ts`

```typescript
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { CreateTaskSchema, TaskResponseSchema } from '@shared/schemas/tasks';

export class TaskController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly getTasksUseCase: GetTasksUseCase,
    private readonly getTaskByIdUseCase: GetTaskByIdUseCase,
  ) {}

  // POST /api/tasks
  async create(c: Context) {
    const userId = c.get('userId');
    const input = await c.req.json();

    const task = await this.createTaskUseCase.execute({ userId, ...input });

    return c.json({ success: true, data: toDTO(task) }, 201);
  }

  // GET /api/tasks
  async getAll(c: Context) {
    const userId = c.get('userId');
    const query = c.req.query();

    const tasks = await this.getTasksUseCase.execute({
      userId,
      filters: {
        priority: query.priority,
        status: query.status?.split(','),
      },
      sort: query.sort || 'created_at_desc',
    });

    return c.json({ success: true, data: tasks.map(toDTO) }, 200);
  }

  // GET /api/tasks/:id
  async getById(c: Context) {
    const userId = c.get('userId');
    const taskId = c.req.param('id');

    const task = await this.getTaskByIdUseCase.execute({ userId, taskId });

    return c.json({ success: true, data: toDTO(task) }, 200);
  }
}
```

テストケース:
- 正常系: タスク作成（201）
- 正常系: タスク一覧取得（200）
- 正常系: タスク詳細取得（200）
- 異常系: バリデーションエラー（400）
- 異常系: タスクが見つからない（404）

#### 完了条件

- [ ] TaskController（作成・一覧・詳細）が実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-001, REQ-006

---

### TASK-1325: TaskController実装（更新・削除・ステータス変更）

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1324
- **要件名**: todo-app

#### 実装詳細

```typescript
// PUT /api/tasks/:id
async update(c: Context) {
  const userId = c.get('userId');
  const taskId = c.req.param('id');
  const input = await c.req.json();

  const task = await this.updateTaskUseCase.execute({ userId, taskId, data: input });

  return c.json({ success: true, data: toDTO(task) }, 200);
}

// DELETE /api/tasks/:id
async delete(c: Context) {
  const userId = c.get('userId');
  const taskId = c.req.param('id');

  await this.deleteTaskUseCase.execute({ userId, taskId });

  return c.body(null, 204);
}

// PATCH /api/tasks/:id/status
async changeStatus(c: Context) {
  const userId = c.get('userId');
  const taskId = c.req.param('id');
  const { status } = await c.req.json();

  const task = await this.changeTaskStatusUseCase.execute({ userId, taskId, status });

  return c.json({ success: true, data: toDTO(task) }, 200);
}
```

テストケース:
- 正常系: タスク更新（200）
- 正常系: タスク削除（204）
- 正常系: ステータス変更（200）
- 異常系: タスクが見つからない（404）

#### 完了条件

- [ ] TaskController（更新・削除・ステータス変更）が実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-002, REQ-003, REQ-004

---

### TASK-1326: taskRoutes統合・テスト

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1325
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/presentation/http/routes/taskRoutes.ts`

```typescript
import { OpenAPIHono } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/authMiddleware';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { TaskController } from '../controllers/TaskController';

export const taskRoutes = new OpenAPIHono();

// ミドルウェア適用
taskRoutes.use('*', errorMiddleware);
taskRoutes.use('*', authMiddleware);

// 依存性注入（DIコンテナで実装）
const controller = new TaskController(
  createTaskUseCase,
  getTasksUseCase,
  getTaskByIdUseCase,
  updateTaskUseCase,
  deleteTaskUseCase,
  changeTaskStatusUseCase,
);

// ルーティング定義
taskRoutes.post('/tasks', (c) => controller.create(c));
taskRoutes.get('/tasks', (c) => controller.getAll(c));
taskRoutes.get('/tasks/:id', (c) => controller.getById(c));
taskRoutes.put('/tasks/:id', (c) => controller.update(c));
taskRoutes.delete('/tasks/:id', (c) => controller.delete(c));
taskRoutes.patch('/tasks/:id/status', (c) => controller.changeStatus(c));
```

統合テスト:
- 正常系: 全エンドポイント動作確認
- 正常系: 認証フロー確認
- 正常系: RLS動作確認
- 異常系: 他ユーザーのタスクにアクセス不可

#### 完了条件

- [ ] taskRoutesが実装される
- [ ] 統合テストが通る
- [ ] Swagger UIでAPIドキュメント確認
- [ ] すべてのエンドポイントが動作する

#### 参照

- 要件: REQ-001〜REQ-007
- 設計: [api-endpoints.md](../design/todo-app/api-endpoints.md)

---

## 🎉 フェーズ完了チェックリスト

### ミドルウェア

- [ ] authMiddleware実装完了
- [ ] errorMiddleware実装完了
- [ ] JWT認証が動作する
- [ ] エラーハンドリングが動作する

### コントローラ

- [ ] TaskController実装完了
- [ ] 6つのエンドポイントが実装される
- [ ] すべてのエンドポイントが動作する

### ルーティング

- [ ] taskRoutes統合完了
- [ ] Swagger UIでドキュメント確認
- [ ] 統合テストが通る

### テスト

- [ ] すべてのユニットテストが通る
- [ ] すべての統合テストが通る
- [ ] テストカバレッジ80%以上
- [ ] Biomeチェック合格
- [ ] 型チェック合格

---

## 📚 参考資料

- [Hono公式ドキュメント](https://hono.dev/)
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- [API設計](../design/todo-app/api-endpoints.md)

---

## 📝 メモ

### 実装時の注意事項

1. **依存性注入**: コンストラクタでユースケースを注入
2. **エラーハンドリング**: ドメインエラーを適切なHTTPステータスコードに変換
3. **認証**: すべてのエンドポイントでJWT認証必須
4. **RLS**: authMiddlewareでapp.current_user_id設定
