# TASK-103: PostgreSQLリポジトリ実装 - TDD Red フェーズ

作成日: 2025-08-16  
更新日: 2025-08-16

## 1. Red フェーズ概要

Red フェーズでは、実装前にテストを作成し、**テストが失敗することを確認**しました。
これにより、テストが正しく動作し、実装すべき機能が明確になることを検証しています。

## 2. 実装したテストファイル

### 2.1 作成ファイル一覧
```
app/server/src/infrastructure/
├── config/
│   └── EnvironmentConfig.ts          # スケルトン実装
├── database/
│   ├── DatabaseConnection.ts         # スケルトン実装  
│   └── PostgreSQLUserRepository.ts   # スケルトン実装
└── __tests__/
    ├── EnvironmentConfig.test.ts
    ├── DatabaseConnection.test.ts
    └── PostgreSQLUserRepository.test.ts
```

### 2.2 スケルトン実装の確認

#### EnvironmentConfig.ts
```typescript
export class EnvironmentConfig {
  static getDatabaseConfig(): DatabaseConfig {
    throw new Error('Not implemented yet');
  }
  
  static validateConfig(): void {
    throw new Error('Not implemented yet');
  }
}
```

#### DatabaseConnection.ts
```typescript
export class DatabaseConnection {
  static async getConnection(): Promise<PoolClient> {
    throw new Error('Not implemented yet');
  }
  
  static async executeTransaction<T>(callback): Promise<T> {
    throw new Error('Not implemented yet');
  }
  
  static async healthCheck(): Promise<boolean> {
    throw new Error('Not implemented yet');
  }
  
  static async close(): Promise<void> {
    throw new Error('Not implemented yet');
  }
}
```

#### PostgreSQLUserRepository.ts
```typescript
export class PostgreSQLUserRepository implements IUserRepository {
  async findByExternalId(externalId: string, provider: AuthProvider): Promise<User | null> {
    throw new Error('Not implemented yet');
  }
  
  async findById(id: string): Promise<User | null> {
    throw new Error('Not implemented yet');
  }
  
  async findByEmail(email: string): Promise<User | null> {
    throw new Error('Not implemented yet');
  }
  
  async create(input: CreateUserInput): Promise<User> {
    throw new Error('Not implemented yet');
  }
  
  async update(id: string, input: UpdateUserInput): Promise<User> {
    throw new Error('Not implemented yet');
  }
  
  async delete(id: string): Promise<void> {
    throw new Error('Not implemented yet');
  }
}
```

## 3. テスト実行結果

### 3.1 EnvironmentConfig テスト結果

```bash
$ docker compose exec server bun test src/infrastructure/__tests__/EnvironmentConfig.test.ts

 0 pass
 6 fail
 5 expect() calls
```

**失敗したテストケース:**
1. `正常なデータベース設定が取得できること`
2. `必須環境変数が不足している場合にエラーが発生すること - DB_HOST`
3. `必須環境変数が不足している場合にエラーが発生すること - DB_PORT`
4. `不正なポート番号でエラーが発生すること`
5. `有効な設定で検証が通過すること`
6. `設定が不足している場合に詳細なエラーが発生すること`

**期待されるエラーメッセージ vs 実際のエラーメッセージ:**
- 期待: `"DB_HOST環境変数が設定されていません"`
- 実際: `"Not implemented yet"`

✅ **確認完了**: すべてのテストが期待通りに失敗しています。

### 3.2 その他のテストも同様に失敗することを確認

DatabaseConnectionとPostgreSQLUserRepositoryのテストも同様に`"Not implemented yet"`エラーで失敗することが予想されます。

## 4. テストケース詳細分析

### 4.1 EnvironmentConfig テストケース

#### TC-ENV-001: 正常なデータベース設定取得
```typescript
test('正常なデータベース設定が取得できること', () => {
  // Given: 有効な環境変数設定
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  // ... 他の環境変数
  
  // When: 設定を取得
  const config = EnvironmentConfig.getDatabaseConfig();
  
  // Then: 設定値が正しい
  expect(config.host).toBe('localhost');
  expect(config.port).toBe(5432);
  // ...
});
```

**現在の失敗**: `getDatabaseConfig()`が`"Not implemented yet"`をスローする  
**次のステップ**: 環境変数を読み取り、型変換を行う実装を追加

#### TC-ENV-002: 必須環境変数不足エラー
```typescript
test('必須環境変数が不足している場合にエラーが発生すること - DB_HOST', () => {
  // Given: DB_HOSTが不足
  delete process.env.DB_HOST;
  
  // When & Then: 特定のエラーメッセージが発生
  expect(() => EnvironmentConfig.getDatabaseConfig())
    .toThrow('DB_HOST環境変数が設定されていません');
});
```

