# TASK-103: PostgreSQLリポジトリ実装 - TDDテストケース

作成日: 2025-08-16  
更新日: 2025-08-16

## 1. テスト戦略

### 1.1 テスト種別
- **統合テスト**: 実際のPostgreSQLデータベースを使用
- **単体テスト**: モックを使用したロジックテスト
- **パフォーマンステスト**: 実行時間・接続プール動作確認

### 1.2 テスト環境
- テスト専用PostgreSQLデータベース
- Docker Compose環境
- トランザクションロールバック利用

## 2. DatabaseConnection クラステストケース

### 2.1 接続管理テスト

#### TC-DB-001: 正常な接続取得
**説明**: データベースへの正常な接続が取得できることを確認
```typescript
describe('DatabaseConnection.getConnection', () => {
  test('正常な接続が取得できること', async () => {
    // Given: 有効なデータベース設定
    
    // When: 接続を取得
    const client = await DatabaseConnection.getConnection()
    
    // Then: 接続が正常に取得される
    expect(client).toBeDefined()
    expect(client.query).toBeDefined()
    
    // Cleanup
    client.release()
  })
})
```

#### TC-DB-002: 接続エラーハンドリング
**説明**: 無効な接続設定でのエラーハンドリングを確認
```typescript
test('無効なデータベース設定でエラーが発生すること', async () => {
  // Given: 無効なデータベース設定
  const invalidConfig = { host: 'invalid-host', port: 9999 }
  
  // When & Then: 接続エラーが発生
  await expect(DatabaseConnection.getConnection())
    .rejects.toThrow('データベースへの接続に失敗しました')
})
```

#### TC-DB-003: ヘルスチェック機能
**説明**: データベース接続のヘルスチェックが正常に動作することを確認
```typescript
test('ヘルスチェックが正常に動作すること', async () => {
  // When: ヘルスチェックを実行
  const isHealthy = await DatabaseConnection.healthCheck()
  
  // Then: 正常状態を返す
  expect(isHealthy).toBe(true)
})
```

### 2.2 トランザクション管理テスト

#### TC-DB-004: トランザクション正常実行
**説明**: トランザクション内での処理が正常に実行されることを確認
```typescript
test('トランザクションが正常に実行されること', async () => {
  // Given: テストデータ
  const testUser = createTestUserInput()
  
  // When: トランザクション内で処理実行
  const result = await DatabaseConnection.executeTransaction(async (client) => {
    const query = `INSERT INTO ${tablePrefix}users (...) VALUES (...) RETURNING *`
    const result = await client.query(query, [...])
    return result.rows[0]
  })
  
  // Then: 結果が正常に返される
  expect(result).toBeDefined()
  expect(result.id).toBeDefined()
})
```

#### TC-DB-005: トランザクションロールバック
**説明**: エラー発生時のトランザクションロールバックが正常に動作することを確認
```typescript
test('エラー発生時にロールバックされること', async () => {
  // Given: エラーを発生させる処理
  
  // When & Then: エラーでロールバック
  await expect(DatabaseConnection.executeTransaction(async (client) => {
    await client.query('INSERT INTO invalid_table ...')
    throw new Error('テストエラー')
  })).rejects.toThrow('テストエラー')
  
  // Then: データが残っていないことを確認
  const client = await DatabaseConnection.getConnection()
  const result = await client.query(`SELECT * FROM ${tablePrefix}users`)
  expect(result.rows).toHaveLength(0)
  client.release()
})
```

## 3. EnvironmentConfig クラステストケース

### 3.1 設定値取得テスト

