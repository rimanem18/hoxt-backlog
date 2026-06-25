# TDD用要件定義書: GetTasksUseCase

## ドキュメント情報

- **作成日**: 2025-11-23
- **TASK-ID**: TASK-1312
- **機能名**: GetTasksUseCase
- **フェーズ**: Phase 3 - Application層実装
- **要件名**: todo-app

---

## 1. 機能の概要

### 機能説明（EARS要件定義書・設計文書ベース）

- 🔵 **何をする機能か**: ログイン済みユーザーの所有するタスク一覧を取得するユースケース。フィルタ条件（優先度・ステータス）とソート順を指定可能
- 🔵 **どのような問題を解決するか**: ユーザーが自分のタスクを一覧表示し、優先度やステータスで絞り込み、任意の順序で確認できるようにする
- 🔵 **想定されるユーザー**: Supabase Auth（Google OAuth）で認証済みのログインユーザー
- 🔵 **システム内での位置づけ**: Application層のユースケースとして、Presentation層から呼び出され、Infrastructure層のITaskRepositoryを通じてデータを取得する

### 参照資料

- **参照したEARS要件**: REQ-006, REQ-201, REQ-202, REQ-203
- **参照した設計文書**: architecture.md (Application層)、interfaces.ts (GetTasksUseCaseInput, TaskFilters, TaskSortBy)、api-endpoints.md (GET /api/tasks)

---

## 2. 入力・出力の仕様

### 入力パラメータ（TypeScript型定義ベース）

| パラメータ名 | 型 | 必須 | 制約 | デフォルト値 |
|------------|------|------|------|-------------|
| userId | string (UUID) | 🔵 ✅ | JWT認証から取得されたユーザーID | - |
| filters | TaskFilters | 🔵 ✅ | フィルタ条件オブジェクト | - |
| filters.priority | string \| undefined | 🔵 ❌ | 'high' \| 'medium' \| 'low' | undefined（全優先度） |
| filters.status | string[] \| undefined | 🔵 ❌ | 複数選択可能なステータス配列 | undefined（全ステータス） |
| sort | TaskSortBy | 🔵 ✅ | ソート順 | 'created_at_desc' |

#### 入力インターフェース（ITaskRepository.ts より）

```typescript
// フィルタ条件
export interface TaskFilters {
  /** 優先度フィルタ */
  priority?: string;
  /** ステータスフィルタ（複数選択可能） */
  status?: string[];
}

// ソート順
export type TaskSortBy =
  | 'created_at_desc' // 作成日時（新しい順）- デフォルト
  | 'created_at_asc'  // 作成日時（古い順）
  | 'priority_desc';  // 優先度（高→低）

// ユースケース入力（設計文書 interfaces.ts より）
export interface GetTasksInput {
  userId: string;
  filters: TaskFilters;
  sort: TaskSortBy;
}
```

### 出力値（TypeScript型定義ベース）

| 項目 | 型 | 説明 |
|-----|------|------|
| 🔵 正常時 | TaskEntity[] | フィルタ・ソート適用後のタスクエンティティ配列 |
| 🔵 該当なし | TaskEntity[]（空配列） | 条件に合致するタスクがない場合は空配列 |

#### 出力の詳細

- 各TaskEntityは以下のプロパティを持つ：
  - **id**: UUID
  - **userId**: 検索対象のuserId
  - **title**: タスクタイトル
  - **description**: 説明（Markdown形式）または null
  - **priority**: 'high' | 'medium' | 'low'
  - **status**: 'not_started' | 'in_progress' | 'in_review' | 'completed'
  - **createdAt**: 作成日時
  - **updatedAt**: 更新日時

### 入出力の関係性（データフローベース）

```
GetTasksInput --> GetTasksUseCase --> ITaskRepository.findByUserId() --> TaskEntity[]
```

### 参照資料

- **参照したEARS要件**: REQ-006, REQ-201, REQ-202, REQ-203
- **参照した設計文書**: interfaces.ts (GetTasksUseCaseInput, TaskFilters, TaskSortBy)、ITaskRepository.ts (findByUserId)

---

## 3. 制約条件

### アーキテクチャ制約（architecture.md ベース）

- 🔵 DDD + クリーンアーキテクチャパターンを適用
- 🔵 Application層は Domain層のインターフェースに依存
- 🔵 ITaskRepositoryを依存注入で受け取る（DIP原則）
- 🔵 Presentation層から呼び出される（Controllerから）
- 🔵 ユースケースはビジネスロジックの調整役であり、実際のデータ取得はリポジトリに委譲

