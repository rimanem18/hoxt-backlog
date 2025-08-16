# TASK-103: PostgreSQLリポジトリ実装 - TDD要件定義

作成日: 2025-08-16  
更新日: 2025-08-16

## 1. 概要

### 1.1 実装目的
PostgreSQLを使用してIUserRepositoryインターフェースを実装し、ユーザーデータの永続化層を提供する。
DDD + クリーンアーキテクチャに基づき、ドメイン層からインフラストラクチャ層への依存性逆転を実現する。

### 1.2 実装スコープ
- `PostgreSQLUserRepository` クラス実装
- データベース接続管理クラス実装  
- 環境設定管理クラス実装
- エラーハンドリング機構
- 統合テストスイート

## 2. 技術要件

### 2.1 依存関係
- **インターフェース**: `IUserRepository` (app/server/src/domain/repositories/)
- **エンティティ**: `UserEntity` (app/server/src/domain/user/)
- **値オブジェクト**: `CreateUserInput`, `UpdateUserInput` (app/server/src/domain/user/valueobjects/)
- **ドメインエラー**: `UserNotFoundError` (app/server/src/domain/user/errors/)
- **データベース**: PostgreSQL 14+ with UUID extension
- **スキーマ**: `${DB_TABLE_PREFIX}users` テーブル

### 2.2 環境変数
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_TABLE_PREFIX=your_table_prefix
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### 2.3 データベーススキーマ
```sql
CREATE TABLE ${DB_TABLE_PREFIX}users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) NOT NULL,
    provider auth_provider_type NOT NULL,
    email VARCHAR(320) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_external_id_provider UNIQUE (external_id, provider)
);
```

## 3. 実装要件

### 3.1 ファイル構成
```
app/server/src/infrastructure/
├── database/
│   ├── DatabaseConnection.ts        # DB接続管理
│   └── PostgreSQLUserRepository.ts  # リポジトリ実装
└── config/
    └── EnvironmentConfig.ts         # 環境設定管理
```

### 3.2 DatabaseConnection.ts 要件

#### 3.2.1 責務
- PostgreSQL接続の管理
- 接続プール制御
- トランザクション管理
- 接続エラーハンドリング

#### 3.2.2 公開メソッド
```typescript
class DatabaseConnection {
  // 接続取得
  static async getConnection(): Promise<PoolClient>
  
  // トランザクション実行
  static async executeTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T>
  
  // 接続確認
  static async healthCheck(): Promise<boolean>
  
  // 接続終了
  static async close(): Promise<void>
}
```

### 3.3 EnvironmentConfig.ts 要件

#### 3.3.1 責務
- 環境変数の検証・変換
- 型安全な設定値提供
- 設定エラーハンドリング

#### 3.3.2 公開メソッド
```typescript
class EnvironmentConfig {
  // データベース設定取得
  static getDatabaseConfig(): DatabaseConfig
  
  // 設定検証
  static validateConfig(): void
}

interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  tablePrefix: string
  url: string
}
```

### 3.4 PostgreSQLUserRepository.ts 要件

#### 3.4.1 責務
- IUserRepositoryインターフェースの実装
- SQL クエリの実行
- データベースエラーのドメインエラーへの変換
- クエリパフォーマンスの最適化

#### 3.4.2 実装メソッド

##### findByExternalId(externalId: string, provider: AuthProvider)
```typescript
/**
 * 外部IDとプロバイダーでユーザーを検索
 * 
 * JWT認証時の高速検索用。複合インデックス使用。
 * 
 * @param externalId - 外部プロバイダーでのユーザーID
 * @param provider - 認証プロバイダー種別
 * @returns ユーザーエンティティまたはnull
 */
async findByExternalId(
  externalId: string, 
  provider: AuthProvider
): Promise<User | null>
```

**SQL例**:
```sql
SELECT * FROM ${tablePrefix}users 
WHERE external_id = $1 AND provider = $2
```

##### findById(id: string)
```typescript
/**
 * ユーザーIDでユーザーを検索
 * 
 * @param id - ユーザー固有ID（UUID v4）
 * @returns ユーザーエンティティまたはnull
 */
async findById(id: string): Promise<User | null>
```

**SQL例**:
```sql
SELECT * FROM ${tablePrefix}users WHERE id = $1
```

##### findByEmail(email: string)
```typescript
/**
 * メールアドレスでユーザーを検索
 * 
 * @param email - メールアドレス
 * @returns ユーザーエンティティまたはnull
 */
async findByEmail(email: string): Promise<User | null>
```

**SQL例**:
```sql
SELECT * FROM ${tablePrefix}users WHERE email = $1
```

##### create(input: CreateUserInput)
```typescript
/**
 * 新規ユーザー作成
 * 
 * JITプロビジョニング時に使用。
 * トランザクション内での実行推奨。
 * 
 * @param input - ユーザー作成時の値オブジェクト
 * @returns 作成されたユーザーエンティティ
 * @throws 一意制約違反等のデータベースエラー
 */
async create(input: CreateUserInput): Promise<User>
```

**SQL例**:
```sql
INSERT INTO ${tablePrefix}users (
  external_id, provider, email, name, avatar_url, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *
```

##### update(id: string, input: UpdateUserInput)
```typescript
/**
 * ユーザー情報更新
 * 
 * 変更されたフィールドのみ更新する差分更新。
 * updated_atは自動更新（トリガー使用）。
 * 
 * @param id - 更新対象のユーザーID
 * @param input - ユーザー更新時の値オブジェクト
 * @returns 更新されたユーザーエンティティ
 * @throws UserNotFoundError - ユーザーが存在しない場合
 */
async update(id: string, input: UpdateUserInput): Promise<User>
```

