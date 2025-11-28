# TODO リストアプリ - Phase 4: バックエンドInfrastructure層実装

## 📄 フェーズ情報

- **要件名**: todo-app
- **フェーズ**: Phase 4 / 8
- **期間**: 5日間（40時間）
- **担当**: バックエンド
- **目標**: リポジトリ実装、JWT検証、データベース接続

## 🎯 フェーズ概要

### 目的

Infrastructure層にITaskRepositoryの実装を追加し、Drizzle ORMを使用したデータアクセスを実現。
JWT検証ミドルウェアとRLS設定を実装。

### 成果物

- ✅ PostgreSQLTaskRepository（Drizzle ORM実装）
- ✅ SupabaseJwtVerifier（JWT検証）
- ✅ DatabaseConnection（DB接続管理）
- ✅ RLS設定ヘルパー（app.current_user_id設定）
- ✅ 統合テスト（実際のDBを使用）

### 依存関係

- **前提条件**: Phase 2, 3完了（ITaskRepository, UseCases）
- **このフェーズ完了後に開始可能**: Phase 5（Presentation層）

## 📅 週次計画

### Week 1（5日間）

**Day 1**: TASK-1317 - DatabaseConnection実装
**Day 2**: TASK-1318 - PostgreSQLTaskRepository実装（基本CRUD）
**Day 3**: TASK-1319 - PostgreSQLTaskRepository実装（フィルタ・ソート）
**Day 4**: TASK-1320 - SupabaseJwtVerifier実装
**Day 5**: TASK-1321 - RLS設定ヘルパー実装

## 📋 タスク一覧

### TASK-1317: DatabaseConnection実装

- [x] **タスク完了**（Phase 4着手前の緊急リファクタリングで完了）
- **タスクタイプ**: DIRECT（既存drizzle-clientからの移行）
- **推定工数**: 8時間（実績: 約4時間）
- **依存タスク**: TASK-1316
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/infrastructure/database/DatabaseConnection.ts`

モジュールスコープでの実装（Node.jsモジュールキャッシュによるシングルトン）:
- `db`: Drizzle ORMインスタンス
- `setCurrentUser()`: RLS設定ヘルパー（UUID検証付き）
- `clearCurrentUser()`: RLSクリアヘルパー
- `executeTransaction()`: トランザクションヘルパー
- `closeConnection()`: 接続終了ヘルパー

セキュリティ対策:
- UUID v4形式検証によるSQLインジェクション対策
- トランザクションスコープでのRLS設定

テストケース（全6件合格）:
- dbインスタンス取得
- トランザクション内でのRLS設定
- setCurrentUserヘルパー動作
- clearCurrentUserヘルパー動作
- エラー時の自動ロールバック
- 複数トランザクションの独立実行

#### 完了条件

- [x] DatabaseConnectionが実装される
- [x] テストが全て通る（6/6合格）

#### 参照

- 技術スタック: Drizzle ORM, PostgreSQL

---

### TASK-1318: PostgreSQLTaskRepository実装（基本CRUD）

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1317
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/infrastructure/repositories/PostgreSQLTaskRepository.ts`

```typescript
export class PostgreSQLTaskRepository implements ITaskRepository {
  constructor(private readonly db: ReturnType<typeof drizzle>) {}

  async save(task: TaskEntity): Promise<TaskEntity> {
    const result = await this.db.insert(tasks).values({
      id: task.getId(),
      userId: task.getUserId(),
      title: task.getTitle(),
      description: task.getDescription(),
      priority: task.getPriority(),
      status: task.getStatus(),
      createdAt: task.getCreatedAt(),
      updatedAt: task.getUpdatedAt(),
    }).returning();

    return this.toDomain(result[0]);
  }

  async findById(userId: string, taskId: string): Promise<TaskEntity | null> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async update(userId: string, taskId: string, input: UpdateTaskInput): Promise<TaskEntity | null> {
    const result = await this.db
      .update(tasks)
      .set(input)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async delete(userId: string, taskId: string): Promise<boolean> {
    const result = await this.db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    return result.rowCount > 0;
  }

  private toDomain(row: typeof tasks.$inferSelect): TaskEntity {
    return TaskEntity.reconstruct({
      id: row.id,
      userId: row.userId,
      title: TaskTitle.create(row.title),
      description: row.description,
      priority: TaskPriority.create(row.priority),
      status: TaskStatus.create(row.status),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
```

テストケース:
- 正常系: タスク作成・取得・更新・削除
- 異常系: タスクが見つからない

#### 完了条件

- [x] PostgreSQLTaskRepositoryが実装される（基本CRUD）
- [x] 統合テストが通る
- [x] テストカバレッジ80%以上

#### 参照

- 要件: REQ-001, REQ-002, REQ-003

---

