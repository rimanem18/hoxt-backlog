# TDD Red Phase 設計書: GetUserProfileUseCase

## フェーズ概要

**フェーズ**: Red（失敗するテスト作成）  
**対象機能**: GetUserProfileUseCase - ユーザープロフィール取得UseCase  
**作成日時**: 2025-08-22T13:35:00+09:00

## テストファイル構成

### ディレクトリ構造
```
app/server/src/application/usecases/__tests__/get-user-profile/
├── success.spec.ts              # 正常系テスト
├── user-not-found.spec.ts       # ユーザー未存在エラー
├── validation-error.spec.ts     # バリデーションエラー
├── infrastructure-error.spec.ts # インフラエラー
├── performance.spec.ts          # パフォーマンステスト
└── helpers/
    ├── makeSUT.ts              # SUTファクトリ
    ├── userFactory.ts          # テストデータファクトリ
    └── matchers.ts             # カスタムマッチャ
```

## 設計方針

### 1. テスト駆動設計
- **失敗ファースト**: 実装前にテストを作成し、期待通りの失敗を確認
- **要求仕様の明文化**: テストコードが実装の詳細仕様書となる
- **包括的カバレッジ**: 正常系・異常系・境界値・パフォーマンスを網羅

### 2. 依存関係の抽象化
```typescript
// SUT構築時の依存関係
export interface SUTDependencies {
  readonly userRepository: IUserRepository;  // ユーザーデータアクセス
  readonly logger: Logger;                    // ログ出力
}
```

### 3. テストデータ管理
- **ファクトリパターン**: 一貫したテストデータ生成
- **バリエーション対応**: 正常・異常・境界値データを体系化
- **可読性重視**: 日本語コメントによる意図の明確化

## 実装要件（テストから導出）

### 基本インターフェース

#### 入力
```typescript
interface GetUserProfileUseCaseInput {
  userId: string;  // UUID v4 形式
}
```

#### 出力
```typescript
interface GetUserProfileUseCaseOutput {
  user: User;  // ユーザーエンティティ
}
```

#### エラー
- `UserNotFoundError`: ユーザー未存在
- `ValidationError`: 入力値不正
- `InfrastructureError`: システムエラー

### バリデーション要件

1. **必須項目チェック**
   - userId が null/undefined/空文字列でないこと

2. **形式チェック**
   - userId がUUID v4形式であること

3. **型チェック**
   - userId が string 型であること

### 処理フロー要件

1. **入力バリデーション**
   ```typescript
   // null/undefined/空文字列チェック
   if (!input.userId) {
     throw new ValidationError('ユーザーIDが必要です');
   }
   
   // UUID形式チェック
   if (!isValidUUID(input.userId)) {
     throw new ValidationError('ユーザーIDはUUID形式である必要があります');
   }
   ```

2. **ユーザー検索**
   ```typescript
   const user = await this.userRepository.findById(input.userId);
   if (!user) {
     throw UserNotFoundError.forUserId(input.userId);
   }
   ```

3. **レスポンス構築**
   ```typescript
   return { user };
   ```

### ログ出力要件

#### 処理開始ログ
```typescript
this.logger.info('Starting user profile retrieval', { userId: input.userId });
```

#### 成功ログ
```typescript
this.logger.info('User profile retrieved successfully', { userId: input.userId });
```

#### エラーログ

**ユーザー未存在**:
```typescript
this.logger.error('User not found for profile retrieval', { userId: input.userId });
```

**バリデーションエラー**:
```typescript
this.logger.warn('Invalid input for user profile retrieval', { 
  invalidInput: JSON.stringify(input) 
});
```

**インフラエラー**:
```typescript
this.logger.error('Infrastructure error occurred during user profile retrieval', { 
  userId: input.userId, 
  error: error.message 
});
```

### パフォーマンス要件

- **処理時間制限**: 500ms以内
- **連続処理対応**: 複数回呼び出しでも性能維持
- **大容量データ対応**: データサイズに依存しない処理時間
- **エラー処理性能**: エラー時も500ms以内で応答

## テストケース詳細

