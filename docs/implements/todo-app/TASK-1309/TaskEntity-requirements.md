# TaskEntity 要件定義書

## 📄 ドキュメント情報

- **作成日**: 2025-11-22
- **タスクID**: TASK-1309
- **要件名**: todo-app
- **機能名**: TaskEntity
- **フェーズ**: Phase 2 - バックエンドDomain層実装
- **依存タスク**: TASK-1308 (TaskTitle値オブジェクト)

---

## 1. 機能の概要

### 何をする機能か

🔵 **ユーザーストーリーから抽出**

TaskEntityは、TODOリストアプリにおけるタスクのドメインエンティティを表現する。
DDD（ドメイン駆動設計）の原則に従い、タスクの本質的な振る舞いとビジネスロジックをカプセル化する集約ルートとして機能する。

### どのような問題を解決するか

🔵 **要件定義書より**

- タスクデータの一貫性と整合性を保証
- ビジネスルールの一元管理（バリデーション、状態遷移）
- 値オブジェクト（TaskPriority, TaskStatus, TaskTitle）の集約
- 新規作成とDB復元の明確な区別（ファクトリメソッドパターン）

### 想定されるユーザー

🔵 **要件定義書より**

- バックエンドApplication層（ユースケース）
- バックエンドInfrastructure層（リポジトリ）

### システム内での位置づけ

🔵 **アーキテクチャ設計より**

```
Domain層
├── task/
│   ├── TaskEntity.ts        ← 本タスクの実装対象
│   ├── valueobjects/
│   │   ├── TaskPriority.ts  ← 実装済み
│   │   ├── TaskStatus.ts    ← 実装済み
│   │   └── TaskTitle.ts     ← 実装済み
│   └── errors/              ← TASK-1310で実装予定
```

- **参照したEARS要件**: REQ-001〜REQ-007, REQ-401, REQ-407
- **参照した設計文書**: architecture.md「Domain層」セクション

---

## 2. 入力・出力の仕様

### 2.1 ファクトリメソッド: `create` (新規作成)

🔵 **interfaces.ts CreateTaskInput より**

#### 入力パラメータ

| パラメータ名 | 型 | 必須 | 制約・デフォルト |
|-------------|------|------|-----------------|
| `userId` | `string` | 必須 | UUID形式 |
| `title` | `string` | 必須 | 1-100文字（TaskTitle制約） |
| `description` | `string` | 任意 | Markdown形式、null可 |
| `priority` | `string` | 任意 | デフォルト: `'medium'` |

#### 出力

- 新しい`TaskEntity`インスタンス
- `id`: 自動生成（UUID）
- `status`: 自動設定（`'not_started'`）
- `createdAt`: 自動設定（現在日時）
- `updatedAt`: 自動設定（現在日時）

#### 例外

- タイトルが空または100文字超 → Error
- 不正な優先度値 → Error

### 2.2 ファクトリメソッド: `reconstruct` (DB復元)

🔵 **DDD原則より**

#### 入力パラメータ（TaskEntityProps）

| パラメータ名 | 型 | 説明 |
|-------------|------|------|
| `id` | `string` | タスクID（UUID） |
| `userId` | `string` | ユーザーID（UUID） |
| `title` | `TaskTitle` | タイトル値オブジェクト |
| `description` | `string \| null` | 説明 |
| `priority` | `TaskPriority` | 優先度値オブジェクト |
| `status` | `TaskStatus` | ステータス値オブジェクト |
| `createdAt` | `Date` | 作成日時 |
| `updatedAt` | `Date` | 更新日時 |

#### 出力

- 復元された`TaskEntity`インスタンス（バリデーションなし）

### 2.3 ゲッターメソッド

🔵 **interfaces.ts TaskEntity より**

| メソッド | 戻り値型 | 説明 |
|---------|---------|------|
| `getId()` | `string` | タスクIDを取得 |
| `getUserId()` | `string` | ユーザーIDを取得 |
| `getTitle()` | `string` | タイトルを取得（値オブジェクトから展開） |
| `getDescription()` | `string \| null` | 説明を取得 |
| `getPriority()` | `string` | 優先度を取得（値オブジェクトから展開） |
| `getStatus()` | `string` | ステータスを取得（値オブジェクトから展開） |
| `getCreatedAt()` | `Date` | 作成日時を取得 |
| `getUpdatedAt()` | `Date` | 更新日時を取得 |

