# TDD開発メモ: GetUserProfileUseCase

## 概要

- 機能名: GetUserProfileUseCase
- 開発開始: 2025-08-22T13:35:00+09:00
- 現在のフェーズ: Red（失敗するテスト作成完了）

## 関連ファイル

- 要件定義: `docs/implementation/mvp-google-auth-requirements.md`
- テストケース定義: `docs/implementation/mvp-google-auth-testcases.md`
- 実装ファイル: `app/server/src/application/usecases/GetUserProfileUseCase.ts` (未作成)
- テストファイル: `app/server/src/application/usecases/__tests__/get-user-profile/*.spec.ts`

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025-08-22T13:35:00+09:00

### テストケース

以下の5つのテストファイルを作成し、包括的なテストカバレッジを実現：

1. **success.spec.ts** - 正常系テスト
   - 有効なuserIdでのプロフィール取得成功
   - マルチプロバイダー対応テスト（Google、GitHub、Facebook）
   - 処理時間制限（500ms以内）テスト
   - 成功時ログ出力検証

2. **user-not-found.spec.ts** - ユーザー未存在エラーテスト
   - 存在しないuserIdでのUserNotFoundError発生
   - 様々なパターンのユーザー未存在テスト
   - エラーログ出力検証

3. **validation-error.spec.ts** - バリデーションエラーテスト
   - null/undefined/空文字列のuserId
   - UUID形式違反
   - 型安全性違反（数値型、オブジェクト型）
   - バリデーションエラーログ検証

4. **infrastructure-error.spec.ts** - インフラエラーテスト
   - データベース接続エラー
   - 各種システムリソースエラー（メモリ不足、ネットワークタイムアウト等）
   - クエリタイムアウト処理
   - インフラエラーログ検証

5. **performance.spec.ts** - パフォーマンステスト
   - 標準処理での500ms以内完了
   - 連続処理での性能維持（10人分）
   - 大容量データでの処理時間制限
   - エラー処理でのパフォーマンス要件

### テストコード

#### テストヘルパー

- `helpers/makeSUT.ts`: SUTファクトリ（依存関係モック化）
- `helpers/userFactory.ts`: テストデータファクトリ
- `helpers/matchers.ts`: カスタムマッチャー定義

#### 実装されたテストパターン

```typescript
// 正常系テスト例
test('有効なuserIdでユーザープロフィールの取得が成功する', async () => {
  const existingUser = UserProfileFactory.existingUser({
    id: 'uuid-12345678-1234-4321-abcd-123456789abc',
    externalId: 'google_test_user_123',
    email: 'test.user@example.com',
    name: 'テストユーザー',
  });

  const input = UserProfileFactory.validInput('uuid-12345678-1234-4321-abcd-123456789abc');
  
  const mockFindById = sut.userRepository.findById as unknown as {
    mockResolvedValue: (value: unknown) => void;
  };
  mockFindById.mockResolvedValue(existingUser);

  const result = await sut.sut.execute(input);
  
  expect(result).toBeDefined();
  expect(result.user).toBeDefined();
  GetUserProfileTestMatchers.haveUserProperties(result.user, {
    id: 'uuid-12345678-1234-4321-abcd-123456789abc',
    externalId: 'google_test_user_123',
    email: 'test.user@example.com',
    name: 'テストユーザー',
  });
});
```

### 期待される失敗

**エラーメッセージ**: 
```
error: Cannot find module '@/application/usecases/GetUserProfileUseCase' from '/home/bun/app/server/src/application/usecases/__tests__/get-user-profile/helpers/makeSUT.ts'
```

**失敗理由**: 
- `GetUserProfileUseCase`クラスが未実装のため、インポートエラーが発生
- この失敗は期待通りの動作で、TDDのRedフェーズの証明

### 次のフェーズへの要求事項

Greenフェーズで実装すべき内容：

1. **GetUserProfileUseCaseクラス作成**
   - `app/server/src/application/usecases/GetUserProfileUseCase.ts`
   - 依存関係: `IUserRepository`, `Logger`
   - 入力: `{ userId: string }` (UUID形式)
   - 出力: `{ user: User }`

2. **実装必要機能**
   - userIdバリデーション（null/undefined/空文字列/UUID形式チェック）
   - userRepository.findById(userId)呼び出し
   - ユーザー未存在時のUserNotFoundError発生
   - インフラエラーハンドリング（InfrastructureError変換）
   - ログ出力（処理開始・成功・エラー時）
   - 処理時間500ms以内での完了

3. **エラーハンドリング**
   - `UserNotFoundError.forUserId(userId)`
   - `ValidationError`（入力値検証失敗時）
   - `InfrastructureError`（データベースエラー等）

4. **ログ出力仕様**
   - 処理開始: `info` - "Starting user profile retrieval" + `{ userId }`
   - 成功: `info` - "User profile retrieved successfully" + `{ userId }`
   - ユーザー未存在: `error` - "User not found for profile retrieval" + `{ userId }`
   - バリデーションエラー: `warn` - "Invalid input for user profile retrieval" + `{ invalidInput }`
   - インフラエラー: `error` - "Infrastructure error occurred during user profile retrieval" + `{ userId, error }`

## 品質評価

✅ **高品質のRedフェーズ**:
- テスト実行: 成功（期待通りに失敗することを確認済み）
- 期待値: 明確で具体的（5つのテストファイルで包括的カバレッジ）
- アサーション: 適切（カスタムマッチャーによる可読性向上）
- 実装方針: 明確（詳細な要求仕様をテストで表現）

## 信頼性レベル評価

テストケース内容の信頼性レベルを以下の基準で評価：

- 🟢 **青信号 (72%)**: 要件定義に明確に基づくテストケース
  - 基本的な正常系・異常系フロー
  - 500ms以内のパフォーマンス要件
  - UUID形式バリデーション
  - エラーハンドリング（UserNotFoundError、ValidationError、InfrastructureError）

- 🟡 **黄信号 (24%)**: 要件から妥当な推測に基づくテストケース
  - マルチプロバイダー対応の詳細
  - 連続処理でのパフォーマンス維持
  - 大容量データでの処理時間制限
  - 様々な境界値テスト

- 🔴 **赤信号 (4%)**: 推測ベースのテストケース
  - ログ出力の詳細仕様（運用上重要と判断）

総合評価: 要件定義に忠実で実装指針として十分な品質のテストスイートを作成完了。