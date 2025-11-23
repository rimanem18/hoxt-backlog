# TDD用要件定義書: CreateTaskUseCase

## 📄 ドキュメント情報

- **作成日**: 2025-11-23
- **TASK-ID**: TASK-1311
- **機能名**: CreateTaskUseCase
- **フェーズ**: Phase 3 - Application層実装
- **要件名**: todo-app

---

## 1. 機能の概要

### 🔵 機能説明

- **何をする機能か**: ログイン済みユーザーが新規タスクを作成するユースケース
- **どのような問題を解決するか**: ユーザーが思いついたタスクを即座にシステムに記録し、タスク管理を開始できるようにする
- **想定されるユーザー**: Supabase Auth（Google OAuth）で認証済みのログインユーザー
- **システム内での位置づけ**: Application層のユースケースとして、Presentation層から呼び出され、Domain層のTaskEntityを作成し、Infrastructure層のITaskRepositoryを通じて永続化する

### 参照資料

- **参照したEARS要件**: REQ-001, REQ-102, REQ-103, REQ-104
- **参照した設計文書**: architecture.md (Application層)、interfaces.ts (CreateTaskInput、CreateTaskUseCaseInput)

---

## 2. 入力・出力の仕様

### 🔵 入力パラメータ

| パラメータ名 | 型 | 必須 | 制約 | デフォルト値 |
|------------|------|------|------|-------------|
| userId | string (UUID) | ✅ | JWT認証から取得されたユーザーID | - |
| title | string | ✅ | 1〜100文字、空文字不可 | - |
| description | string \| undefined | ❌ | Markdown形式、最大10000文字 | undefined（nullで保存） |
| priority | string \| undefined | ❌ | 'high' \| 'medium' \| 'low' | 'medium' |

#### 入力インターフェース（既存実装済み）

```typescript
// Domain層: TaskEntity.ts
export interface CreateTaskEntityInput {
  userId: string;
  title: string;
  description?: string;
  priority?: string;
}

// Application層で期待される入力
export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  priority?: string;
}
```

### 🔵 出力値

| 項目 | 型 | 説明 |
|-----|------|------|
| 正常時 | TaskEntity | 作成されたタスクエンティティ（ID、userId、title、description、priority、status、createdAt、updatedAt を持つ） |

#### 出力の詳細

- **id**: 新規生成されたUUID（TaskEntity.create内でrandomUUID()）
- **userId**: 入力のuserId
- **title**: 入力のtitle（バリデーション済み）
- **description**: 入力のdescription または null
- **priority**: 入力のpriority または 'medium'（デフォルト）
- **status**: 'not_started'（固定）
- **createdAt**: 作成時刻
- **updatedAt**: 作成時刻と同じ

### 🔵 入出力の関係性

```
CreateTaskInput --> CreateTaskUseCase --> TaskEntity.create() --> ITaskRepository.save() --> TaskEntity
```

### 参照資料

- **参照したEARS要件**: REQ-001, REQ-103, REQ-104
- **参照した設計文書**: interfaces.ts (CreateTaskInput)、TaskEntity.ts (CreateTaskEntityInput)

---

## 3. 制約条件

### 🔵 アーキテクチャ制約

- DDD + クリーンアーキテクチャパターンを適用
- Application層は Domain層のインターフェースに依存
- ITaskRepositoryを依存注入で受け取る（DIP原則）
- Presentation層から呼び出される（Controllerから）

### 🔵 ビジネスルール制約

- **REQ-102**: タイトルの入力は必須
- **REQ-103**: デフォルト優先度は「中」（medium）
- **REQ-104**: デフォルトステータスは「未着手」（not_started）

### 🔵 技術的制約

- Bun標準テストを使用したTDD開発
- 依存注入によるモック可能な設計
- テストカバレッジ100%

### 🔵 セキュリティ制約

- userIdはJWT認証から取得（信頼された値）
- RLSにより他ユーザーのデータには影響しない

### 参照資料

- **参照したEARS要件**: REQ-102, REQ-103, REQ-104, REQ-401, REQ-409
- **参照した設計文書**: architecture.md (レイヤ構成)、CLAUDE.md (SOLID原則)

---

## 4. 想定される使用例

### 🔵 正常系: タスクが正常に作成される

**シナリオ**: ユーザーがタイトルのみを入力してタスクを作成

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  title: '会議の資料を準備する',
};

// When
const task = await createTaskUseCase.execute(input);

// Then
expect(task.getId()).toBeDefined();
expect(task.getUserId()).toBe(input.userId);
expect(task.getTitle()).toBe('会議の資料を準備する');
expect(task.getDescription()).toBeNull();
expect(task.getPriority()).toBe('medium'); // デフォルト
expect(task.getStatus()).toBe('not_started'); // デフォルト
```

### 🔵 正常系: すべてのフィールドを指定してタスクを作成

**シナリオ**: ユーザーがタイトル、説明、優先度をすべて指定

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  title: '緊急: 本番障害対応',
  description: '## 対応内容\n- ログ確認\n- 原因調査',
  priority: 'high',
};

// When
const task = await createTaskUseCase.execute(input);

// Then
expect(task.getTitle()).toBe('緊急: 本番障害対応');
expect(task.getDescription()).toBe('## 対応内容\n- ログ確認\n- 原因調査');
expect(task.getPriority()).toBe('high');
```

