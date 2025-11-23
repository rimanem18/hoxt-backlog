# todo-app - Phase 2: バックエンドDomain層実装

## 📄 フェーズ情報

- **要件名**: todo-app
- **フェーズ**: Phase 2 / 8
- **期間**: 5日間（40時間）
- **担当**: バックエンド
- **目標**: TaskEntity、値オブジェクト、ドメインエラー、リポジトリインターフェース実装

## 🎯 フェーズ概要

### 目的

DDD（ドメイン駆動設計）の原則に従い、ビジネスロジックの核心をDomain層に実装する。
値オブジェクト、エンティティ、ドメインエラーを通じて、タスク管理のドメインモデルを構築。

### 成果物

- ✅ TaskPriority値オブジェクト（優先度）
- ✅ TaskStatus値オブジェクト（ステータス）
- ✅ TaskTitle値オブジェクト（タイトル）
- ✅ TaskEntity（タスクエンティティ）
- ✅ ドメインエラー（TaskNotFoundError, InvalidTaskDataError, TaskAccessDeniedError）
- ✅ ITaskRepository（リポジトリインターフェース）
- ✅ ユニットテスト（カバレッジ80%以上）

### 依存関係

- **前提条件**:
  - Phase 1完了（tasksテーブル、Zodスキーマ）
  - Drizzle ORMスキーマ定義

- **このフェーズ完了後に開始可能**:
  - Phase 3: バックエンドApplication層実装
  - Phase 4: バックエンドInfrastructure層実装

## 📅 週次計画

### Week 1（5日間）

**目標**: Domain層の完全な実装とテスト

**Day 1**: TASK-1306 - TaskPriority値オブジェクト
**Day 2**: TASK-1307 - TaskStatus値オブジェクト
**Day 3**: TASK-1308 - TaskTitle値オブジェクト
**Day 4**: TASK-1309 - TaskEntity実装
**Day 5**: TASK-1310 - ドメインエラーとリポジトリインターフェース

## 📋 タスク一覧

### TASK-1306: TaskPriority値オブジェクト

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1305
- **要件名**: todo-app

#### TDDプロセス

**1. `/tsumiki:tdd-requirements`** - 詳細要件定義

要件:
- 優先度を表現する値オブジェクト
- 有効な値: `high`, `medium`, `low`
- 不正な値の場合はエラーをスロー
- イミュータブル（不変）

**2. `/tsumiki:tdd-testcases`** - テストケース作成

テストケース:
```typescript
// 正常系
test('有効な優先度（high）で値オブジェクトが作成される', ...)
test('有効な優先度（medium）で値オブジェクトが作成される', ...)
test('有効な優先度（low）で値オブジェクトが作成される', ...)
test('値オブジェクトの値が取得できる', ...)
test('値オブジェクトの等価性比較ができる', ...)

// 異常系
test('不正な優先度（invalid）でエラーがスローされる', ...)
test('空文字列でエラーがスローされる', ...)
test('nullでエラーがスローされる', ...)
test('undefinedでエラーがスローされる', ...)
```

**3. `/tsumiki:tdd-red`** - テスト実装（失敗）

ファイル: `app/server/src/domain/task/__tests__/TaskPriority.test.ts`

**4. `/tsumiki:tdd-green`** - 最小実装

ファイル: `app/server/src/domain/task/valueobjects/TaskPriority.ts`

```typescript
export type TaskPriorityValue = 'high' | 'medium' | 'low';

export class TaskPriority {
  private readonly value: TaskPriorityValue;

  private constructor(value: TaskPriorityValue) {
    this.value = value;
  }

  public static create(value: string): TaskPriority {
    if (!this.isValid(value)) {
      throw new Error(`不正な優先度です: ${value}`);
    }
    return new TaskPriority(value as TaskPriorityValue);
  }

  private static isValid(value: string): value is TaskPriorityValue {
    return ['high', 'medium', 'low'].includes(value);
  }

  public getValue(): TaskPriorityValue {
    return this.value;
  }

  public equals(other: TaskPriority): boolean {
    return this.value === other.value;
  }
}
```