### 2.4 ビジネスロジックメソッド

🔵 **要件定義書 REQ-002, REQ-004 より**

| メソッド | 引数 | 説明 | 副作用 |
|---------|------|------|-------|
| `updateTitle(title: string)` | 新しいタイトル | タイトルを更新 | updatedAtを更新 |
| `updateDescription(description: string \| null)` | 新しい説明 | 説明を更新 | updatedAtを更新 |
| `changePriority(priority: string)` | 新しい優先度 | 優先度を変更 | updatedAtを更新 |
| `changeStatus(status: string)` | 新しいステータス | ステータスを変更 | updatedAtを更新 |
| `equals(other: TaskEntity)` | 比較対象 | IDによる同一性比較 | なし |

- **参照したEARS要件**: REQ-001, REQ-002, REQ-004, REQ-102, REQ-103, REQ-104
- **参照した設計文書**: interfaces.ts の TaskEntity, CreateTaskInput, UpdateTaskInput

---

## 3. 制約条件

### 3.1 アーキテクチャ制約

🔵 **CLAUDE.md、architecture.md より**

- **DDD原則の遵守**: エンティティはIDによる同一性を持つ
- **イミュータブル設計**: コンストラクタはプライベート、ファクトリメソッドで生成
- **値オブジェクトの集約**: TaskPriority, TaskStatus, TaskTitleを内部で使用
- **外部依存なし**: Domain層は他の層に依存しない（Pure TypeScript）
- **SOLID原則**: 単一責任（タスクの振る舞いのみ）

### 3.2 データ制約

🔵 **要件定義書、interfaces.ts より**

| フィールド | 制約 |
|-----------|------|
| `id` | UUID形式、自動生成 |
| `userId` | UUID形式、必須 |
| `title` | 1-100文字、空白のみ不可 |
| `description` | null可、Markdown形式 |
| `priority` | `'high'`, `'medium'`, `'low'` のいずれか |
| `status` | `'not_started'`, `'in_progress'`, `'in_review'`, `'completed'` のいずれか |

### 3.3 既存実装との整合性

🔵 **既存値オブジェクト実装より**

- `TaskPriority.create(value: unknown)`: 不正値でErrorをスロー
- `TaskStatus.create(value: unknown)`: 不正値でErrorをスロー
- `TaskTitle.create(value: unknown)`: 空文字/100文字超でErrorをスロー

- **参照したEARS要件**: REQ-401, REQ-407
- **参照した設計文書**: architecture.md「レイヤ構成」セクション、既存値オブジェクト実装

---

## 4. 想定される使用例

### 4.1 基本的な使用パターン

🔵 **要件定義書 REQ-001 より**

#### 新規タスク作成

```typescript
// Given: ユーザーIDとタスクデータ
const userId = 'user-uuid-123';
const taskData = {
  title: '買い物リストを作成する',
  description: '牛乳、卵、パン',
  priority: 'high',
};

// When: 新規タスクを作成
const task = TaskEntity.create({
  userId,
  title: taskData.title,
  description: taskData.description,
  priority: taskData.priority,
});

// Then: タスクが正しく作成される
task.getId();        // 自動生成されたUUID
task.getUserId();    // 'user-uuid-123'
task.getTitle();     // '買い物リストを作成する'
task.getPriority();  // 'high'
task.getStatus();    // 'not_started' (デフォルト)
```

#### デフォルト値での作成

🟡 **REQ-103, REQ-104 より推測**

```typescript
// Given: 最小限のデータ
const task = TaskEntity.create({
  userId: 'user-uuid-123',
  title: 'シンプルなタスク',
});

// Then: デフォルト値が設定される
task.getPriority();  // 'medium' (デフォルト)
task.getStatus();    // 'not_started' (デフォルト)
task.getDescription();  // null
```

### 4.2 DB復元パターン

🔵 **DDD原則より**

```typescript
// Given: DBから取得したデータ
const dbRecord = {
  id: 'task-uuid-456',
  userId: 'user-uuid-123',
  title: 'DBから復元されたタスク',
  description: 'マークダウン説明',
  priority: 'low',
  status: 'in_progress',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-02'),
};

// When: DBから復元
const task = TaskEntity.reconstruct({
  id: dbRecord.id,
  userId: dbRecord.userId,
  title: TaskTitle.create(dbRecord.title),
  description: dbRecord.description,
  priority: TaskPriority.create(dbRecord.priority),
  status: TaskStatus.create(dbRecord.status),
  createdAt: dbRecord.createdAt,
  updatedAt: dbRecord.updatedAt,
});

// Then: すべてのデータが保持される
task.getId();  // 'task-uuid-456'
task.getCreatedAt();  // 2025-01-01
```