### 🟡 異常系: タイトルが空文字でエラー

**シナリオ**: 空文字のタイトルでタスク作成を試みる

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  title: '',
};

// When & Then
await expect(createTaskUseCase.execute(input)).rejects.toThrow();
```

### 🟡 異常系: タイトルが100文字を超えてエラー

**シナリオ**: 101文字以上のタイトルでタスク作成を試みる

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  title: 'a'.repeat(101),
};

// When & Then
await expect(createTaskUseCase.execute(input)).rejects.toThrow();
```

### 🟡 異常系: 不正な優先度でエラー

**シナリオ**: 存在しない優先度でタスク作成を試みる

```typescript
// Given
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  title: 'テストタスク',
  priority: 'invalid_priority',
};

// When & Then
await expect(createTaskUseCase.execute(input)).rejects.toThrow();
```

### 参照資料

- **参照したEARS要件**: REQ-001, EDGE-001, EDGE-002
- **参照した設計文書**: dataflow.md (タスク作成フロー)

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- **ストーリー1.1: 素早いタスク追加** - インライン入力でタスクを素早く追加

### 参照した機能要件

| 要件ID | 要件内容 | 対応 |
|--------|---------|------|
| REQ-001 | システムはログイン済みユーザーがタスクを作成できなければならない | ✅ 本機能で実装 |
| REQ-102 | ユーザーが新規タスクを追加する場合、システムはタイトルの入力を必須としなければならない | ✅ TaskTitle値オブジェクトで検証 |
| REQ-103 | ユーザーがタスクを作成する場合、システムはデフォルトで優先度を「中」に設定しなければならない | ✅ TaskEntity.createで対応 |
| REQ-104 | ユーザーがタスクを作成する場合、システムはデフォルトでステータスを「未着手」に設定しなければならない | ✅ TaskEntity.createで対応 |

### 参照した非機能要件

| 要件ID | 要件内容 | 対応 |
|--------|---------|------|
| NFR-002 | タスク作成APIは500ms以内にレスポンスを返さなければならない | ⏳ Infrastructure層実装後に計測 |
| NFR-104 | タスクの入力値はサーバーサイドでZodバリデーションを実施しなければならない | ⏳ Presentation層で対応 |

### 参照したEdgeケース

| 要件ID | 要件内容 | 対応 |
|--------|---------|------|
| EDGE-001 | タイトルが空文字の場合、システムは「タイトルを入力してください」エラーを表示する | ✅ TaskTitle値オブジェクトで検証 |
| EDGE-002 | タイトルが100文字を超える場合、システムは「タイトルは100文字以内で入力してください」エラーを表示する | ✅ TaskTitle値オブジェクトで検証 |

### 参照した設計文書

| 文書 | 該当セクション |
|-----|--------------|
| architecture.md | Application層（アプリケーション層）、タスク作成フロー |
| interfaces.ts | CreateTaskInput、CreateTaskUseCaseInput |
| dataflow.md | タスク作成フロー |
| TaskEntity.ts | create()メソッド、CreateTaskEntityInput |
| ITaskRepository.ts | save()メソッド |

---

## 6. 実装ガイドライン

### ディレクトリ構成

```
app/server/src/
├── application/
│   └── usecases/
│       ├── __tests__/
│       │   └── CreateTaskUseCase.test.ts   ← テストファイル
│       └── CreateTaskUseCase.ts            ← 実装ファイル
└── domain/
    └── task/
        ├── TaskEntity.ts                    ← 既存（Phase 2で実装済み）
        └── ITaskRepository.ts               ← 既存（Phase 2で実装済み）
```

### クラス設計

```typescript
// CreateTaskUseCase.ts
export class CreateTaskUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: CreateTaskInput): Promise<TaskEntity> {
    // 1. TaskEntity.create()でエンティティを生成
    // 2. ITaskRepository.save()で永続化
    // 3. 保存されたTaskEntityを返却
  }
}
```

### テスト方針

- **モック対象**: ITaskRepository
- **検証項目**:
  1. 正常にタスクが作成される
  2. デフォルト値（priority: 'medium', status: 'not_started'）が適用される
  3. TaskTitle、TaskPriority の値オブジェクトのバリデーションエラーが伝播する
  4. ITaskRepository.save()が呼び出される

---

## 7. 品質判定

### 判定結果: ✅ 高品質

| 項目 | 状態 | 備考 |
|-----|------|------|
| 要件の曖昧さ | なし | EARS要件定義書で明確に定義済み |
| 入出力定義 | 完全 | interfaces.ts、TaskEntity.tsで型定義済み |
| 制約条件 | 明確 | アーキテクチャ・ビジネスルール明確 |
| 実装可能性 | 確実 | 依存するTaskEntity、ITaskRepositoryは実装済み |

### 依存関係の確認

- ✅ TaskEntity.create() - Phase 2 TASK-1309 で実装済み
- ✅ TaskTitle値オブジェクト - Phase 2 TASK-1308 で実装済み
- ✅ TaskPriority値オブジェクト - Phase 2 TASK-1306 で実装済み
- ✅ TaskStatus値オブジェクト - Phase 2 TASK-1307 で実装済み
- ✅ ITaskRepository インターフェース - Phase 2 TASK-1310 で定義済み

---

## 次のステップ

次のお勧めステップ: `/tdd-testcases` でテストケースの洗い出しを行います。