**5. `/tsumiki:tdd-refactor`** - リファクタリング

エラーメッセージの改善、バリデーションロジックの最適化

**6. `/tsumiki:tdd-verify-complete`** - 品質確認

- すべてのテストが通る
- カバレッジ100%
- Biomeチェック合格

#### 完了条件

- [x] TaskPriority値オブジェクトが実装される
- [x] すべてのテストケースが通る
- [x] テストカバレッジ100%
- [x] Biomeチェック合格（`bun run check`）
- [x] 型チェック合格（`bun run typecheck`）

#### 参照

- 要件: REQ-005, REQ-103
- 設計: [interfaces.ts](../design/todo-app/interfaces.ts)
- DDD: 値オブジェクトパターン

---

### TASK-1307: TaskStatus値オブジェクト

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1306
- **要件名**: todo-app

#### TDDプロセス

**1. `/tsumiki:tdd-requirements`** - 詳細要件定義

要件:
- ステータスを表現する値オブジェクト
- 有効な値: `not_started`, `in_progress`, `in_review`, `completed`
- ステータス遷移のバリデーション（オプション）
- イミュータブル（不変）

**2. `/tsumiki:tdd-testcases`** - テストケース作成

テストケース:
```typescript
// 正常系
test('有効なステータス（not_started）で値オブジェクトが作成される', ...)
test('有効なステータス（in_progress）で値オブジェクトが作成される', ...)
test('有効なステータス（in_review）で値オブジェクトが作成される', ...)
test('有効なステータス（completed）で値オブジェクトが作成される', ...)
test('値オブジェクトの値が取得できる', ...)
test('値オブジェクトの等価性比較ができる', ...)

// 異常系
test('不正なステータス（invalid）でエラーがスローされる', ...)
test('空文字列でエラーがスローされる', ...)
test('nullでエラーがスローされる', ...)
```

**3. `/tsumiki:tdd-red`** - テスト実装（失敗）

ファイル: `app/server/src/domain/task/__tests__/TaskStatus.test.ts`

**4. `/tsumiki:tdd-green`** - 最小実装

ファイル: `app/server/src/domain/task/valueobjects/TaskStatus.ts`

```typescript
export type TaskStatusValue =
  | 'not_started'
  | 'in_progress'
  | 'in_review'
  | 'completed';

export class TaskStatus {
  private readonly value: TaskStatusValue;

  private constructor(value: TaskStatusValue) {
    this.value = value;
  }

  public static create(value: string): TaskStatus {
    if (!this.isValid(value)) {
      throw new Error(`不正なステータスです: ${value}`);
    }
    return new TaskStatus(value as TaskStatusValue);
  }

  private static isValid(value: string): value is TaskStatusValue {
    return ['not_started', 'in_progress', 'in_review', 'completed'].includes(value);
  }

  public getValue(): TaskStatusValue {
    return this.value;
  }

  public equals(other: TaskStatus): boolean {
    return this.value === other.value;
  }

  public isCompleted(): boolean {
    return this.value === 'completed';
  }
}
```

**5. `/tsumiki:tdd-refactor`** - リファクタリング

**6. `/tsumiki:tdd-verify-complete`** - 品質確認

#### 完了条件

- [x] TaskStatus値オブジェクトが実装される
- [x] すべてのテストケースが通る
- [x] テストカバレッジ100%
- [x] Biomeチェック合格
- [x] 型チェック合格

#### 参照

- 要件: REQ-004, REQ-104
- 設計: [interfaces.ts](../design/todo-app/interfaces.ts)

---

### TASK-1308: TaskTitle値オブジェクト

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1307
- **要件名**: todo-app

#### TDDプロセス

**1. `/tsumiki:tdd-requirements`** - 詳細要件定義

