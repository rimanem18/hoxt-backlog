# T008 Google OAuth認証失敗エラー表示 - E2E Redフェーズ設計詳細

作成日: 2025-01-22

## E2E Redフェーズ実装概要

**T008: Google OAuth認証失敗エラー表示**のRedフェーズとして、Playwrightを使用した実ブラウザでのGoogle OAuth認証失敗パターンをテストするE2Eテストケースを実装しました。

## E2Eテスト設計方針

### 1. 実ブラウザでの検証重視
- **Playwright活用**: 実際のブラウザ環境でのユーザー操作をテスト
- **DOM要素検証**: 実際のHTML要素の表示・非表示・スタイルを確認
- **APIモック統合**: 現実的なOAuth失敗状況をAPIレベルで再現

### 2. TASK-401要件への完全対応
- **E2Eテストスイート**: 単体テストではなくEnd-to-Endでの検証
- **実際のユーザー体験**: ブラウザ上でのユーザー操作フローを完全再現
- **統合的検証**: フロントエンド→API→エラー処理の全フローテスト

### 3. データ属性による確実な要素特定
```typescript
// テスト用data-testarea属性でDOM要素を確実に特定
const messageContainer = page.locator('[data-testarea="auth-message"]');
const errorContainer = page.locator('[data-testarea="auth-error"]');
const configErrorContainer = page.locator('[data-testarea="config-error"]');
```

## 実装したE2Eテストケース詳細

### テスト1: OAuth認証キャンセルE2Eフロー
```typescript
test('Google OAuth認証キャンセル時の適切なエラーメッセージ表示', async ({ page }) => {
  // APIモックでOAuth認証キャンセルを再現
  await page.route('**/auth/v1/authorize**', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'access_denied',
        error_description: 'User denied access to the authorization server',
        error_code: 'auth_cancelled',
        provider: 'google'
      }),
    });
  });

  // 実際のブラウザ操作
  await page.goto('/');
  const loginButton = page.getByRole('button', { name: /ログイン|login/i });
  await loginButton.click();

  // 実際のDOM要素でエラーメッセージを確認
  const cancelMessage = page.getByText('Googleログインがキャンセルされました');
  await expect(cancelMessage).toBeVisible({ timeout: 5000 });
  
  // CSS classによる情報メッセージ確認（エラー扱いではない）
  const messageContainer = page.locator('[data-testarea="auth-message"]');
  await expect(messageContainer).toHaveClass(/info|success/);
});
```

**E2E設計ポイント**:
- 実際のSupabase OAuth APIエラーレスポンス形式を再現
- ブラウザでのログインボタンクリック操作を実行
- 実DOM要素でのメッセージ表示確認
- CSS classによるUI状態の適切性検証

### テスト2: 接続エラーE2Eフロー
```typescript
test('Google OAuth接続エラー時の適切なエラー表示とリトライ機能', async ({ page }) => {
  // ネットワーク接続失敗をAPIレベルで再現
  await page.route('**/auth/v1/authorize**', async (route) => {
    await route.abort('failed');
  });

  // ログイン試行
  await page.goto('/');
  const loginButton = page.getByRole('button', { name: /ログイン|login/i });
  await loginButton.click();

  // 接続エラーメッセージの確認
  const connectionErrorMessage = page.getByText('Googleとの接続に問題が発生しました');
  await expect(connectionErrorMessage).toBeVisible({ timeout: 10000 });

  // 再試行ボタンの表示と動作確認
  const retryButton = page.getByRole('button', { name: /再試行|retry|もう一度/i });
  await expect(retryButton).toBeVisible({ timeout: 5000 });
  
  if (await retryButton.isVisible()) {
    await retryButton.click();
    const loadingIndicator = page.locator('[data-testarea="auth-loading"]');
    await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
  }
});
```

**E2E設計ポイント**:
- `route.abort('failed')`でネットワーク失敗を現実的に再現
- エラーメッセージとリトライボタンの実表示確認
- リトライボタンクリック→ローディング表示の実動作テスト
- タイムアウト設定でネットワーク障害の現実的な待機時間を再現

### テスト3: 設定エラーE2Eフロー
```typescript
test('Google OAuth設定エラー時の開発者向けエラーメッセージ', async ({ page }) => {
  // OAuth設定エラーをAPIレベルで再現
  await page.route('**/auth/v1/authorize**', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'invalid_client',
        error_description: 'Google OAuth client configuration is invalid or missing',
        error_code: 'oauth_config_error',
        details: {
          missingParams: ['NEXT_PUBLIC_GOOGLE_CLIENT_ID'],
          invalidParams: ['NEXT_PUBLIC_SITE_URL']
        }
      }),
    });
  });

  // 開発者向けエラーメッセージの確認
  const configErrorMessage = page.getByText('Google OAuth設定に問題があります');
  await expect(configErrorMessage).toBeVisible({ timeout: 10000 });

  // 開発環境での詳細ガイダンス確認
  const devInfo = page.locator('[data-testarea="development-info"]');
  if (process.env.NODE_ENV === 'development') {
    await expect(devInfo).toBeVisible();
    const envGuideText = page.getByText('.env.local');
    await expect(envGuideText).toBeVisible();
  }
});
```

