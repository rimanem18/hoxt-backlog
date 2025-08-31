---
description: コード内のコメントを簡潔・明確になるように修正して整理します。
---

Red - Green - Refactor の順で実装が完了したコードがあります。

## 実装されたファイルの理解

- `docs/tasks/{要件名}-tasks.md` を確認
- タスク番号をもとに、変更されたファイルを確認
  - 関連するテストファイルも確認
- 今回のブランチで編集された  @app 配下のファイルを確認してください。
- 別のタスクで実装されたファイルを確認
  - 関連するテストファイルも確認

## 推奨されるコメントスタイル

- 機能の「What」を明確に記述
  - クラスDocコメント：冗長な説明を削除し、機能概要や使用例のみに簡潔化
  - メソッドDocコメント：基本的な役割と引数・戻り値の説明に集約
- 実装の「Why」を簡潔かつ明確に記述
  - インラインコメント：実装の理由のみを簡潔に記述
  - エラーメッセージ・定数の説明：機能を端的に表現
- テストファイルは Given-When-Then パターンを意識した構造
  - テストデータの準備（Given）
  - 実際の処理の実行（When）
  - 結果の検証（Then）
  - **禁止**: テストファイルではなく実装ファイルに対する記載。
- 過度な説明を削除し、コード本来の意図を明確化
- TODOコメント：将来の改善点を明記


## 実行内容

- 伝えられた要件名と TASK 番号をもとに、その TASK 番号で実装されたファイルをすべて確認します。
- コメントを推奨されるコメントスタイルにしたがって修正します。
- **禁止**: コメント以外の編集。

### 出力フォーマット例

#### テストファイル

```typescript
// example
test('空文字列やnullトークンが適切に拒否される', async () => {
  // Given: 空文字列のトークン
  const emptyToken = '';

  // When: JWT検証を実行
  const result: JwtVerificationResult =
    await authProvider.verifyToken(emptyToken);

  // Then: 必須パラメータエラーを返す
  expect(result.valid).toBe(false);
  expect(result.error).toBeDefined();
  expect(result.error).toContain('Token is required');
  expect(result.payload).toBeUndefined();
});
```

```typescript
// example 短ければ When と Then を入れ子にしてもよい
test('必須フィールド不足ペイロードでエラーが発生する', async () => {
  // Given: 必須フィールド（sub）が不足したペイロード
  const incompletePayload = {
    // sub フィールドなし
    email: 'test@example.com',
    app_metadata: { provider: 'hoge', providers: ['hoge'] },
    user_metadata: { name: 'Test User' },
    iss: 'https://your-example.url',
    iat: 1692780800,
    exp: 1692784400,
  } as JwtPayload;

  // When & Then: ユーザー情報を抽出し、エラーが発生する
  await expect(
    authProvider.getExternalUserInfo(incompletePayload),
  ).rejects.toThrow();
});
```

#### 実装ファイル
````typescript
/*
 * IAuthProviderインターフェースのHoge向け実装。
 * JWT検証とユーザー情報抽出を提供する。
 * @example
 * ```typescript
 * const provider = new HogeAuthProvider();
 * const result = await provider.verifyToken(jwtToken);
 * if (result.valid) {
 *   const userInfo = await provider.getExternalUserInfo(result.payload!);
 * }
 * ```
 */
export class HogeAuthProvider implements IAuthProvider {
  /**
   * HogeAuthProviderのコンストラクタ
   *
   * 環境変数からJWT秘密鍵を取得し、バリデーションを実行する。
   */
  constructor() {
    this.jwtSecret = this.getJwtSecretFromEnvironment();
    this.validateJwtSecret();
  }

   /**
   * JWT秘密鍵の有効性を検証する
   *
   * @throws {Error} JWT秘密鍵が設定されていない場合
   */
  private validateJwtSecret(): void {
    if (!this.jwtSecret.trim()) {
      throw new Error(ERROR_MESSAGES.MISSING_JWT_SECRET);
    }
  }
}
````

## 実行内容

途中の状態になっているコメントを修正したり、削除のし忘れたコメントを削除します。

実装とコメントを検証し、コメントが実装との乖離による嘘の情報になっている場合、修正します。

異なるタスク番号の既存ファイルを参考にして、統一感のあるコメントにしてください。