要件:
- タイトルを表現する値オブジェクト
- 1-100文字の制約
- 空文字列、空白のみは不可
- イミュータブル（不変）

**2. `/tsumiki:tdd-testcases`** - テストケース作成

テストケース:
```typescript
// 正常系
test('有効なタイトル（1文字）で値オブジェクトが作成される', ...)
test('有効なタイトル（50文字）で値オブジェクトが作成される', ...)
test('有効なタイトル（100文字）で値オブジェクトが作成される', ...)
test('値オブジェクトの値が取得できる', ...)
test('値オブジェクトの等価性比較ができる', ...)

// 異常系
test('空文字列でエラーがスローされる', ...)
test('空白のみ（スペース）でエラーがスローされる', ...)
test('101文字以上でエラーがスローされる', ...)
test('nullでエラーがスローされる', ...)
```

**3. `/tsumiki:tdd-red`** - テスト実装（失敗）

ファイル: `app/server/src/domain/task/__tests__/TaskTitle.test.ts`

**4. `/tsumiki:tdd-green`** - 最小実装

ファイル: `app/server/src/domain/task/valueobjects/TaskTitle.ts`

```typescript
export class TaskTitle {
  private readonly value: string;

  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 100;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string): TaskTitle {
    const trimmed = value?.trim() ?? '';

    if (trimmed.length < this.MIN_LENGTH) {
      throw new Error('タイトルを入力してください');
    }

    if (trimmed.length > this.MAX_LENGTH) {
      throw new Error('タイトルは100文字以内で入力してください');
    }

    return new TaskTitle(trimmed);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: TaskTitle): boolean {
    return this.value === other.value;
  }
}
```

**5. `/tsumiki:tdd-refactor`** - リファクタリング

**6. `/tsumiki:tdd-verify-complete`** - 品質確認

#### 完了条件

- [x] TaskTitle値オブジェクトが実装される
- [x] すべてのテストケースが通る
- [x] テストカバレッジ100%
- [x] Biomeチェック合格
- [x] 型チェック合格

#### 参照

- 要件: REQ-001, REQ-102, EDGE-001, EDGE-002
- 設計: [interfaces.ts](../design/todo-app/interfaces.ts)

---

### TASK-1309: TaskEntity実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1308
- **要件名**: todo-app

#### TDDプロセス

**1. `/tsumiki:tdd-requirements`** - 詳細要件定義

要件:
- タスクのエンティティを表現
- ファクトリメソッド: `create`（新規作成）、`reconstruct`（DBから復元）
- ビジネスロジック: タスクの振る舞いをカプセル化
- 値オブジェクトを集約

**2. `/tsumiki:tdd-testcases`** - テストケース作成

テストケース:
```typescript
// ファクトリメソッド: create
test('新規タスクが作成される（最小限のデータ）', ...)
test('新規タスクが作成される（すべてのデータ）', ...)
test('作成時にデフォルト値が設定される（priority: medium, status: not_started）', ...)
test('作成時にIDとタイムスタンプが自動生成される', ...)

// ファクトリメソッド: reconstruct
test('DBから復元したタスクが作成される', ...)
test('復元時にすべてのデータが保持される', ...)

// ビジネスロジック
test('タスクのタイトルが更新できる', ...)
test('タスクの説明が更新できる', ...)
test('タスクの優先度が変更できる', ...)
test('タスクのステータスが変更できる', ...)
test('タスクの等価性比較ができる（IDで判定）', ...)

// 異常系
test('不正なデータでエラーがスローされる', ...)
```

**3. `/tsumiki:tdd-red`** - テスト実装（失敗）

ファイル: `app/server/src/domain/task/__tests__/TaskEntity.test.ts`

**4. `/tsumiki:tdd-green`** - 最小実装

ファイル: `app/server/src/domain/task/TaskEntity.ts`

