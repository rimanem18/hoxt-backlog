# TASK-1321: RlsHelper実装 - TDD要件定義書

## 📄 ドキュメント情報

- **作成日**: 2025-11-29
- **タスクID**: TASK-1321
- **要件名**: todo-app
- **フェーズ**: Phase 4 / 8
- **機能名**: RlsHelper（Row-Level Security設定ヘルパー）

## 1. 機能の概要

### 🔵 青信号: EARS要件定義書・設計文書ベース

**何をする機能か**:
- PostgreSQLのセッションパラメータ `app.current_user_id` を設定するヘルパークラス
- トランザクションスコープ内でRLS（Row-Level Security）ポリシーを適用
- UUID v4形式の検証によるSQLインジェクション対策
- トランザクション終了時の自動クリーンアップ機能

**参照したEARS要件**:
- REQ-403: ユーザー認証とセッション管理
- NFR-102: データアクセス制御（RLS適用）

**参照した設計文書**:
- [database-schema.sql:159-177](docs/design/todo-app/database-schema.sql) - RLSポリシー定義
- [DatabaseConnection.ts:40-68](app/server/src/infrastructure/database/DatabaseConnection.ts) - 既存RLS実装

**どのような問題を解決するか**:
- ユーザーごとのデータアクセス制御を自動化
- SQLインジェクション攻撃の防止（UUID検証）
- トランザクションスコープでの安全なRLS設定
- セッションパラメータの確実なクリーンアップ

**想定されるユーザー**:
- Infrastructure層のリポジトリ実装（PostgreSQLTaskRepository等）
- Application層のUseCase（トランザクション内でのRLS設定）
- Presentation層の認証ミドルウェア（JWT検証後のユーザーID設定）

**システム内での位置づけ**:
- Infrastructure層 - データベースサブシステム
- DatabaseConnectionモジュールの一部として実装済み
- 依存: Drizzle ORM、postgres
- 依存元: PostgreSQLTaskRepository、各UseCase

## 2. 入力・出力の仕様

### 🟡 黄信号: 既存実装から妥当な推測

**参照したEARS要件**: REQ-403, NFR-102
**参照した設計文書**: [DatabaseConnection.ts:40-68](app/server/src/infrastructure/database/DatabaseConnection.ts)

### setCurrentUser メソッド（既存実装）

**実装場所**: `app/server/src/infrastructure/database/DatabaseConnection.ts:49-59`

**入力パラメータ**:
| パラメータ | 型 | 説明 | 制約 |
|-----------|---|------|------|
| userId | string | 設定するユーザーID | UUID v4形式（`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`） |

**出力値**:
- `Promise<void>`（正常終了時）
- エラー時: `Error('Invalid UUID format for user ID')`

**動作**:
1. UUID v4形式の検証（正規表現）
2. 検証失敗時は例外をスロー
3. `SET LOCAL app.current_user_id = '{userId}'` を実行

**SQLインジェクション対策**:
- UUID検証により、不正な文字列の混入を防止
- `sql.raw`使用前に必ず検証を実施

### clearCurrentUser メソッド（既存実装）

**実装場所**: `app/server/src/infrastructure/database/DatabaseConnection.ts:67-69`

**入力パラメータ**: なし

**出力値**: `Promise<void>`

**動作**:
- `SET LOCAL app.current_user_id = ''` を実行
- トランザクション終了時にfinallyブロックで呼び出し

### データフロー

```
1. JWT検証（SupabaseJwtVerifier）
   ↓
2. userId抽出
   ↓
3. executeTransaction開始
   ↓
4. setCurrentUser(userId) ← UUID検証
   ↓
5. RLSポリシー自動適用
   ↓
6. リポジトリ操作（SELECT/INSERT/UPDATE/DELETE）
   ↓
7. トランザクション終了
   ↓
8. 自動ロールバック（エラー時）またはコミット
   ↓
9. SET LOCALはトランザクション終了で自動クリア
```

## 3. 制約条件

### 🔵 青信号: EARS非機能要件・アーキテクチャ設計ベース