### ビジネスルール制約（EARS機能要件ベース）

- 🔵 **REQ-006**: タスク一覧を表示しなければならない
- 🔵 **REQ-201**: 優先度フィルタが適用されている場合、選択された優先度のタスクのみを表示
- 🔵 **REQ-202**: ステータスフィルタが適用されている場合、選択されたステータス（複数選択可能）のタスクのみを表示
- 🔵 **REQ-203**: ソート順が指定されている場合、指定された順序でタスクを並べ替える

### 技術的制約（CLAUDE.md ベース）

- 🔵 Bun標準テストを使用したTDD開発
- 🔵 依存注入によるモック可能な設計
- 🔵 テストカバレッジ100%

### セキュリティ制約（NFR-102 ベース）

- 🔵 userIdはJWT認証から取得（信頼された値）
- 🔵 RLSにより自分のタスクのみ取得可能（他ユーザーのデータは取得不可）

### パフォーマンス制約（NFR-001 ベース）

- 🟡 タスク一覧取得APIは1秒以内にレスポンスを返す（Infrastructure層実装後に計測）

### 参照資料

- **参照したEARS要件**: REQ-006, REQ-201, REQ-202, REQ-203, REQ-401, REQ-409, NFR-001, NFR-102
- **参照した設計文書**: architecture.md (レイヤ構成)、CLAUDE.md (SOLID原則)

---

## 4. 想定される使用例

### 正常系: フィルタなしで全タスク取得（デフォルトソート）

🔵 **要件**: REQ-006

**シナリオ**: ユーザーがフィルタを指定せずにタスク一覧を取得

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  filters: {},
  sort: 'created_at_desc' as const,
};

// When
const tasks = await getTasksUseCase.execute(input);

// Then
expect(Array.isArray(tasks)).toBe(true);
// ソート順が作成日時（新しい順）であることを検証
```

### 正常系: 優先度フィルタ適用

🔵 **要件**: REQ-201

**シナリオ**: ユーザーが「高」優先度のタスクのみを取得

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  filters: { priority: 'high' },
  sort: 'created_at_desc' as const,
};

// When
const tasks = await getTasksUseCase.execute(input);

// Then
tasks.forEach(task => {
  expect(task.getPriority()).toBe('high');
});
```

### 正常系: ステータスフィルタ適用（複数選択）

🔵 **要件**: REQ-202

**シナリオ**: ユーザーが「未着手」と「進行中」のタスクのみを取得

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  filters: { status: ['not_started', 'in_progress'] },
  sort: 'created_at_desc' as const,
};

// When
const tasks = await getTasksUseCase.execute(input);

// Then
tasks.forEach(task => {
  expect(['not_started', 'in_progress']).toContain(task.getStatus());
});
```

### 正常系: フィルタとソートの組み合わせ

🔵 **要件**: REQ-201, REQ-202, REQ-203

**シナリオ**: ユーザーが「高」優先度かつ「未着手」のタスクを優先度順で取得

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  filters: { priority: 'high', status: ['not_started'] },
  sort: 'priority_desc' as const,
};

// When
const tasks = await getTasksUseCase.execute(input);

// Then
tasks.forEach(task => {
  expect(task.getPriority()).toBe('high');
  expect(task.getStatus()).toBe('not_started');
});
```

### 正常系: 該当タスクなし（空配列を返す）

🟡 **要件**: EDGE-101（推測）

**シナリオ**: フィルタ条件に合致するタスクがない場合

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  filters: { priority: 'high', status: ['completed'] },
  sort: 'created_at_desc' as const,
};
// モックリポジトリは空配列を返すように設定

// When
const tasks = await getTasksUseCase.execute(input);

// Then
expect(tasks).toEqual([]);
expect(tasks.length).toBe(0);
```

### 正常系: 作成日時（古い順）でソート

🔵 **要件**: REQ-203

**シナリオ**: ユーザーが作成日時の古い順でタスクを取得

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  filters: {},
  sort: 'created_at_asc' as const,
};

// When
const tasks = await getTasksUseCase.execute(input);

// Then
// リポジトリが正しいソート順で呼び出されたことを検証
```

### 参照資料

- **参照したEARS要件**: REQ-006, REQ-201, REQ-202, REQ-203, EDGE-101
- **参照した設計文書**: dataflow.md (タスク一覧取得フロー)、api-endpoints.md (GET /api/tasks)

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- **ストーリー1.2: 一覧表示** - タスクを一覧で確認する
- **ストーリー2.1: ステータスでフィルタ** - 進捗状況別にタスクを絞り込む
- **ストーリー2.2: 優先度でフィルタ** - 優先度別にタスクを絞り込む
- **ストーリー2.3: ソート機能** - 任意の順序でタスクを並べ替える

