# E2Eテストガイドライン（Playwright）

## 実行環境
```bash
docker compose exec e2e npx playwright test
```

## ディレクトリ構造

E2Eテストは `app/client/e2e/{feature}/` 配下に配置します。

**例**:
- `app/client/e2e/todo/*.spec.ts` - todoアプリのE2Eテスト
- `app/client/e2e/auth/*.spec.ts` - 認証関連のE2Eテスト
- `app/client/e2e/{feature}/helpers/` - feature固有のヘルパー
- `app/client/e2e/{feature}/fixtures/` - feature固有のフィクスチャ

**方針**:
- feature単位でディレクトリを分離
- helpersやfixturesもfeature配下に配置
- テストファイル間の依存を最小化

## 運用指針詳細

- **必須**: `storageState` APIの使用（ハイドレーション前に確実に設定、レース条件回避）
- **必須**: Locatorsの優先利用（`page.locator()`で自動待機機能を活用）
- **必須**: Web First Assertions（`expect(locator).toBeVisible()`で自動リトライ）
- **必須**: テスト独立性の確保（`test.afterEach`でクリーンアップ徹底）
- **推奨**: リダイレクト検証はDOM要素待機（`waitForURL()`だけでなくページ要素の表示も待機）
- **推奨**: APIによるテストデータセットアップ（UI操作ではなくAPI直接呼び出し）
- **推奨**: Trace Viewerの積極的活用（`trace: 'on-first-retry'`設定、CI失敗時の視覚的デバッグ）
- **非推奨**: `addInitScript`によるlocalStorage設定（タイミング依存、ハイドレーション競合）
- **禁止**: ハイドレーションタイミングへの依存（`waitForTimeout()`など固定待機時間は禁止）

## CI環境への配慮
- **直列実行**: `workers: 1`で安定性重視（`playwright.config.ts`）
- **リトライ**: `retries: 1`で高速フィードバック
- **タイムアウト**: 余裕を持たせる（15秒推奨）
- **環境変数**: `process.env.GITHUB_ACTIONS`でbaseURLを分岐

## デバッグ手法
1. **ローカル**: `npx playwright test --debug`で実行
2. **CI失敗時**: Trace Viewerでartifactを確認
3. **視覚的確認**: スクリーンショット・動画を活用
4. **ヘッドフルモード**: `npx playwright test --headed`で実際のブラウザ動作確認


## 実装パターン例

### E2Eテスト（Playwright）

#### storageState APIの使用
```typescript
const context = await browser.newContext({
  storageState: {
    cookies: [],
    origins: [{
      origin: baseURL,
      localStorage: [
        { name: 'auth-token', value: JSON.stringify(authData) }
      ],
    }],
  },
});
const page = await context.newPage();
```

#### リダイレクト検証の正しい書き方
```typescript
// ❌ 非推奨: ハイドレーション完了を保証しない
await page.waitForURL('/dashboard');

// ✅ 推奨: UIが操作可能になったことを確認
await expect(page.getByRole('button', { name: /ログイン/i }))
  .toBeVisible({ timeout: 15000 });
await expect(page).toHaveURL('/dashboard');
```

#### ハイドレーション待機の正しい書き方
```typescript
// ❌ 禁止: 固定待機時間
await page.waitForTimeout(1000);

// ✅ 正しい: DOM要素の出現を待機
await expect(page.getByRole('heading')).toBeVisible();
```

#### テスト独立性の確保
```typescript
test.afterEach(async ({ page }) => {
  await page.unrouteAll();
  await page.evaluate(() => localStorage.clear());
});
```

#### Trace Viewerの設定
```typescript
// playwright.config.ts
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```
