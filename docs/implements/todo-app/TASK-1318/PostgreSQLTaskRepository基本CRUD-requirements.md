# TDD要件定義書: PostgreSQLTaskRepository（基本CRUD）

**作成日**: 2025-01-27
**タスクID**: TASK-1318
**要件名**: todo-app
**機能名**: PostgreSQLTaskRepository基本CRUD

---

## 1. 機能の概要

- 🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない
- **何をする機能か**: PostgreSQLTaskRepositoryの基本CRUD操作（作成・取得・更新・削除）を実装
- **どのような問題を解決するか**: Drizzle ORMを使用してタスクエンティティの永続化とデータアクセスを実現し、ITaskRepositoryインターフェースの具体実装を提供
- **想定されるユーザー**: アプリケーション層のUseCases（CreateTaskUseCase、GetTaskUseCase、UpdateTaskUseCase、DeleteTaskUseCase）
- **システム内での位置づけ**: Infrastructure層のリポジトリ実装として、Domain層のITaskRepositoryインターフェースを実装し、データベースアクセスを担当
- **参照したEARS要件**: REQ-001（タスク作成）、REQ-002（タスク取得）、REQ-003（タスク更新）、REQ-004（タスク削除）
- **参照した設計文書**: todo-app-phase4.md、DatabaseConnection.ts実装

---

## 2. 入力・出力の仕様

### save メソッド

- 🔵 **青信号**: 設計文書から型定義を抽出

**入力**:
- `task: TaskEntity` - 保存対象のタスクエンティティ
  - `id: string` (UUID v4形式)
  - `userId: string` (UUID v4形式)
  - `title: TaskTitle` (値オブジェクト)
  - `description: string | null`
  - `priority: TaskPriority` (値オブジェクト: 'high' | 'medium' | 'low')
  - `status: TaskStatus` (値オブジェクト: 'todo' | 'in_progress' | 'done')
  - `createdAt: Date`
  - `updatedAt: Date`

**出力**:
- `Promise<TaskEntity>` - 保存されたタスクエンティティ

**データフロー**:
1. TaskEntityから値を抽出
2. Drizzle ORMでINSERT実行
3. returning()で挿入結果を取得
4. toDomain()でTaskEntityに変換して返却

---

### findById メソッド

- 🔵 **青信号**: 設計文書から型定義を抽出

**入力**:
- `userId: string` (UUID v4形式) - タスクの所有者ID
- `taskId: string` (UUID v4形式) - 取得対象のタスクID

**出力**:
- `Promise<TaskEntity | null>` - 取得されたタスクエンティティ、見つからない場合はnull

**データフロー**:
1. userIdとtaskIdでWHERE条件を構築
2. Drizzle ORMでSELECT実行（LIMIT 1）
3. 結果が存在すればtoDomain()でTaskEntityに変換、なければnullを返却

---

### update メソッド

- 🔵 **青信号**: 設計文書から型定義を抽出

**入力**:
- `userId: string` (UUID v4形式) - タスクの所有者ID
- `taskId: string` (UUID v4形式) - 更新対象のタスクID
- `input: UpdateTaskInput` - 更新データ
  - `title?: string`
  - `description?: string | null`
  - `priority?: 'high' | 'medium' | 'low'`
  - `status?: 'todo' | 'in_progress' | 'done'`
  - `updatedAt: Date`

**出力**:
- `Promise<TaskEntity | null>` - 更新されたタスクエンティティ、見つからない場合はnull

**データフロー**:
1. userIdとtaskIdでWHERE条件を構築
2. Drizzle ORMでUPDATE実行
3. returning()で更新結果を取得
4. 結果が存在すればtoDomain()でTaskEntityに変換、なければnullを返却

---

### delete メソッド

- 🔵 **青信号**: 設計文書から型定義を抽出

**入力**:
- `userId: string` (UUID v4形式) - タスクの所有者ID
- `taskId: string` (UUID v4形式) - 削除対象のタスクID

**出力**:
- `Promise<boolean>` - 削除成功時true、対象が存在しない場合false

**データフロー**:
1. userIdとtaskIdでWHERE条件を構築
2. Drizzle ORMでDELETE実行
3. rowCountが0より大きければtrue、そうでなければfalseを返却

---

### toDomain メソッド（private）

- 🔵 **青信号**: 設計文書から型定義を抽出

**入力**:
- `row: typeof tasks.$inferSelect` - データベースから取得した行データ

**出力**:
- `TaskEntity` - ドメインエンティティ

**データフロー**:
1. データベース行データを値オブジェクトに変換
2. TaskEntity.reconstruct()でエンティティを再構築

**参照したEARS要件**: REQ-001, REQ-002, REQ-003, REQ-004
**参照した設計文書**: todo-app-phase4.md TASK-1318実装詳細、schema.tsのtasksテーブル定義

---

## 3. 制約条件

- 🔵 **青信号**: 設計文書・アーキテクチャから抽出

**データベース制約**:
- tasksテーブルのスキーマ定義に準拠（schema.ts）
- UUID v4形式のID検証（id, userId）
- NOT NULL制約（id, userId, title, priority, status, createdAt, updatedAt）
- RLS（Row Level Security）設定によるユーザー分離（app.current_user_id）

**アーキテクチャ制約**:
- DDD + クリーンアーキテクチャに準拠
- ITaskRepositoryインターフェースの完全実装
- Domain層への依存のみ許可（Infrastructure層からDomain層への単方向依存）
- 値オブジェクト（TaskTitle、TaskPriority、TaskStatus）の使用