### 参照した機能要件

| 要件ID | 要件内容 | 対応 |
|--------|---------|------|
| REQ-006 | システムはタスク一覧を表示しなければならない | ✅ 本機能で実装 |
| REQ-201 | 優先度フィルタが適用されている場合、システムは選択された優先度のタスクのみを表示しなければならない | ✅ filtersパラメータで対応 |
| REQ-202 | ステータスフィルタが適用されている場合、システムは選択されたステータス（複数選択可能）のタスクのみを表示しなければならない | ✅ filtersパラメータで対応 |
| REQ-203 | ソート順が指定されている場合、システムは指定された順序でタスクを並べ替えなければならない | ✅ sortパラメータで対応 |

### 参照した非機能要件

| 要件ID | 要件内容 | 対応 |
|--------|---------|------|
| NFR-001 | タスク一覧取得APIは1秒以内にレスポンスを返さなければならない | ⏳ Infrastructure層実装後に計測 |
| NFR-102 | ユーザーは自分自身のタスクのみアクセス可能でなければならない | ✅ userIdパラメータ + RLSで対応 |

### 参照したEdgeケース

| 要件ID | 要件内容 | 対応 |
|--------|---------|------|
| EDGE-101 | タスク数が0件の場合、システムは「タスクがありません」メッセージを表示する | ✅ 空配列を返す（UIでメッセージ表示） |

### 参照した設計文書

| 文書 | 該当セクション |
|-----|--------------|
| architecture.md | Application層（アプリケーション層）、タスク一覧取得フロー |
| interfaces.ts | GetTasksUseCaseInput、TaskFilters、TaskSortBy |
| dataflow.md | タスク一覧取得フロー（フィルタ・ソート） |
| api-endpoints.md | GET /api/tasks |
| ITaskRepository.ts | findByUserId()メソッド |

---

## 6. 実装ガイドライン

### ディレクトリ構成

```
app/server/src/
├── application/
│   └── usecases/
│       ├── __tests__/
│       │   └── GetTasksUseCase.test.ts    ← テストファイル
│       └── GetTasksUseCase.ts             ← 実装ファイル
└── domain/
    └── task/
        ├── TaskEntity.ts                   ← 既存（Phase 2で実装済み）
        └── ITaskRepository.ts              ← 既存（Phase 2で定義済み）
```

### クラス設計

```typescript
// GetTasksUseCase.ts
export interface GetTasksInput {
  userId: string;
  filters: TaskFilters;
  sort: TaskSortBy;
}

export class GetTasksUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: GetTasksInput): Promise<TaskEntity[]> {
    // ITaskRepository.findByUserId()でタスク一覧を取得
    return await this.taskRepository.findByUserId(
      input.userId,
      input.filters,
      input.sort,
    );
  }
}
```

### テスト方針

- **モック対象**: ITaskRepository
- **検証項目**:
  1. フィルタなしで全タスク取得（リポジトリが正しいパラメータで呼び出される）
  2. 優先度フィルタが正しく渡される
  3. ステータスフィルタ（複数）が正しく渡される
  4. ソート順が正しく渡される
  5. 該当タスクがない場合は空配列を返す
  6. ITaskRepository.findByUserId()が正しい引数で呼び出される

---

## 7. 品質判定

### 判定結果: ✅ 高品質

| 項目 | 状態 | 備考 |
|-----|------|------|
| 要件の曖昧さ | なし | EARS要件定義書で明確に定義済み（REQ-006, REQ-201, REQ-202, REQ-203） |
| 入出力定義 | 完全 | interfaces.ts、ITaskRepository.tsで型定義済み |
| 制約条件 | 明確 | アーキテクチャ・ビジネスルール明確 |
| 実装可能性 | 確実 | 依存するITaskRepository.findByUserId()は定義済み |

### 依存関係の確認

- ✅ TaskEntity - Phase 2 TASK-1309 で実装済み
- ✅ ITaskRepository インターフェース - Phase 2 TASK-1310 で定義済み
- ✅ TaskFilters、TaskSortBy 型 - ITaskRepository.ts で定義済み
- ✅ CreateTaskUseCase - Phase 3 TASK-1311 で実装済み（パターン参考）

---

## 次のステップ

次のお勧めステップ: `/tdd-testcases` でテストケースの洗い出しを行います。