**参照したEARS要件**:
- REQ-403: ユーザー認証とセッション管理
- NFR-102: データアクセス制御（RLS）
- NFR-103: セキュリティ要件

**参照した設計文書**:
- [database-schema.sql:159-177](docs/design/todo-app/database-schema.sql) - RLSポリシー
- [DatabaseConnection.ts](app/server/src/infrastructure/database/DatabaseConnection.ts) - 既存実装

### セキュリティ要件

- **必須**: UUID v4形式の検証（SQLインジェクション対策）
- **必須**: トランザクション内でのみ使用（SET LOCALの仕様）
- **必須**: RLSポリシーと連携（`USING (user_id = current_setting('app.current_user_id')::uuid)`）
- **推奨**: finallyブロックでのクリーンアップ（セッション汚染防止）

### PostgreSQL制約

- **必須**: `SET LOCAL` はトランザクション内でのみ有効
- **必須**: トランザクション終了で自動クリア
- **必須**: 並列トランザクションで独立性を保証

### アーキテクチャ制約

- **必須**: Infrastructure層のDatabaseConnectionモジュール内に配置
- **禁止**: Domain層への依存
- **必須**: Drizzle ORMのdb instanceを使用

### パフォーマンス要件

- **SET LOCAL実行時間**: 1ms以内（PostgreSQL内部処理）
- **UUID検証**: 正規表現による高速検証

### データベーススキーマ制約

- **必須**: RLSポリシー有効化（`ALTER TABLE tasks ENABLE ROW LEVEL SECURITY`）
- **必須**: RLSポリシー定義済み（`CREATE POLICY "Users can only access their own tasks"`）

## 4. 想定される使用例

### 🔵 青信号: 既存実装・テストコードベース

**参照したEARS要件**: REQ-403, NFR-102
**参照した設計文書**: [DatabaseConnection.test.ts](app/server/src/infrastructure/database/__tests__/DatabaseConnection.test.ts)

### 基本的な使用パターン（既存実装）

```typescript
import { executeTransaction, setCurrentUser } from '@/infrastructure/database/DatabaseConnection';

// Given: 認証済みユーザーID
const userId = '123e4567-e89b-12d3-a456-426614174000';

// When: トランザクション内でRLS設定
await executeTransaction(async (tx) => {
  await setCurrentUser(userId);

  // Then: RLSポリシーが適用されたクエリ実行
  const tasks = await tx.select().from(tasksTable);
  // userId に一致するタスクのみ取得される
});
```

### エッジケース1: 無効なUUID形式

```typescript
// Given: UUID v4ではない形式
const invalidUserId = 'not-a-valid-uuid';

// When: setCurrentUserを実行
// Then: 例外がスローされる
await expect(
  executeTransaction(async (tx) => {
    await setCurrentUser(invalidUserId);
  })
).rejects.toThrow('Invalid UUID format for user ID');
```

### エッジケース2: SQLインジェクション試行

```typescript
// Given: SQLインジェクション試行
const maliciousInput = "'; DROP TABLE tasks; --";

// When: setCurrentUserを実行
// Then: UUID検証で拒否される
await expect(
  executeTransaction(async (tx) => {
    await setCurrentUser(maliciousInput);
  })
).rejects.toThrow('Invalid UUID format for user ID');
```

### エッジケース3: トランザクション外での使用（禁止パターン）

```typescript
// ❌ 非推奨: トランザクション外でのsetCurrentUser
// SET LOCALはトランザクション内でのみ有効

// Given: トランザクション外での実行
const userId = '123e4567-e89b-12d3-a456-426614174000';

// When: トランザクション外でsetCurrentUserを実行
await setCurrentUser(userId);

// Then: 次のクエリではRLSが適用されない
// （SET LOCALはトランザクションスコープのため）
const tasks = await db.select().from(tasksTable);
// ⚠️ 全ユーザーのタスクが取得される（RLS無効）
```

### エッジケース4: 複数トランザクションの独立性