### 1. 正常系テスト (success.spec.ts)

#### テストケース一覧
- 基本的なユーザープロフィール取得成功
- マルチプロバイダー対応（Google、GitHub、Facebook）
- パフォーマンステスト（500ms以内）
- ログ出力検証

#### 検証項目
```typescript
// ユーザー情報の完全性
expect(result.user.id).toBe(expectedUser.id);
expect(result.user.email).toBe(expectedUser.email);
expect(result.user.name).toBe(expectedUser.name);

// 依存関係の呼び出し
expect(mockRepository.findById).toHaveBeenCalledWith(userId);
expect(mockRepository.findById).toHaveBeenCalledTimes(1);
```

### 2. ユーザー未存在エラーテスト (user-not-found.spec.ts)

#### テストケース一覧
- 基本的なユーザー未存在エラー
- 様々なパターンでの未存在エラー（削除済み、未登録等）
- エラーログ出力検証

#### 検証項目
```typescript
// エラータイプ
await expect(promise).rejects.toThrow(UserNotFoundError);

// エラーメッセージ
await expect(promise).rejects.toThrow(
  `ユーザーID '${userId}' が見つかりません`
);
```

### 3. バリデーションエラーテスト (validation-error.spec.ts)

#### テストケース一覧
- null/undefined/空文字列
- UUID形式違反
- 型安全性違反（数値、オブジェクト）
- バリデーションエラーログ検証

#### 検証項目
```typescript
// バリデーションエラー発生
await expect(promise).rejects.toThrow(ValidationError);

// リポジトリ未呼び出し
expect(mockRepository.findById).not.toHaveBeenCalled();
```

### 4. インフラエラーテスト (infrastructure-error.spec.ts)

#### テストケース一覧
- データベース接続エラー
- システムリソースエラー（メモリ、ファイルシステム、ネットワーク）
- クエリタイムアウト
- インフラエラーログ検証

#### 検証項目
```typescript
// インフラエラー変換
await expect(promise).rejects.toThrow(InfrastructureError);

// エラーメッセージ
await expect(promise).rejects.toThrow('ユーザー情報の取得に失敗しました');
```

### 5. パフォーマンステスト (performance.spec.ts)

#### テストケース一覧
- 標準処理での500ms以内完了
- 連続処理での性能維持
- 大容量データでの処理時間制限
- エラー処理でのパフォーマンス要件

#### 検証項目
```typescript
const startTime = performance.now();
await sut.execute(input);
const endTime = performance.now();
const executionTime = endTime - startTime;

expect(executionTime).toBeLessThan(500);
```

## コード品質指標

### テストカバレッジ目標
- **行カバレッジ**: 100%
- **ブランチカバレッジ**: 100%
- **機能カバレッジ**: 100%

### 可読性指標
- **日本語コメント**: 全テストケースに目的・内容・期待動作を明記
- **信頼性レベル**: 🟢🟡🔴によるテスト内容の根拠明示
- **Given-When-Then**: 明確な3段階構造

### 保守性指標
- **DRY原則**: ヘルパー関数・ファクトリパターンによる重複排除
- **単一責任**: 各テストファイルが単一の責任領域をカバー
- **疎結合**: モック化による依存関係の分離

## 次フェーズ（Green）への引き継ぎ

### 実装優先順位

1. **高優先度** (🟢 青信号テスト対応)
   - 基本的なUseCase構造
   - バリデーション機能
   - UserRepository呼び出し
   - エラーハンドリング

2. **中優先度** (🟡 黄信号テスト対応)
   - パフォーマンス最適化
   - ログ出力詳細化
   - 複数プロバイダー対応確認

3. **低優先度** (🔴 赤信号テスト対応)
   - 運用ログの詳細仕様確定

### 技術的制約
- **SOLID原則**: 依存性逆転の原則に従った設計
- **クリーンアーキテクチャ**: Application層としての責務範囲遵守
- **型安全性**: TypeScript + 実行時バリデーションの併用

### 成功条件
全テストが`green`になることで、要件を満たすGetUserProfileUseCaseの実装完了とする。