```typescript
import { TaskPriority } from './valueobjects/TaskPriority';
import { TaskStatus } from './valueobjects/TaskStatus';
import { TaskTitle } from './valueobjects/TaskTitle';
import { randomUUID } from 'node:crypto';

export interface TaskEntityProps {
  id: string;
  userId: string;
  title: TaskTitle;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskEntity {
  private readonly id: string;
  private readonly userId: string;
  private title: TaskTitle;
  private description: string | null;
  private priority: TaskPriority;
  private status: TaskStatus;
  private readonly createdAt: Date;
  private updatedAt: Date;

  private constructor(props: TaskEntityProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.title = props.title;
    this.description = props.description;
    this.priority = props.priority;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // 新規作成
  public static create(input: {
    userId: string;
    title: string;
    description?: string;
    priority?: string;
  }): TaskEntity {
    const now = new Date();

    return new TaskEntity({
      id: randomUUID(),
      userId: input.userId,
      title: TaskTitle.create(input.title),
      description: input.description ?? null,
      priority: TaskPriority.create(input.priority ?? 'medium'),
      status: TaskStatus.create('not_started'),
      createdAt: now,
      updatedAt: now,
    });
  }

  // DBから復元
  public static reconstruct(props: TaskEntityProps): TaskEntity {
    return new TaskEntity(props);
  }

  // ゲッター
  public getId(): string {
    return this.id;
  }

  public getUserId(): string {
    return this.userId;
  }

  public getTitle(): string {
    return this.title.getValue();
  }

  public getDescription(): string | null {
    return this.description;
  }

  public getPriority(): string {
    return this.priority.getValue();
  }

  public getStatus(): string {
    return this.status.getValue();
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ビジネスロジック
  public updateTitle(title: string): void {
    this.title = TaskTitle.create(title);
    this.touch();
  }

  public updateDescription(description: string | null): void {
    this.description = description;
    this.touch();
  }

  public changePriority(priority: string): void {
    this.priority = TaskPriority.create(priority);
    this.touch();
  }

  public changeStatus(status: string): void {
    this.status = TaskStatus.create(status);
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  public equals(other: TaskEntity): boolean {
    return this.id === other.id;
  }
}
```

**5. `/tsumiki:tdd-refactor`** - リファクタリング

**6. `/tsumiki:tdd-verify-complete`** - 品質確認

#### 完了条件

- [x] TaskEntityが実装される
- [x] すべてのテストケースが通る
- [x] テストカバレッジ100%
- [x] Biomeチェック合格
- [x] 型チェック合格

#### 参照

- 要件: REQ-001〜REQ-007
- 設計: [interfaces.ts](../design/todo-app/interfaces.ts)
- DDD: エンティティパターン、集約ルート

---

### TASK-1310: ドメインエラーとリポジトリインターフェース

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1309
- **要件名**: todo-app

#### TDDプロセス

**1. `/tsumiki:tdd-requirements`** - 詳細要件定義

要件:
- ドメインエラークラス: TaskNotFoundError, InvalidTaskDataError, TaskAccessDeniedError
- リポジトリインターフェース: ITaskRepository

**2. `/tsumiki:tdd-testcases`** - テストケース作成

テストケース:
```typescript
// ドメインエラー
test('TaskNotFoundErrorが正しいメッセージでスローされる', ...)
test('InvalidTaskDataErrorが正しいメッセージでスローされる', ...)
test('TaskAccessDeniedErrorが正しいメッセージでスローされる', ...)
test('各エラーのnameプロパティが正しい', ...)

// リポジトリインターフェース（型チェックのみ）
test('ITaskRepositoryインターフェースが定義される', ...)
```

**3. `/tsumiki:tdd-red`** - テスト実装（失敗）

ファイル: `app/server/src/domain/task/__tests__/errors.test.ts`

**4. `/tsumiki:tdd-green`** - 最小実装

ファイル: `app/server/src/domain/task/errors/TaskNotFoundError.ts`

