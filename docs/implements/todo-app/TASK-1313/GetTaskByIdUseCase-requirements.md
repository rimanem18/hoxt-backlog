# GetTaskByIdUseCase TDD要件定義書

## 📄 ドキュメント情報

- **作成日**: 2025-11-23
- **要件名**: todo-app
- **タスクID**: TASK-1313
- **機能名**: GetTaskByIdUseCase（タスク詳細取得）

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 🔵 何をする機能か

ユーザーが指定したタスクIDに基づいて、単一のタスク詳細情報を取得するユースケース。

- **参照したEARS要件**: EDGE-003（存在しないタスクを更新・削除しようとした場合、システムは404エラーを返す）
- **参照した設計文書**: architecture.md - Application層 GetTaskByIdUseCase

### 🔵 どのような問題を解決するか

- タスク編集画面を開く際に、特定タスクの詳細情報を取得する必要がある
- 単一タスクの取得において、存在しないタスクや他ユーザーのタスクへのアクセスを適切にエラーハンドリングする

### 🔵 想定されるユーザー

- ログイン済みのユーザー（自分のタスクのみアクセス可能）

### 🔵 システム内での位置づけ

```
Presentation層 (TaskController)
    ↓ GET /api/tasks/:id
Application層 (GetTaskByIdUseCase) ← **本機能**
    ↓
Domain層 (ITaskRepository.findById)
    ↓
Infrastructure層 (PostgreSQLTaskRepository)
```

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 🔵 入力パラメータ

| パラメータ名 | 型 | 必須 | 説明 | 制約 |
|-------------|-----|-----|------|------|
| userId | string | ○ | 認証済みユーザーID | UUID形式 |
| taskId | string | ○ | 取得対象タスクID | UUID形式 |

**入力型定義**:
```typescript
interface GetTaskByIdInput {
  userId: string;  // JWT認証から抽出されたuser_id
  taskId: string;  // URLパラメータから取得
}
```

- **参照したEARS要件**: REQ-402（Supabase AuthのJWT認証）
- **参照した設計文書**: ITaskRepository.findById メソッドシグネチャ

### 🔵 出力値

| 状態 | 戻り値 | 説明 |
|------|--------|------|
| 成功 | TaskEntity | 取得されたタスクエンティティ |
| 失敗 | TaskNotFoundError | タスクが見つからない場合 |

**出力型定義**:
```typescript
// 成功時
Promise<TaskEntity>

// エラー時（throw）
TaskNotFoundError  // code: 'TASK_NOT_FOUND'
```

- **参照したEARS要件**: EDGE-003
- **参照した設計文書**: TaskNotFoundError クラス定義

### 🔵 入出力の関係性

1. `userId` + `taskId` でリポジトリに問い合わせ
2. タスクが存在 → TaskEntity を返却
3. タスクが存在しない → TaskNotFoundError をスロー

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 🔵 セキュリティ要件

- ユーザーは自分自身のタスクのみアクセス可能（RLS）
- **参照したEARS要件**: NFR-102, REQ-403

### 🔵 アーキテクチャ制約

- DDD + クリーンアーキテクチャパターンを適用
- 依存性注入パターン（コンストラクタでITaskRepositoryを注入）
- ドメインエラー（TaskNotFoundError）を適切にスロー
- **参照したEARS要件**: REQ-401, REQ-407
- **参照した設計文書**: architecture.md - レイヤ構成

### 🔵 API制約

- APIエンドポイント: `GET /api/tasks/:id`
- HTTPステータス: 成功時 200, タスク不在時 404
- **参照した設計文書**: architecture.md - APIエンドポイント

### 🟡 パフォーマンス要件

- レスポンス時間: 500ms以内（推測）
- **参照したEARS要件**: NFR-001, NFR-002（類推）

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 🔵 基本的な使用パターン

**正常系: タスクが取得される**
```typescript
// Given: 存在するタスクID
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  taskId: '660e8400-e29b-41d4-a716-446655440001',
};

// When: ユースケースを実行
const task = await useCase.execute(input);

// Then: タスクエンティティが返される
expect(task.getId()).toBe('660e8400-e29b-41d4-a716-446655440001');
```

### 🔵 エッジケース: タスクが見つからない

**異常系: 存在しないタスクID**
```typescript
// Given: 存在しないタスクID
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  taskId: 'nonexistent-task-id',
};

// When & Then: TaskNotFoundErrorがスローされる
await expect(useCase.execute(input)).rejects.toThrow(TaskNotFoundError);
```

- **参照したEARS要件**: EDGE-003

### 🟡 エッジケース: 他ユーザーのタスク

**異常系: 他ユーザーのタスクにアクセス**
```typescript
// Given: 他ユーザーのタスクID（RLSにより見つからない扱い）
// リポジトリがnullを返す → TaskNotFoundErrorをスロー
```

- **参照したEARS要件**: EDGE-004（RLSにより403ではなく404として扱う）

### 🔵 リポジトリエラー伝播

**異常系: データベース接続エラー**
```typescript
// Given: リポジトリがエラーをスロー
// When & Then: エラーがそのまま伝播する
```

## 5. EARS要件・設計文書との対応関係

### 参照した機能要件

- REQ-401: DDD + クリーンアーキテクチャパターン適用
- REQ-402: Supabase AuthのJWT認証
- REQ-403: Row-Level Security（RLS）によるユーザー分離
- REQ-407: 層構造（Application層: GetTaskByIdUseCase）

### 参照した非機能要件

- NFR-001: タスク一覧取得APIは1秒以内（類推）
- NFR-002: タスク作成APIは500ms以内（類推）
- NFR-102: ユーザーは自分自身のタスクのみアクセス可能
- NFR-103: タスク操作APIはすべてJWT認証を必須

### 参照したEdgeケース

- EDGE-003: 存在しないタスクを更新・削除しようとした場合、システムは404エラーを返す
- EDGE-004: 他ユーザーのタスクにアクセスしようとした場合（RLSで処理）

### 参照した設計文書

- **アーキテクチャ**: architecture.md - Application層 GetTaskByIdUseCase
- **型定義**: ITaskRepository.findById メソッドシグネチャ
- **エラー**: TaskNotFoundError クラス定義

## 6. 実装仕様

### クラス設計

```typescript
// app/server/src/application/usecases/GetTaskByIdUseCase.ts

export class GetTaskByIdUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスク詳細を取得する
   *
   * @param input - 取得条件（userId, taskId）
   * @returns 取得されたTaskEntity
   * @throws {TaskNotFoundError} タスクが見つからない場合
   */
  async execute(input: GetTaskByIdInput): Promise<TaskEntity> {
    const task = await this.taskRepository.findById(
      input.userId,
      input.taskId
    );

    if (!task) {
      throw new TaskNotFoundError(input.taskId);
    }

    return task;
  }
}
```

### 依存関係

- `ITaskRepository`: Domain層のリポジトリインターフェース
- `TaskEntity`: Domain層のエンティティ
- `TaskNotFoundError`: Domain層のドメインエラー

## 品質判定

```
✅ 高品質:
- 要件の曖昧さ: なし
- 入出力定義: 完全
- 制約条件: 明確
- 実装可能性: 確実
```

**判定理由**:
- EARS要件定義書から EDGE-003 を直接参照
- 既存の ITaskRepository.findById と TaskNotFoundError が定義済み
- 類似実装（GetTasksUseCase）のパターンを踏襲可能

---

次のお勧めステップ: `/tdd-testcases` でテストケースの洗い出しを行います。
