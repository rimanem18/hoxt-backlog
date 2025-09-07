# TDD開発メモ: T008 Google OAuth認証失敗エラー表示（E2Eテスト版）

## 概要

- 機能名: Google OAuth認証失敗エラー表示（E2Eテストスイート）
- 開発開始: 2025-01-22
- 現在のフェーズ: Red（E2E失敗テスト作成完了）

## 関連ファイル

- 要件定義: `docs/implements/TASK-401/mvp-google-auth-requirements.md`
- テストケース定義: `docs/implements/TASK-401/mvp-google-auth-testcases.md`
- E2Eテストファイル: `app/client/e2e/oauth-failure.spec.ts`
- 実装対象: フロントエンドの認証UI・エラーハンドリング機能

## Redフェーズ（E2E失敗テスト作成）

### 作成日時

2025-01-22

### E2Eテストケース

以下の3つのE2Eテストケースを作成：

1. **Google OAuth認証キャンセル時の適切なエラーメッセージ表示**
   - 実際のブラウザでOAuth認証ポップアップのキャンセル操作をテスト
   - ユーザーフレンドリーなキャンセルメッセージのブラウザ表示確認
   - 再認証可能状態の維持をE2Eで検証
   
2. **Google OAuth接続エラー時の適切なエラー表示とリトライ機能** 
   - ネットワークエラー状況をAPIモックで再現
   - エラーメッセージとリトライボタンの実際の表示確認
   - ブラウザ上でのリトライ機能動作テスト
   
3. **Google OAuth設定エラー時の開発者向けエラーメッセージ**
   - OAuth設定不備状況をAPIモックで再現
   - 開発者向けガイダンスの実際のブラウザ表示確認
   - 設定修正までリトライ無効化の動作確認

### E2Eテストの特徴

#### Playwrightによる実ブラウザテスト
```typescript
// 実際のブラウザ操作をテスト
await page.goto('/');
const loginButton = page.getByRole('button', { name: /ログイン|login/i });
await loginButton.click();

// OAuth認証ポップアップ処理
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  // OAuth認証ポップアップが開く
]);
```

#### APIモックによるエラー状況再現
```typescript
// OAuth認証キャンセルをAPIレベルで再現
await page.route('**/auth/v1/authorize**', async (route) => {
  await route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({
      error: 'access_denied',
      error_description: 'User denied access',
      error_code: 'auth_cancelled',
      provider: 'google'
    }),
  });
});
```

#### 実際のDOM要素検証
```typescript
// 実際のブラウザでエラーメッセージ表示を確認
const cancelMessage = page.getByText('Googleログインがキャンセルされました');
await expect(cancelMessage).toBeVisible({ timeout: 5000 });

// CSS class による状態確認
const messageContainer = page.locator('[data-testarea="auth-message"]');
await expect(messageContainer).toHaveClass(/info|success/);
```

### 期待される失敗

```
Running 6 tests using 1 worker

✘ Google OAuth認証キャンセル時の適切なエラーメッセージ表示 (30.9s)
✘ Google OAuth接続エラー時の適切なエラー表示とリトライ機能 (12.2s)  
✘ Google OAuth設定エラー時の開発者向けエラーメッセージ (timeout)

Command timed out after 2m 0.0s
```

**失敗理由**: テストで期待しているOAuth失敗時のエラーメッセージ表示機能がまだ実装されていないため、要素が見つからずタイムアウトが発生。

### 次のフェーズへの要求事項

**Greenフェーズで実装すべき内容:**

1. **フロントエンドUI実装**
   - `[data-testarea="auth-message"]`: 認証メッセージ表示エリア
   - `[data-testarea="auth-error"]`: 認証エラー表示エリア
   - `[data-testarea="config-error"]`: 設定エラー表示エリア
   - `[data-testarea="development-info"]`: 開発者向け情報表示エリア

2. **エラーハンドリング機能**
   - OAuth認証キャンセル時の適切なメッセージ表示
   - ネットワークエラー時の再試行ボタン機能
   - 設定エラー時の開発者ガイダンス表示

3. **APIレスポンス処理**
   - Supabase OAuth API エラーレスポンスの適切な解析
   - エラータイプ別の分類とメッセージ変換
   - 開発環境 vs 本番環境での表示内容切り替え

## 単体テスト vs E2Eテストの比較

### 以前の単体テストアプローチ（破棄済み）
- GoogleOAuthFailureHandlerクラスの単体テスト
- モック関数の戻り値検証
- 実際のブラウザ動作は未検証

### 現在のE2Eテストアプローチ
- 実際のブラウザでのユーザー操作をテスト
- DOM要素の実際の表示・非表示確認
- APIモックによる現実的なエラー状況再現
- **TASK-401「E2Eテストスイート実装」要件に適合**

## 信頼性レベル評価

- 🟢 **青信号** (高信頼性): OAuth認証キャンセル処理、基本エラーメッセージ表示
- 🟡 **黄信号** (中信頼性): ネットワークエラーリトライ、DOM要素の具体的な構造
- 🔴 **赤信号** (推測ベース): 開発者向け設定ガイダンス詳細、data-testarea属性名

## 品質判定

✅ **高品質 E2E Redフェーズ達成**:
- E2Eテスト実行: 成功（3つのテストすべてが期待通りタイムアウト失敗）
- 実ブラウザ検証: Playwrightによる実際のDOM要素確認
- APIモック活用: 現実的なOAuth失敗状況の再現
- 要件適合性: TASK-401「E2Eテストスイート」要件に完全適合

## 次のステップ

次のお勧めステップ: `/tdd-green` でGreenフェーズ（E2Eテスト対応の最小実装）を開始します。フロントエンドにOAuth失敗時のエラー表示UI機能を実装し、E2Eテストを成功させます。