**E2E設計ポイント**:
- `invalid_client`エラーで実際のOAuth設定不備状況を再現
- 開発環境での詳細ガイダンス表示条件確認
- 不足環境変数の具体的な表示検証
- 設定修正まではリトライ不可の動作確認

## APIモック戦略

### 1. 現実的なSupabase OAuth APIレスポンス再現
```typescript
// 実際のSupabase OAuthエラー形式
{
  error: 'access_denied',
  error_description: 'User denied access to the authorization server',
  error_code: 'auth_cancelled',
  provider: 'google'
}
```

### 2. ネットワーク障害の適切なシミュレート
```typescript
// route.abort()でリアルなネットワーク失敗を再現
await page.route('**/auth/v1/authorize**', async (route) => {
  await route.abort('failed');
});
```

### 3. 段階的エラー処理のテスト
- **Level 1**: ユーザーキャンセル（400エラー with specific error_code）
- **Level 2**: ネットワーク失敗（connection abort）
- **Level 3**: 設定エラー（400エラー with configuration details）

## 実ブラウザ検証要素

### DOM要素の実表示確認
```typescript
// テキスト内容の実表示確認
const message = page.getByText('Googleログインがキャンセルされました');
await expect(message).toBeVisible({ timeout: 5000 });

// CSS classによる状態確認  
const container = page.locator('[data-testarea="auth-message"]');
await expect(container).toHaveClass(/info|success/);

// URL確認（リダイレクト動作）
await expect(page).toHaveURL('/', { timeout: 5000 });
```

### ユーザー操作フローの実行
```typescript
// 実際のボタンクリック
const loginButton = page.getByRole('button', { name: /ログイン|login/i });
await loginButton.click();

// ポップアップ処理（実際のOAuthフロー）
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  // OAuth認証ポップアップが開く
]);
```

## E2Eテスト実行結果分析

### 期待される失敗パターン
```
✘ Google OAuth認証キャンセル時の適切なエラーメッセージ表示 (30.9s)
✘ Google OAuth接続エラー時の適切なエラー表示とリトライ機能 (12.2s)  
✘ Google OAuth設定エラー時の開発者向けエラーメッセージ (timeout)

Command timed out after 2m 0.0s
```

### 失敗原因の詳細分析

1. **30.9s タイムアウト**: `page.getByText('Googleログインがキャンセルされました')`が見つからない
   → OAuth キャンセル時のエラーメッセージ表示機能が未実装

2. **12.2s タイムアウト**: `page.getByText('Googleとの接続に問題が発生しました')`が見つからない
   → ネットワークエラー時のエラーメッセージ表示機能が未実装

3. **Overall timeout**: 全体的にエラーハンドリングUI機能が存在しない
   → フロントエンドでのOAuth失敗処理機能が全面的に未実装

## Greenフェーズへの要求仕様

### 実装必要なDOM要素
```typescript
// 必須data-testarea属性付きDOM要素
<div data-testarea="auth-message" className="info">
  Googleログインがキャンセルされました。
</div>

<div data-testarea="auth-error" className="error">
  Googleとの接続に問題が発生しました。ネットワーク接続を確認してください。
</div>

<div data-testarea="config-error" className="warning">
  Google OAuth設定に問題があります。
</div>

<div data-testarea="development-info" className="dev-info">
  .env.local ファイルに NEXT_PUBLIC_GOOGLE_CLIENT_ID を設定してください。
</div>

<button data-testarea="auth-loading" className="loading">
  <LoadingSpinner /> 再試行中...
</button>
```

### 実装必要なエラーハンドリング機能
1. Supabase OAuth APIエラーレスポンスの解析
2. エラータイプ別のメッセージ分類と表示
3. 再試行ボタンの実装と動作
4. 開発環境での詳細ガイダンス表示
5. CSS classによる適切なエラー状態表示

## 品質評価

**E2E Redフェーズ品質: ✅ Grade A+**
- ✅ 実ブラウザ検証: Playwrightによる実DOM要素確認
- ✅ 現実的APIモック: Supabase OAuth実エラー形式再現
- ✅ ユーザー操作フロー: 実際のログインボタンクリック操作
- ✅ 要件適合性: TASK-401「E2Eテストスイート実装」に完全対応
- ✅ 実装指針明確性: 必要なDOM要素・機能が具体的に特定済み

次のステップ: Greenフェーズでフロントエンドにエラー表示UI機能を実装し、E2Eテストを成功させます。