### TASK-1319: PostgreSQLTaskRepository実装（フィルタ・ソート）

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間（実績: 約4時間）
- **依存タスク**: TASK-1318
- **要件名**: todo-app

#### 実装詳細

```typescript
async findByUserId(userId: string, filters: TaskFilters, sort: TaskSortBy): Promise<TaskEntity[]> {
  const conditions = [eq(tasks.userId, userId)];

  // 優先度フィルタ適用
  if (filters.priority) {
    conditions.push(eq(tasks.priority, filters.priority));
  }

  // ステータスフィルタ適用（複数選択、空配列の場合は無視）
  if (filters.status && filters.status.length > 0) {
    conditions.push(inArray(tasks.status, filters.status));
  }

  let query: any = this.db
    .select()
    .from(tasks)
    .where(and(...conditions));

  // ソート適用
  switch (sort) {
    case 'created_at_desc':
      query = query.orderBy(desc(tasks.createdAt));
      break;
    case 'created_at_asc':
      query = query.orderBy(asc(tasks.createdAt));
      break;
    case 'priority_desc':
      query = query.orderBy(
        sql`CASE ${tasks.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`,
        desc(tasks.createdAt)
      );
      break;
  }

  const results = await query;
  return results.map((row: typeof tasks.$inferSelect) => this.toDomain(row));
}
```

実装のポイント:
- Drizzle ORMの `and()` を使用して複数の条件を組み合わせ
- 優先度フィルタ: `filters.priority` が指定されている場合のみ適用
- ステータスフィルタ: `filters.status` が配列で、かつ空でない場合のみ `inArray` で適用
- ソート: `created_at_desc`, `created_at_asc`, `priority_desc` に対応

テストケース:
- 正常系: 優先度フィルタ (high, medium)
- 正常系: ステータスフィルタ（単一、複数、空配列）
- 正常系: 複合フィルタ（優先度 + ステータス）
- 正常系: 作成日時ソート (desc, asc)
- 正常系: 優先度ソート (priority_desc)
- 正常系: フィルタなし
- 正常系: RLS検証（他ユーザーのタスクは返却されない）

#### 完了条件

- [x] フィルタ・ソートが実装される
- [x] 統合テストが通る（20/20 pass）
- [x] テストカバレッジ80%以上

#### 参照

- 要件: REQ-201, REQ-202, REQ-203

---

### TASK-1320: SupabaseJwtVerifier実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1319
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/infrastructure/auth/SupabaseJwtVerifier.ts`

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

export class SupabaseJwtVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const jwksUrl = `${supabaseUrl}/auth/v1/jwks`;
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async verify(token: string): Promise<{ userId: string }> {
    const { payload } = await jwtVerify(token, this.jwks);

    if (!payload.sub) {
      throw new Error('JWT検証失敗: subクレームが存在しません');
    }

    return { userId: payload.sub };
  }
}
```

テストケース:
- 正常系: 有効なJWTが検証される
- 異常系: 無効なJWT
- 異常系: subクレームなし

#### 完了条件

- [x] SupabaseJwtVerifierが実装される
- [x] テストカバレッジ80%以上（20 pass, 1 skip, 0 fail）

#### 参照

- 要件: REQ-402, NFR-103
- 技術スタック: jose 6.1.0

---

### TASK-1321: RLS設定ヘルパー実装

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1320
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/server/src/infrastructure/database/RlsHelper.ts`

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

テストケース:
- 正常系: RLS設定が適用される
- 正常系: RLS解除が動作する
- 統合テスト: 他ユーザーのタスクにアクセス不可

#### 完了条件

- [ ] RlsHelperが実装される
- [ ] 統合テストが通る
- [ ] テストカバレッジ80%以上

#### 参照

- 要件: REQ-403, NFR-102

---

## 🎉 フェーズ完了チェックリスト

### リポジトリ実装

- [x] PostgreSQLTaskRepository実装完了
- [x] 基本CRUDが動作する（TASK-1318）
- [x] フィルタ・ソートが動作する（TASK-1319）

### 認証・セキュリティ

- [x] SupabaseJwtVerifier実装完了（TASK-1320）
- [ ] RlsHelper実装完了
- [x] JWT検証が動作する（20テストケース合格）
- [ ] RLS設定が動作する

### テスト

- [x] 統合テストが通る（606 pass, 1 skip, 0 fail）
- [x] テストカバレッジ80%以上
- [x] Biomeチェック合格
- [x] 型チェック合格

---

## 📚 参考資料

- [Drizzle ORM公式ドキュメント](https://orm.drizzle.team/)
- [Supabase Auth公式ドキュメント](https://supabase.com/docs/guides/auth)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

## 📝 メモ

### 実装時の注意事項

1. **RLS設定**: 必ずトランザクション内で実行
2. **JWT検証**: JWKS認証を使用（JWT Secret非推奨）
3. **統合テスト**: 実際のDBを使用、テスト後にクリーンアップ