**SQL例**:
```sql
UPDATE ${tablePrefix}users 
SET name = COALESCE($2, name),
    avatar_url = COALESCE($3, avatar_url),
    last_login_at = COALESCE($4, last_login_at)
WHERE id = $1
RETURNING *
```

##### delete(id: string)
```typescript
/**
 * ユーザー削除
 * 
 * 物理削除を実行。将来的には論理削除への変更を検討。
 * 
 * @param id - 削除対象のユーザーID
 * @throws UserNotFoundError - ユーザーが存在しない場合
 */
async delete(id: string): Promise<void>
```

**SQL例**:
```sql
DELETE FROM ${tablePrefix}users WHERE id = $1
```

## 4. エラーハンドリング要件

### 4.1 データベースエラーの変換

#### 4.1.1 制約違反エラー
```typescript
// 一意制約違反
if (error.code === '23505') {
  if (error.constraint === 'unique_external_id_provider') {
    throw new Error('外部IDとプロバイダーの組み合わせが既に存在します')
  }
  if (error.constraint === 'users_email_key') {
    throw new Error('メールアドレスが既に登録されています')
  }
}
```

#### 4.1.2 接続エラー
```typescript
// 接続エラー
if (error.code === 'ECONNREFUSED') {
  throw new Error('データベースへの接続に失敗しました')
}
```

#### 4.1.3 ユーザー存在エラー
```typescript
// ユーザーが見つからない場合
if (!user) {
  throw new UserNotFoundError(id)
}
```

### 4.2 ログ出力要件
- データベースエラーの詳細ログ
- SQL実行時間の測定
- スロークエリの警告
- 接続プール状態の監視

## 5. パフォーマンス要件

### 5.1 クエリパフォーマンス
- **findByExternalId**: 10ms以内（複合インデックス使用）
- **findById**: 5ms以内（主キー検索）
- **findByEmail**: 15ms以内（単一インデックス使用）
- **create**: 20ms以内
- **update**: 15ms以内
- **delete**: 10ms以内

### 5.2 接続プール設定
```typescript
const poolConfig = {
  max: 20,              // 最大接続数
  idleTimeoutMillis: 30000,  // アイドルタイムアウト
  connectionTimeoutMillis: 2000,  // 接続タイムアウト
}
```

## 6. セキュリティ要件

### 6.1 SQLインジェクション対策
- 全クエリでプリペアードステートメント使用
- パラメータ化クエリの強制
- 動的SQL生成の禁止

### 6.2 接続セキュリティ
- SSL/TLS接続の強制
- 最小権限の原則適用
- 接続文字列の環境変数管理

## 7. テスト要件

### 7.1 統合テスト

#### 7.1.1 データベース接続テスト
- 正常な接続確立
- 接続失敗時のエラーハンドリング
- 接続プールの動作確認

#### 7.1.2 CRUD操作テスト
- **作成**: 正常なユーザー作成、制約違反エラー
- **読取**: 存在するユーザー取得、存在しないユーザーでのnull返却
- **更新**: 既存ユーザー更新、存在しないユーザーでのエラー
- **削除**: 既存ユーザー削除、存在しないユーザーでのエラー

#### 7.1.3 検索メソッドテスト
- **findByExternalId**: 複合キー検索の正確性
- **findById**: UUID検索の正確性  
- **findByEmail**: メールアドレス検索の正確性

#### 7.1.4 エラーハンドリングテスト
- 制約違反エラーの適切な変換
- データベース接続エラーの処理
- 存在しないレコードでの適切なレスポンス

#### 7.1.5 パフォーマンステスト
- 各メソッドの実行時間測定
- 大量データでの性能確認
- 同時接続での接続プール動作

### 7.2 テスト環境設定
- テスト専用データベース使用
- テスト前後のデータクリーンアップ
- トランザクションロールバック利用

## 8. 実装指針

### 8.1 コード品質
- TypeScript strict mode 準拠
- ESLint/Prettier ルール適用
- 適切なJSDoc コメント
- エラーハンドリングの網羅

### 8.2 保守性
- 単一責任の原則遵守
- 依存性注入パターン使用
- 設定の外部化
- ログ出力の充実

### 8.3 拡張性
- 新しい検索メソッドの追加容易性
- 複数データベース対応への準備
- 非同期処理の最適化
- キャッシュ層追加への対応

## 9. 受け入れ基準

### 9.1 機能要件
- [ ] IUserRepositoryの全メソッドが実装されている
- [ ] 全ての統合テストが通過する
- [ ] エラーハンドリングが適切に動作する
- [ ] パフォーマンス要件を満たす

### 9.2 非機能要件
- [ ] TypeScript型チェックが通過する
- [ ] テストカバレッジが80%以上
- [ ] セキュリティ要件を満たす
- [ ] ドキュメントが完備されている

### 9.3 コード品質
- [ ] SOLIDの原則に準拠している
- [ ] 適切なエラーハンドリングが実装されている
- [ ] ログ出力が適切に実装されている
- [ ] コードレビューでの指摘事項がない

## 10. リスク・制約事項

### 10.1 技術的リスク
- データベース接続の安定性
- SQLクエリのパフォーマンス
- 大量データでのメモリ使用量

### 10.2 制約事項
- PostgreSQL 14+ 必須
- Node.js Bun環境での動作
- Docker環境での開発・テスト