#### TC-ENV-001: データベース設定取得
**説明**: 環境変数からデータベース設定が正しく取得されることを確認
```typescript
describe('EnvironmentConfig.getDatabaseConfig', () => {
  test('正常なデータベース設定が取得できること', () => {
    // Given: 有効な環境変数設定
    process.env.DB_HOST = 'localhost'
    process.env.DB_PORT = '5432'
    process.env.DB_NAME = 'test_db'
    process.env.DB_USER = 'test_user'
    process.env.DB_PASSWORD = 'test_password'
    process.env.DB_TABLE_PREFIX = 'test_'
    
    // When: 設定を取得
    const config = EnvironmentConfig.getDatabaseConfig()
    
    // Then: 設定値が正しい
    expect(config.host).toBe('localhost')
    expect(config.port).toBe(5432)
    expect(config.database).toBe('test_db')
    expect(config.username).toBe('test_user')
    expect(config.password).toBe('test_password')
    expect(config.tablePrefix).toBe('test_')
  })
})
```

#### TC-ENV-002: 不正な設定値でのエラー
**説明**: 不正な環境変数でのエラーハンドリングを確認
```typescript
test('必須環境変数が不足している場合にエラーが発生すること', () => {
  // Given: 不完全な環境変数設定
  delete process.env.DB_HOST
  
  // When & Then: 設定エラーが発生
  expect(() => EnvironmentConfig.getDatabaseConfig())
    .toThrow('DB_HOST環境変数が設定されていません')
})
```

## 4. PostgreSQLUserRepository クラステストケース

### 4.1 データ準備用ヘルパー
```typescript
// テストデータ生成ヘルパー
function createTestUserInput(): CreateUserInput {
  return {
    externalId: `test_${Date.now()}`,
    provider: 'google' as AuthProvider,
    email: `test${Date.now()}@example.com`,
    name: 'テストユーザー',
    avatarUrl: 'https://example.com/avatar.jpg'
  }
}

function createTestUser(): User {
  const input = createTestUserInput()
  return UserEntity.create(input).toObject()
}
```

### 4.2 findByExternalId メソッドテスト

#### TC-REPO-001: 正常な外部ID検索
**説明**: 存在する外部IDとプロバイダーでユーザーが取得できることを確認
```typescript
describe('PostgreSQLUserRepository.findByExternalId', () => {
  test('存在する外部IDでユーザーが取得できること', async () => {
    // Given: データベースにテストユーザーを作成
    const repository = new PostgreSQLUserRepository()
    const testInput = createTestUserInput()
    const createdUser = await repository.create(testInput)
    
    // When: 外部IDで検索
    const foundUser = await repository.findByExternalId(
      testInput.externalId,
      testInput.provider
    )
    
    // Then: ユーザーが正しく取得される
    expect(foundUser).not.toBeNull()
    expect(foundUser!.externalId).toBe(testInput.externalId)
    expect(foundUser!.provider).toBe(testInput.provider)
    expect(foundUser!.email).toBe(testInput.email)
    expect(foundUser!.name).toBe(testInput.name)
  })
})
```

#### TC-REPO-002: 存在しない外部ID検索
**説明**: 存在しない外部IDでnullが返されることを確認
```typescript
test('存在しない外部IDでnullが返されること', async () => {
  // Given: 存在しない外部ID
  const repository = new PostgreSQLUserRepository()
  
  // When: 存在しない外部IDで検索
  const foundUser = await repository.findByExternalId(
    'non_existent_id',
    'google'
  )
  
  // Then: nullが返される
  expect(foundUser).toBeNull()
})
```

#### TC-REPO-003: 異なるプロバイダーでの検索
**説明**: 同じ外部IDでも異なるプロバイダーでは検索できないことを確認
```typescript
test('異なるプロバイダーでは検索できないこと', async () => {
  // Given: Googleプロバイダーでユーザー作成
  const repository = new PostgreSQLUserRepository()
  const testInput = createTestUserInput()
  testInput.provider = 'google'
  await repository.create(testInput)
  
  // When: 同じ外部IDでAppleプロバイダーで検索
  const foundUser = await repository.findByExternalId(
    testInput.externalId,
    'apple' as AuthProvider
  )
  
  // Then: nullが返される
  expect(foundUser).toBeNull()
})
```