**セキュリティ要件**:
- NFR-102: RLS設定による他ユーザーのタスクへのアクセス制御
- WHERE条件に必ずuserIdを含める（多層防御）
- SQLインジェクション対策（Drizzle ORMのパラメータバインディング）

**パフォーマンス要件**:
- NFR-103: データベース接続プーリング（DatabaseConnectionで管理）
- インデックス活用（id, userIdでの検索）
- LIMIT句の使用（findByIdで1件のみ取得）

**参照したEARS要件**: NFR-102（セキュリティ）、NFR-103（パフォーマンス）、REQ-403（RLS設定）
**参照した設計文書**: architecture.md（DDD層分離）、DatabaseConnection.ts（接続管理）、schema.ts（テーブル定義）

---

## 4. 想定される使用例

### 基本的な使用パターン

- 🔵 **青信号**: 設計文書のデータフローから抽出

#### タスク作成
```typescript
const taskEntity = TaskEntity.create({
  userId: 'user-uuid',
  title: TaskTitle.create('新しいタスク'),
  description: 'タスクの説明',
  priority: TaskPriority.create('high'),
  status: TaskStatus.create('todo'),
});

const savedTask = await repository.save(taskEntity);
// savedTask: TaskEntity (DBに保存されたエンティティ)
```

#### タスク取得
```typescript
const task = await repository.findById('user-uuid', 'task-uuid');
// task: TaskEntity | null
```

#### タスク更新
```typescript
const updatedTask = await repository.update(
  'user-uuid',
  'task-uuid',
  {
    title: '更新されたタスク',
    status: 'in_progress',
    updatedAt: new Date(),
  }
);
// updatedTask: TaskEntity | null
```

#### タスク削除
```typescript
const isDeleted = await repository.delete('user-uuid', 'task-uuid');
// isDeleted: boolean
```

---

### エッジケース

- 🔵 **青信号**: EARS Edgeケースから抽出

#### 存在しないタスクの取得
```typescript
const task = await repository.findById('user-uuid', 'non-existent-uuid');
// task: null
```

#### 他ユーザーのタスクへのアクセス
```typescript
// RLS設定により、他ユーザーのタスクは取得できない
const task = await repository.findById('user-A-uuid', 'user-B-task-uuid');
// task: null（RLSにより自動的にフィルタリング）
```

#### 存在しないタスクの更新
```typescript
const updatedTask = await repository.update(
  'user-uuid',
  'non-existent-uuid',
  { title: '更新' }
);
// updatedTask: null
```

#### 存在しないタスクの削除
```typescript
const isDeleted = await repository.delete('user-uuid', 'non-existent-uuid');
// isDeleted: false
```

---

### エラーケース

- 🟡 **黄信号**: 設計文書から妥当な推測

#### データベース接続エラー
```typescript
// DatabaseConnectionが利用不可の場合、例外がスロー
// エラーハンドリングはUseCase層で実施
```

#### 不正なデータ形式
```typescript
// 値オブジェクトのバリデーションで事前に防止
// TaskTitle.create()、TaskPriority.create()でエラーがスロー
```

**参照したEARS要件**: REQ-001（作成）、REQ-002（取得）、REQ-003（更新）、REQ-004（削除）、EDGE-101（存在しないタスク）、EDGE-102（他ユーザーアクセス）
**参照した設計文書**: dataflow.md（タスクCRUDフロー）、architecture.md（エラーハンドリング方針）

---

## 5. EARS要件・設計文書との対応関係

**参照したユーザストーリー**:
- タスク管理機能（作成・取得・更新・削除）

**参照した機能要件**:
- REQ-001: タスク作成機能
- REQ-002: タスク取得機能
- REQ-003: タスク更新機能
- REQ-004: タスク削除機能（Phase 3で実装済み）
- REQ-403: RLS設定によるユーザー分離

**参照した非機能要件**:
- NFR-102: Row Level Security（RLS）によるデータ分離
- NFR-103: データベース接続プーリングとパフォーマンス

**参照したEdgeケース**:
- EDGE-101: 存在しないタスクへのアクセス
- EDGE-102: 他ユーザーのタスクへのアクセス試行

**参照した受け入れ基準**:
- 基本CRUD操作が正常に動作する
- RLS設定により他ユーザーのタスクにアクセスできない
- 存在しないタスクの操作で適切な戻り値を返す

**参照した設計文書**:
- **タスク定義**: docs/tasks/todo-app-phase4.md（TASK-1318）
- **アーキテクチャ**: DDD + クリーンアーキテクチャ（Infrastructure層実装）
- **データベース**: DatabaseConnection.ts（接続管理）、schema.ts（tasksテーブル）
- **ドメインモデル**: TaskEntity、TaskTitle、TaskPriority、TaskStatus
- **インターフェース**: ITaskRepository（Domain層）

---

## 品質判定

✅ **高品質**:
- 要件の曖昧さ: なし（🔵青信号が大部分）
- 入出力定義: 完全（すべてのメソッドで明確に定義）
- 制約条件: 明確（データベース、アーキテクチャ、セキュリティ、パフォーマンス）
- 実装可能性: 確実（既存のDatabaseConnection、TaskEntity、値オブジェクトを活用）

---

**次のお勧めステップ**: `/tsumiki:tdd-testcases` でテストケースの洗い出しを行います。
