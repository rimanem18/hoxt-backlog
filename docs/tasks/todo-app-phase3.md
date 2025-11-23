# TODO リストアプリ - Phase 3: バックエンドApplication層実装

## 📄 フェーズ情報

- **要件名**: todo-app
- **フェーズ**: Phase 3 / 8
- **期間**: 6日間（48時間）
- **担当**: バックエンド
- **目標**: ユースケース実装（タスクCRUD操作のビジネスロジック）

## 🎯 フェーズ概要

### 目的

Application層にユースケースを実装し、Domain層のエンティティとInfrastructure層のリポジトリを調整する。
各ユースケースはビジネストランザクションの単位となる。

### 成果物

- ✅ CreateTaskUseCase（タスク作成）
- ✅ GetTasksUseCase（タスク一覧取得）
- ✅ GetTaskByIdUseCase（タスク詳細取得）
- ✅ UpdateTaskUseCase（タスク更新）
- ✅ ChangeTaskStatusUseCase（ステータス変更）
- ✅ DeleteTaskUseCase（タスク削除）
- ✅ ユニットテスト（カバレッジ80%以上）

### 依存関係

- **前提条件**: Phase 2完了（TaskEntity, ITaskRepository）
- **このフェーズ完了後に開始可能**: Phase 5（Presentation層）

## 📅 週次計画

### Week 1（6日間）

**Day 1**: TASK-1311 - CreateTaskUseCase
**Day 2**: TASK-1312 - GetTasksUseCase
**Day 3**: TASK-1313 - GetTaskByIdUseCase
**Day 4**: TASK-1314 - UpdateTaskUseCase
**Day 5**: TASK-1315 - ChangeTaskStatusUseCase
**Day 6**: TASK-1316 - DeleteTaskUseCase

## 📋 タスク一覧

### TASK-1311: CreateTaskUseCase

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1310
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/application/usecases/CreateTaskUseCase.ts`

```typescript
export class CreateTaskUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: CreateTaskInput): Promise<TaskEntity> {
    const task = TaskEntity.create({
      userId: input.userId,
      title: input.title,
      description: input.description,
      priority: input.priority,
    });

    return await this.taskRepository.save(task);
  }
}
```

テストケース:
- 正常系: タスクが作成される
- 異常系: タイトル不正でエラー
- モック: ITaskRepository

#### 完了条件

- [x] CreateTaskUseCaseが実装される
- [x] テストカバレッジ100%

#### 参照

- 要件: REQ-001

---

### TASK-1312: GetTasksUseCase

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1311
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/application/usecases/GetTasksUseCase.ts`

```typescript
export class GetTasksUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: GetTasksInput): Promise<TaskEntity[]> {
    return await this.taskRepository.findByUserId(
      input.userId,
      input.filters,
      input.sort,
    );
  }
}
```

テストケース:
- 正常系: フィルタ・ソート適用
- 正常系: フィルタなし
- モック: ITaskRepository

#### 完了条件

- [ ] GetTasksUseCaseが実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-006, REQ-201, REQ-202, REQ-203

---

### TASK-1313: GetTaskByIdUseCase

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1312
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/application/usecases/GetTaskByIdUseCase.ts`

```typescript
export class GetTaskByIdUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: GetTaskByIdInput): Promise<TaskEntity> {
    const task = await this.taskRepository.findById(input.userId, input.taskId);

    if (!task) {
      throw new TaskNotFoundError(input.taskId);
    }

    return task;
  }
}
```

テストケース:
- 正常系: タスクが取得される
- 異常系: タスクが見つからない（TaskNotFoundError）

#### 完了条件

- [ ] GetTaskByIdUseCaseが実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: EDGE-003

---

### TASK-1314: UpdateTaskUseCase

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1313
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/application/usecases/UpdateTaskUseCase.ts`

```typescript
export class UpdateTaskUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: UpdateTaskInput): Promise<TaskEntity> {
    const task = await this.taskRepository.update(
      input.userId,
      input.taskId,
      input.data,
    );

    if (!task) {
      throw new TaskNotFoundError(input.taskId);
    }

    return task;
  }
}
```

テストケース:
- 正常系: タスクが更新される
- 異常系: タスクが見つからない

#### 完了条件

- [ ] UpdateTaskUseCaseが実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-002

---

### TASK-1315: ChangeTaskStatusUseCase

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1314
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/application/usecases/ChangeTaskStatusUseCase.ts`

```typescript
export class ChangeTaskStatusUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: ChangeTaskStatusInput): Promise<TaskEntity> {
    const task = await this.taskRepository.updateStatus(
      input.userId,
      input.taskId,
      input.status,
    );

    if (!task) {
      throw new TaskNotFoundError(input.taskId);
    }

    return task;
  }
}
```

テストケース:
- 正常系: ステータスが変更される
- 異常系: タスクが見つからない
- 異常系: 不正なステータス値

#### 完了条件

- [ ] ChangeTaskStatusUseCaseが実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-004

---

### TASK-1316: DeleteTaskUseCase

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1315
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/application/usecases/DeleteTaskUseCase.ts`

```typescript
export class DeleteTaskUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: DeleteTaskInput): Promise<void> {
    const deleted = await this.taskRepository.delete(input.userId, input.taskId);

    if (!deleted) {
      throw new TaskNotFoundError(input.taskId);
    }
  }
}
```

テストケース:
- 正常系: タスクが削除される
- 異常系: タスクが見つからない

#### 完了条件

- [ ] DeleteTaskUseCaseが実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-003

---

## 🎉 フェーズ完了チェックリスト

### ユースケース実装

- [x] CreateTaskUseCase実装完了
- [ ] GetTasksUseCase実装完了
- [ ] GetTaskByIdUseCase実装完了
- [ ] UpdateTaskUseCase実装完了
- [ ] ChangeTaskStatusUseCase実装完了
- [ ] DeleteTaskUseCase実装完了

### テスト

- [ ] すべてのユニットテストが通る
- [ ] テストカバレッジ80%以上
- [ ] Biomeチェック合格
- [ ] 型チェック合格

---

## 📚 参考資料

- [要件定義書](../spec/todo-app-requirements.md)
- [技術設計](../design/todo-app/architecture.md)
- [クリーンアーキテクチャ](https://www.amazon.co.jp/dp/4048930656)

---

## 📝 メモ

### 実装時の注意事項

1. **依存性注入**: コンストラクタでITaskRepositoryを注入
2. **エラーハンドリング**: ドメインエラーを適切にスロー
3. **テスト**: モックリポジトリで依存を切る