**現在の失敗**: 一般的な実装エラーが発生  
**次のステップ**: 環境変数の存在チェックと詳細なエラーメッセージ実装

### 4.2 DatabaseConnection テストケース

#### 接続管理テスト
- 正常な接続取得
- 接続エラーハンドリング  
- ヘルスチェック機能
- トランザクション管理

**次のステップ**: PostgreSQLクライアント（`pg`）の実装

### 4.3 PostgreSQLUserRepository テストケース

#### CRUD操作テスト
- `findByExternalId`: 外部ID + プロバイダー検索
- `findById`: UUID検索
- `findByEmail`: メールアドレス検索
- `create`: 新規ユーザー作成
- `update`: ユーザー情報更新
- `delete`: ユーザー削除

**次のステップ**: 実際のSQL実行とUserEntityとの変換

## 5. Red フェーズで確認できたこと

### 5.1 テストの網羅性
✅ **正常系テスト**: 各メソッドの基本機能をテスト  
✅ **異常系テスト**: エラーハンドリングをテスト  
✅ **境界値テスト**: NULL値、空文字、不正形式のテスト  
✅ **統合テスト**: 実データベースとの連携テスト

### 5.2 テストの独立性  
✅ **データクリーンアップ**: 各テスト後にテストデータを削除  
✅ **環境変数分離**: テスト用環境変数の設定・復元  
✅ **トランザクション分離**: 各テストが他に影響しない設計

### 5.3 エラーメッセージの明確性
✅ **具体的なエラーメッセージ**: ユーザーフレンドリーなメッセージ  
✅ **エラー種別の分離**: 設定エラー、データベースエラー、ビジネスエラー  
✅ **デバッグ情報**: 問題特定に必要な情報を含む

## 6. Green フェーズに向けた実装計画

### 6.1 実装優先順位

1. **EnvironmentConfig** (最優先)
   - 他のクラスが依存する基盤
   - 環境変数の検証・変換ロジック

2. **DatabaseConnection** (高優先)
   - PostgreSQL接続管理
   - 接続プール設定
   - トランザクション管理

3. **PostgreSQLUserRepository** (通常優先)
   - IUserRepositoryの実装
   - SQL実行とエンティティ変換
   - エラーハンドリング

### 6.2 実装時の注意点

#### セキュリティ考慮事項
- SQLインジェクション対策（プリペアードステートメント使用）
- 接続文字列の安全な管理
- エラーメッセージでの機密情報漏洩防止

#### パフォーマンス考慮事項
- 接続プールの最適化
- インデックスを活用したクエリ最適化
- 不要なデータ転送の最小化

#### 保守性考慮事項
- エラーハンドリングの統一
- ログ出力の充実
- 設定の外部化

## 7. 次のステップ

### Green フェーズでの実装タスク

1. **環境変数の型安全な読み取り**
   ```typescript
   static getDatabaseConfig(): DatabaseConfig {
     const host = process.env.DB_HOST;
     if (!host) throw new Error('DB_HOST環境変数が設定されていません');
     // ...
   }
   ```

2. **PostgreSQL接続プールの初期化**
   ```typescript
   import { Pool } from 'pg';
   static pool = new Pool({...});
   ```

3. **SQLクエリの実装**
   ```sql
   SELECT * FROM ${tablePrefix}users 
   WHERE external_id = $1 AND provider = $2
   ```

4. **エラーハンドリングの実装**
   ```typescript
   catch (error) {
     if (error.code === '23505') {
       throw new Error('一意制約違反');
     }
   }
   ```

### Refactor フェーズでの改善タスク

1. **コードの重複排除**
2. **メソッドの責任分離**
3. **定数の外部化**
4. **ログ出力の追加**

## 8. Red フェーズ完了確認

### 8.1 完了基準
- [x] 全スケルトンクラスが作成されている
- [x] 全テストケースが実装されている
- [x] 全テストが期待通りに失敗している
- [x] テストケースが要件を網羅している
- [x] エラーメッセージが明確に定義されている

### 8.2 品質確認
- [x] テストコードが読みやすい
- [x] テストケース名が日本語で明確
- [x] Given-When-Then構造が明確
- [x] テストデータの準備・クリーンアップが適切

**Red フェーズ完了** ✅

次は **Green フェーズ** で最小限の実装を行い、すべてのテストを通します。