### 4.3 findById メソッドテスト

#### TC-REPO-004: 正常なID検索
**説明**: 存在するUUIDでユーザーが取得できることを確認
```typescript
describe('PostgreSQLUserRepository.findById', () => {
  test('存在するIDでユーザーが取得できること', async () => {
    // Given: データベースにテストユーザーを作成
    const repository = new PostgreSQLUserRepository()
    const testInput = createTestUserInput()
    const createdUser = await repository.create(testInput)
    
    // When: IDで検索
    const foundUser = await repository.findById(createdUser.id)
    
    // Then: ユーザーが正しく取得される
    expect(foundUser).not.toBeNull()
    expect(foundUser!.id).toBe(createdUser.id)
    expect(foundUser!.email).toBe(createdUser.email)
  })
})
```

#### TC-REPO-005: 存在しないID検索
**説明**: 存在しないUUIDでnullが返されることを確認
```typescript
test('存在しないIDでnullが返されること', async () => {
  // Given: 存在しないUUID
  const repository = new PostgreSQLUserRepository()
  const nonExistentId = crypto.randomUUID()
  
  // When: 存在しないIDで検索
  const foundUser = await repository.findById(nonExistentId)
  
  // Then: nullが返される
  expect(foundUser).toBeNull()
})
```

#### TC-REPO-006: 不正なID形式での検索
**説明**: 不正なUUID形式でエラーが発生することを確認
```typescript
test('不正なID形式でエラーが発生すること', async () => {
  // Given: 不正なID形式
  const repository = new PostgreSQLUserRepository()
  const invalidId = 'invalid-uuid-format'
  
  // When & Then: エラーが発生
  await expect(repository.findById(invalidId))
    .rejects.toThrow('無効なUUID形式です')
})
```

### 4.4 findByEmail メソッドテスト

#### TC-REPO-007: 正常なメール検索
**説明**: 存在するメールアドレスでユーザーが取得できることを確認
```typescript
describe('PostgreSQLUserRepository.findByEmail', () => {
  test('存在するメールアドレスでユーザーが取得できること', async () => {
    // Given: データベースにテストユーザーを作成
    const repository = new PostgreSQLUserRepository()
    const testInput = createTestUserInput()
    const createdUser = await repository.create(testInput)
    
    // When: メールアドレスで検索
    const foundUser = await repository.findByEmail(testInput.email)
    
    // Then: ユーザーが正しく取得される
    expect(foundUser).not.toBeNull()
    expect(foundUser!.email).toBe(testInput.email)
    expect(foundUser!.id).toBe(createdUser.id)
  })
})
```

#### TC-REPO-008: 存在しないメール検索
**説明**: 存在しないメールアドレスでnullが返されることを確認
```typescript
test('存在しないメールアドレスでnullが返されること', async () => {
  // Given: 存在しないメールアドレス
  const repository = new PostgreSQLUserRepository()
  
  // When: 存在しないメールアドレスで検索
  const foundUser = await repository.findByEmail('nonexistent@example.com')
  
  // Then: nullが返される
  expect(foundUser).toBeNull()
})
```

#### TC-REPO-009: 大文字小文字の区別
**説明**: メールアドレスの大文字小文字が正しく処理されることを確認
```typescript
test('メールアドレスの大文字小文字が正しく処理されること', async () => {
  // Given: 小文字のメールアドレスでユーザー作成
  const repository = new PostgreSQLUserRepository()
  const testInput = createTestUserInput()
  testInput.email = 'test@example.com'
  await repository.create(testInput)
  
  // When: 大文字のメールアドレスで検索
  const foundUser = await repository.findByEmail('TEST@EXAMPLE.COM')
  
  // Then: 大文字小文字を区別せずに検索される
  expect(foundUser).not.toBeNull()
  expect(foundUser!.email).toBe('test@example.com')
})
```