```typescript
// Given: 2つの独立したトランザクション
const userId1 = '123e4567-e89b-12d3-a456-426614174000';
const userId2 = '223e4567-e89b-12d3-a456-426614174001';

// When: 並列実行
const [tasks1, tasks2] = await Promise.all([
  executeTransaction(async (tx) => {
    await setCurrentUser(userId1);
    return await tx.select().from(tasksTable);
  }),
  executeTransaction(async (tx) => {
    await setCurrentUser(userId2);
    return await tx.select().from(tasksTable);
  })
]);

// Then: それぞれのトランザクションで正しいユーザーIDが適用される
// tasks1: userId1のタスクのみ
// tasks2: userId2のタスクのみ
```

### エラーケース: トランザクション内エラー時の自動ロールバック

```typescript
// Given: トランザクション内でエラー発生
const userId = '123e4567-e89b-12d3-a456-426614174000';

// When: エラーが発生
await expect(
  executeTransaction(async (tx) => {
    await setCurrentUser(userId);

    // 意図的にエラーを発生
    throw new Error('Intentional error for testing');
  })
).rejects.toThrow('Intentional error for testing');

// Then: トランザクションは自動ロールバック
// SET LOCALも自動的にクリアされる
```

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

なし（認証・セキュリティ機能は全体の共通基盤）

### 参照した機能要件

- **REQ-403**: ユーザー認証とセッション管理
  - JWT検証後のユーザーID設定
  - RLSポリシー適用

### 参照した非機能要件

- **NFR-102**: データアクセス制御（RLS）
  - ユーザーは自分のタスクのみアクセス可能
  - セッションパラメータによる自動フィルタ適用

- **NFR-103**: セキュリティ要件
  - SQLインジェクション対策（UUID検証）
  - トランザクションスコープでの安全な設定

### 参照したEdgeケース

- **EDGE-403**: 無効なUUID形式（検証エラー）
- **EDGE-404**: SQLインジェクション試行（拒否）
- **EDGE-405**: トランザクション外での誤用（RLS無効化）

### 参照した受け入れ基準

なし（既存実装の確認のみ）

### 参照した設計文書

#### アーキテクチャ

- [database-schema.sql:159-177](docs/design/todo-app/database-schema.sql) - RLSポリシー定義

#### データベーススキーマ

- [database-schema.sql:164](docs/design/todo-app/database-schema.sql) - RLS有効化
- [database-schema.sql:169-172](docs/design/todo-app/database-schema.sql) - RLSポリシー作成

#### 既存実装

- [DatabaseConnection.ts:40-68](app/server/src/infrastructure/database/DatabaseConnection.ts) - setCurrentUser, clearCurrentUser実装
- [DatabaseConnection.test.ts](app/server/src/infrastructure/database/__tests__/DatabaseConnection.test.ts) - 既存テストケース

## 6. 既存実装の状況

### 🔵 青信号: 既存コードベース確認済み

**既存ファイル**:
- `app/server/src/infrastructure/database/DatabaseConnection.ts` - **実装済み**
  - `setCurrentUser(userId: string): Promise<void>` (L49-59)
  - `clearCurrentUser(): Promise<void>` (L67-69)

**実装済み機能**:
- ✅ UUID v4形式検証（正規表現）
- ✅ `SET LOCAL app.current_user_id = '{userId}'` 実行
- ✅ `SET LOCAL app.current_user_id = ''` 実行（クリア）
- ✅ SQLインジェクション対策（UUID検証）

**テスト済みケース** (`DatabaseConnection.test.ts`):
- ✅ トランザクション内でのRLS設定（L14-37）
- ✅ setCurrentUserヘルパー動作（L39-56）
- ✅ clearCurrentUserヘルパー動作（L58-76）
- ✅ 複数トランザクションの独立実行（L91-120）
- ⚠️ UUID検証エラーのテストなし
- ⚠️ SQLインジェクション試行のテストなし
- ⚠️ トランザクション外での誤用テストなし