```typescript
export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`タスクが見つかりません: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}
```

ファイル: `app/server/src/domain/task/errors/InvalidTaskDataError.ts`

```typescript
export class InvalidTaskDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTaskDataError';
  }
}
```

ファイル: `app/server/src/domain/task/errors/TaskAccessDeniedError.ts`

```typescript
export class TaskAccessDeniedError extends Error {
  constructor(taskId: string) {
    super(`このタスクにアクセスする権限がありません: ${taskId}`);
    this.name = 'TaskAccessDeniedError';
  }
}
```

ファイル: `app/server/src/domain/task/ITaskRepository.ts`

```typescript
import type { TaskEntity } from './TaskEntity';

export interface TaskFilters {
  priority?: string;
  status?: string[];
}

export type TaskSortBy = 'created_at_desc' | 'created_at_asc' | 'priority_desc';

export interface ITaskRepository {
  save(task: TaskEntity): Promise<TaskEntity>;
  findByUserId(userId: string, filters: TaskFilters, sort: TaskSortBy): Promise<TaskEntity[]>;
  findById(userId: string, taskId: string): Promise<TaskEntity | null>;
  update(userId: string, taskId: string, input: UpdateTaskInput): Promise<TaskEntity | null>;
  delete(userId: string, taskId: string): Promise<boolean>;
  updateStatus(userId: string, taskId: string, status: string): Promise<TaskEntity | null>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: string;
}
```

**5. `/tsumiki:tdd-refactor`** - リファクタリング

**6. `/tsumiki:tdd-verify-complete`** - 品質確認

#### 完了条件

- [x] 3つのドメインエラーが実装される
- [x] ITaskRepositoryインターフェースが定義される
- [x] すべてのテストケースが通る
- [x] Biomeチェック合格
- [x] 型チェック合格

#### 参照

- 要件: EDGE-003, EDGE-004
- 設計: [interfaces.ts](../design/todo-app/interfaces.ts)
- DDD: リポジトリパターン

---

## 🎉 フェーズ完了チェックリスト

### 値オブジェクト

- [x] TaskPriority値オブジェクトが実装される
- [x] TaskStatus値オブジェクトが実装される
- [x] TaskTitle値オブジェクトが実装される
- [x] すべての値オブジェクトのテストカバレッジ100%

### エンティティ

- [x] TaskEntityが実装される
- [x] ファクトリメソッド（create, reconstruct）が動作する
- [x] ビジネスロジックが実装される
- [x] テストカバレッジ100%

### エラー・インターフェース

- [x] TaskNotFoundErrorが実装される
- [x] InvalidTaskDataErrorが実装される
- [x] TaskAccessDeniedErrorが実装される
- [x] ITaskRepositoryインターフェースが定義される

### 品質

- [x] すべてのユニットテストが通る
- [x] テストカバレッジ80%以上
- [x] Biomeチェック合格
- [x] 型チェック合格

---

## 📚 参考資料

- [要件定義書](../spec/todo-app-requirements.md)
- [技術設計](../design/todo-app/architecture.md)
- [型定義](../design/todo-app/interfaces.ts)
- [エリック・エヴァンスのドメイン駆動設計](https://www.amazon.co.jp/dp/4798121967)
- [CLAUDE.md - テストガイドライン](../../CLAUDE.md)

---

## 📝 メモ

### 実装時の注意事項

1. **値オブジェクト**: イミュータブル（不変）を徹底
2. **エンティティ**: ビジネスロジックをカプセル化
3. **テスト**: Given-When-Thenパターンを意識
4. **ディレクトリ**: `domain/task/valueobjects/`, `domain/task/errors/` に配置

### DDD原則の適用

- **値オブジェクト**: 概念的な同一性ではなく、値の等価性で判定
- **エンティティ**: 識別子（ID）による同一性を持つ
- **集約ルート**: TaskEntityが集約ルート（今回はシンプルな集約）
- **リポジトリ**: データアクセスの抽象化、インターフェースのみDomain層に定義