### 4.5 create メソッドテスト

#### TC-REPO-010: 正常なユーザー作成
**説明**: 有効な入力でユーザーが正常に作成されることを確認
```typescript
describe('PostgreSQLUserRepository.create', () => {
  test('有効な入力でユーザーが正常に作成されること', async () => {
    // Given: 有効なユーザー作成入力
    const repository = new PostgreSQLUserRepository()
    const testInput = createTestUserInput()
    
    // When: ユーザーを作成
    const createdUser = await repository.create(testInput)
    
    // Then: ユーザーが正しく作成される
    expect(createdUser).toBeDefined()
    expect(createdUser.id).toBeDefined()
    expect(createdUser.externalId).toBe(testInput.externalId)
    expect(createdUser.provider).toBe(testInput.provider)
    expect(createdUser.email).toBe(testInput.email)
    expect(createdUser.name).toBe(testInput.name)
    expect(createdUser.avatarUrl).toBe(testInput.avatarUrl)
    expect(createdUser.createdAt).toBeInstanceOf(Date)
    expect(createdUser.updatedAt).toBeInstanceOf(Date)
    expect(createdUser.lastLoginAt).toBeNull()
  })
})
```

#### TC-REPO-011: 重複する外部ID・プロバイダーでのエラー
**説明**: 重複する外部IDとプロバイダーの組み合わせでエラーが発生することを確認
```typescript
test('重複する外部ID・プロバイダーでエラーが発生すること', async () => {
  // Given: 既存ユーザーと同じ外部ID・プロバイダー
  const repository = new PostgreSQLUserRepository()
  const testInput = createTestUserInput()
  
  // 最初のユーザーを作成
  await repository.create(testInput)
  
  // When & Then: 同じ外部ID・プロバイダーで再作成するとエラー
  const duplicateInput = { ...testInput, email: 'another@example.com' }
  await expect(repository.create(duplicateInput))
    .rejects.toThrow('外部IDとプロバイダーの組み合わせが既に存在します')
})
```

#### TC-REPO-012: avatarUrlがnullの場合の作成
**説明**: avatarUrlがnullでもユーザーが正常に作成されることを確認
```typescript
test('avatarUrlがnullでもユーザーが正常に作成されること', async () => {
  // Given: avatarUrlがnullの入力
  const repository = new PostgreSQLUserRepository()
  const testInput = createTestUserInput()
  delete testInput.avatarUrl
  
  // When: ユーザーを作成
  const createdUser = await repository.create(testInput)
  
  // Then: avatarUrlがnullで作成される
  expect(createdUser.avatarUrl).toBeNull()
})
```

### 4.6 update メソッドテスト

#### TC-REPO-013: 正常なユーザー更新
**説明**: 存在するユーザーが正常に更新されることを確認
```typescript
describe('PostgreSQLUserRepository.update', () => {
  test('存在するユーザーが正常に更新されること', async () => {
    // Given: 既存ユーザー
    const repository = new PostgreSQLUserRepository()
    const testInput = createTestUserInput()
    const createdUser = await repository.create(testInput)
    
    const updateInput: UpdateUserInput = {
      name: '更新されたユーザー名',
      avatarUrl: 'https://example.com/new-avatar.jpg',
      lastLoginAt: new Date()
    }
    
    // When: ユーザーを更新
    const updatedUser = await repository.update(createdUser.id, updateInput)
    
    // Then: ユーザーが正しく更新される
    expect(updatedUser.id).toBe(createdUser.id)
    expect(updatedUser.name).toBe(updateInput.name)
    expect(updatedUser.avatarUrl).toBe(updateInput.avatarUrl)
    expect(updatedUser.lastLoginAt).toEqual(updateInput.lastLoginAt)
    expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(createdUser.updatedAt.getTime())
    
    // 更新されない項目の確認
    expect(updatedUser.email).toBe(createdUser.email)
    expect(updatedUser.externalId).toBe(createdUser.externalId)
    expect(updatedUser.provider).toBe(createdUser.provider)
  })
})
```