**TASK-1321の実装タスク**:
- **既存実装の確認**: setCurrentUser, clearCurrentUserは実装済み
- **独立したRlsHelperクラスの作成検討**: 現在はDatabaseConnectionモジュールの関数として実装
- **不足テストケースの洗い出し**: 以下のケースが不足
  - UUID検証エラー（無効な形式）
  - SQLインジェクション試行（悪意ある入力）
  - トランザクション外での誤用（警告テスト）
  - 空文字列/null/undefined入力
  - 各種エラーカテゴリの網羅的テスト
- **テストカバレッジ80%以上の達成**

## 7. 実装方針の検討

### 🟡 黄信号: タスクファイルとの整合性を考慮した推測

**タスクファイルの指示** (docs/tasks/todo-app-phase4.md:315-329):
```typescript
export class RlsHelper {
  public static async setCurrentUser(
    db: ReturnType<typeof drizzle>,
    userId: string
  ): Promise<void> {
    await db.execute(sql.raw(`SET LOCAL app.current_user_id = '${userId}'`));
  }

  public static async clearCurrentUser(db: ReturnType<typeof drizzle>): Promise<void> {
    await db.execute(sql.raw(`SET LOCAL app.current_user_id = ''`));
  }
}
```

**既存実装** (DatabaseConnection.ts):
- モジュールスコープの関数として実装
- dbインスタンスはモジュール内で共有

**選択肢**:

#### 案A: タスクファイル通りのクラス実装（新規作成）
- ✅ タスク指示に忠実
- ✅ 静的メソッドで依存性注入対応
- ❌ 既存の実装と重複（setCurrentUser, clearCurrentUser）
- ❌ 2つの実装が併存する

#### 案B: 既存実装の拡張（推奨）
- ✅ 既存のsetCurrentUser/clearCurrentUserを活用
- ✅ UUID検証が既に実装済み
- ✅ テストも一部済み
- ❌ タスクファイルの形式とは異なる

#### 案C: ラッパークラス作成
- ✅ タスクファイルの形式に準拠
- ✅ 既存実装を内部で呼び出し
- ⚠️ 薄いラッパーになる可能性

**推奨**: **案B（既存実装の拡張）**

**理由**:
1. 既存のsetCurrentUser/clearCurrentUserが実装済み
2. UUID検証などのセキュリティ対策も実装済み
3. 不足しているのはテストケースのみ
4. TASK-1321のゴールは「RLS設定ヘルパー実装」であり、既に実装済みのためテスト拡充が主タスク
5. 新規クラス作成は重複実装になる

**ユーザーへの確認事項**:
- タスクファイルでは新規クラス `RlsHelper` の作成を想定しているが、既存実装（DatabaseConnection.ts）で同等機能が実装済み
- 既存実装を活用してテストケースを拡充する方針でよろしいでしょうか？
- それとも、タスクファイル通りに新規クラスを作成しますか？

## 8. 品質判定

### ⚠️ 要改善（実装方針の確認が必要）

- ⚠️ 要件の曖昧さ: 既存実装との関係が不明確
  - タスクファイルでは新規クラス作成を想定
  - 既存実装で同等機能が実装済み
  - どちらを採用すべきか確認が必要
- ✅ 入出力定義: 完全（既存実装から明確）
- ✅ 制約条件: 明確（RLS、UUID検証、トランザクションスコープ）
- ✅ 実装可能性: 確実（既存実装済み）

**判定理由**:
- 既存実装が存在し、基本的な機能は済んでいる
- タスクファイルの指示と既存実装の整合性を確認する必要がある
- 不足しているのはテストケースとユーザー意図の確認

## 9. 次のステップ

**ユーザーへの質問**:

次のいずれかの方針で進めます：

### 案A: 既存実装を活用（推奨）
- 既存の `setCurrentUser`, `clearCurrentUser` を使用
- 不足しているテストケースを追加
- テストカバレッジ80%以上を達成

### 案B: 新規クラス作成（タスクファイル通り）
- `RlsHelper` クラスを新規作成
- 既存実装は残したまま並行運用
- タスクファイルの形式に準拠

どちらの方針で進めますか？

次のお勧めステップ:
- **方針確認後**: `/tsumiki:tdd-testcases` でテストケースの洗い出しを行います。