### 4.3 ビジネスロジック使用パターン

🔵 **要件定義書 REQ-002, REQ-004 より**

```typescript
// Given: 既存のタスク
const task = TaskEntity.create({
  userId: 'user-uuid-123',
  title: '元のタイトル',
});
const originalUpdatedAt = task.getUpdatedAt();

// When: タイトルを更新
task.updateTitle('新しいタイトル');

// Then: タイトルとupdatedAtが更新される
task.getTitle();  // '新しいタイトル'
task.getUpdatedAt().getTime() > originalUpdatedAt.getTime();  // true
```

### 4.4 エッジケース

🔵 **EDGE-001, EDGE-002 より**

#### 不正なタイトル

```typescript
// 空文字列 → エラー
expect(() => TaskEntity.create({
  userId: 'user-uuid-123',
  title: '',
})).toThrow('タイトルを入力してください');

// 101文字以上 → エラー
expect(() => TaskEntity.create({
  userId: 'user-uuid-123',
  title: 'a'.repeat(101),
})).toThrow('タイトルは100文字以内で入力してください');
```

#### 不正な優先度

```typescript
// 無効な優先度 → エラー
expect(() => TaskEntity.create({
  userId: 'user-uuid-123',
  title: '有効なタイトル',
  priority: 'invalid',
})).toThrow('不正な優先度です');
```

- **参照したEARS要件**: REQ-001, REQ-002, REQ-004, EDGE-001, EDGE-002
- **参照した設計文書**: dataflow.md「タスク作成フロー」

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- US-001: タスクの作成
- US-002: タスクの更新
- US-004: ステータス変更

### 参照した機能要件

| 要件ID | 内容 | 対応する機能 |
|--------|------|-------------|
| REQ-001 | タスク作成 | `TaskEntity.create()` |
| REQ-002 | タスク更新 | `updateTitle()`, `updateDescription()`, `changePriority()` |
| REQ-004 | ステータス変更 | `changeStatus()` |
| REQ-005 | 優先度設定 | `TaskPriority`値オブジェクト |
| REQ-103 | デフォルト優先度: medium | `create()`のデフォルト値 |
| REQ-104 | デフォルトステータス: not_started | `create()`のデフォルト値 |

### 参照した非機能要件

| 要件ID | 内容 | 対応 |
|--------|------|------|
| NFR-304 | 各層の責務分離 | Domain層として独立 |

### 参照したEdgeケース

| 要件ID | 内容 | 対応 |
|--------|------|------|
| EDGE-001 | 空タイトルエラー | TaskTitle値オブジェクトでバリデーション |
| EDGE-002 | 100文字超エラー | TaskTitle値オブジェクトでバリデーション |

### 参照した設計文書

- **アーキテクチャ**: architecture.md「Domain層」「レイヤ構成」セクション
- **データフロー**: dataflow.md「タスク作成フロー」
- **型定義**: interfaces.ts の TaskEntity, TaskEntityProps, CreateTaskInput
- **データベース**: database-schema.sql の tasksテーブル定義
- **API仕様**: api-endpoints.md（間接的な参照）

---

## 6. 品質判定

### 判定結果: ✅ 高品質

| 基準 | 評価 |
|------|------|
| 要件の曖昧さ | なし - EARS要件、設計文書から明確に定義 |
| 入出力定義 | 完全 - ファクトリメソッド、ゲッター、ビジネスロジック全て定義 |
| 制約条件 | 明確 - 既存値オブジェクトとの整合性含む |
| 実装可能性 | 確実 - 既存値オブジェクト（TaskPriority, TaskStatus, TaskTitle）を活用 |

### 信頼性レベル分布

- 🔵 青信号（確実）: 約85%
- 🟡 黄信号（妥当な推測）: 約15%
- 🔴 赤信号（推測）: 0%

---

## 次のステップ

**次のお勧めステップ: `/tsumiki:tdd-testcases` でテストケースの洗い出しを行います。**