#### TC-REPO-014: 存在しないユーザーの更新でエラー
**説明**: 存在しないユーザーIDでの更新でUserNotFoundErrorが発生することを確認
```typescript
test('存在しないユーザーの更新でUserNotFoundErrorが発生すること', async () => {
  // Given: 存在しないユーザーID
  const repository = new PostgreSQLUserRepository()
  const nonExistentId = crypto.randomUUID()
  const updateInput: UpdateUserInput = { name: '更新名' }
  
  // When & Then: UserNotFoundErrorが発生
  await expect(repository.update(nonExistentId, updateInput))
    .rejects.toThrow(UserNotFoundError)
})
```

#### TC-REPO-015: 部分更新の動作確認
**説明**: 部分的な更新が正しく動作することを確認
```typescript
test('部分的な更新が正しく動作すること', async () => {
  // Given: 既存ユーザー
  const repository = new PostgreSQLUserRepository()
  const testInput = createTestUserInput()
  const createdUser = await repository.create(testInput)
  
  const updateInput: UpdateUserInput = {
    name: '更新されたユーザー名'
    // avatarUrl と lastLoginAt は更新しない
  }
  
  // When: 部分更新
  const updatedUser = await repository.update(createdUser.id, updateInput)
  
  // Then: 指定したフィールドのみ更新される
  expect(updatedUser.name).toBe(updateInput.name)
  expect(updatedUser.avatarUrl).toBe(createdUser.avatarUrl)  // 元のまま
  expect(updatedUser.lastLoginAt).toBe(createdUser.lastLoginAt)  // 元のまま
})
```

### 4.7 delete メソッドテスト

#### TC-REPO-016: 正常なユーザー削除
**説明**: 存在するユーザーが正常に削除されることを確認
```typescript
describe('PostgreSQLUserRepository.delete', () => {
  test('存在するユーザーが正常に削除されること', async () => {
    // Given: 既存ユーザー
    const repository = new PostgreSQLUserRepository()
    const testInput = createTestUserInput()
    const createdUser = await repository.create(testInput)
    
    // When: ユーザーを削除
    await repository.delete(createdUser.id)
    
    // Then: ユーザーが削除される
    const deletedUser = await repository.findById(createdUser.id)
    expect(deletedUser).toBeNull()
  })
})
```

#### TC-REPO-017: 存在しないユーザーの削除でエラー
**説明**: 存在しないユーザーIDでの削除でUserNotFoundErrorが発生することを確認
```typescript
test('存在しないユーザーの削除でUserNotFoundErrorが発生すること', async () => {
  // Given: 存在しないユーザーID
  const repository = new PostgreSQLUserRepository()
  const nonExistentId = crypto.randomUUID()
  
  // When & Then: UserNotFoundErrorが発生
  await expect(repository.delete(nonExistentId))
    .rejects.toThrow(UserNotFoundError)
})
```

## 5. パフォーマンステストケース

### 5.1 実行時間テスト

#### TC-PERF-001: 検索クエリのパフォーマンス
**説明**: 各検索メソッドが要求された時間内に実行されることを確認
```typescript
describe('パフォーマンステスト', () => {
  test('findByExternalIdが10ms以内で実行されること', async () => {
    // Given: テストデータ
    const repository = new PostgreSQLUserRepository()
    const testInput = createTestUserInput()
    await repository.create(testInput)
    
    // When: 実行時間を測定
    const startTime = performance.now()
    await repository.findByExternalId(testInput.externalId, testInput.provider)
    const endTime = performance.now()
    
    // Then: 10ms以内で実行される
    expect(endTime - startTime).toBeLessThan(10)
  })
  
  test('findByIdが5ms以内で実行されること', async () => {
    // 同様のパフォーマンステスト
  })
  
  test('findByEmailが15ms以内で実行されること', async () => {
    // 同様のパフォーマンステスト
  })
})
```

### 5.2 同時接続テスト

#### TC-PERF-002: 接続プールの動作確認
**説明**: 複数同時接続で接続プールが正常に動作することを確認
```typescript
test('複数同時接続で接続プールが正常に動作すること', async () => {
  // Given: 複数の同時リクエスト
  const repository = new PostgreSQLUserRepository()
  const promises = []
  
  // When: 同時に複数のクエリを実行
  for (let i = 0; i < 20; i++) {
    promises.push(repository.findById(crypto.randomUUID()))
  }
  
  // Then: すべてのクエリが正常に完了する
  const results = await Promise.all(promises)
  expect(results).toHaveLength(20)
})
```

## 6. エラーハンドリングテストケース

### 6.1 データベースエラーテスト

#### TC-ERROR-001: 接続エラーでの適切なエラーメッセージ
**説明**: データベース接続エラー時に適切なエラーメッセージが返されることを確認
```typescript
describe('エラーハンドリング', () => {
  test('データベース接続エラー時に適切なエラーメッセージが返されること', async () => {
    // Given: 無効なデータベース設定
    const repository = new PostgreSQLUserRepository()
    // データベースを停止
    
    // When & Then: 接続エラーが適切に処理される
    await expect(repository.findById(crypto.randomUUID()))
      .rejects.toThrow('データベースへの接続に失敗しました')
  })
})
```

#### TC-ERROR-002: SQLエラーでの適切なハンドリング
**説明**: SQLエラーが適切にハンドリングされることを確認
```typescript
test('SQLエラーが適切にハンドリングされること', async () => {
  // Given: 不正なSQL実行条件
  const repository = new PostgreSQLUserRepository()
  
  // When & Then: SQLエラーが適切に処理される
  // (テーブル削除後のクエリ実行など)
})
```

## 7. テスト実行設定

### 7.1 テストセットアップ・ティアダウン
```typescript
describe('PostgreSQLUserRepository統合テスト', () => {
  beforeAll(async () => {
    // テストデータベース接続
    await DatabaseConnection.initialize()
    
    // テーブルクリーンアップ
    await cleanupTestData()
  })
  
  afterAll(async () => {
    // 接続クローズ
    await DatabaseConnection.close()
  })
  
  beforeEach(async () => {
    // 各テスト前にデータクリーンアップ
    await cleanupTestData()
  })
  
  afterEach(async () => {
    // 各テスト後にデータクリーンアップ（冗長だが安全性のため）
    await cleanupTestData()
  })
})

async function cleanupTestData() {
  const client = await DatabaseConnection.getConnection()
  await client.query(`DELETE FROM ${tablePrefix}users WHERE email LIKE '%@example.com'`)
  client.release()
}
```

### 7.2 テスト実行コマンド
```bash
# 統合テストのみ実行
bun test --testNamePattern="統合テスト"

# パフォーマンステストのみ実行  
bun test --testNamePattern="パフォーマンステスト"

# エラーハンドリングテストのみ実行
bun test --testNamePattern="エラーハンドリング"

# 全テスト実行
bun test
```

## 8. 受け入れ基準

### 8.1 テスト通過率
- [ ] 全統合テストが通過する（100%）
- [ ] 全パフォーマンステストが通過する（100%）
- [ ] 全エラーハンドリングテストが通過する（100%）

### 8.2 カバレッジ要件
- [ ] ブランチカバレッジ 80%以上
- [ ] ラインカバレッジ 85%以上
- [ ] 関数カバレッジ 100%

### 8.3 パフォーマンス要件
- [ ] findByExternalId: 10ms以内
- [ ] findById: 5ms以内
- [ ] findByEmail: 15ms以内
- [ ] create: 20ms以内
- [ ] update: 15ms以内
- [ ] delete: 10ms以内