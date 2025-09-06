# TDD Red フェーズ: mvp-google-auth

## 実行日時
2025-09-04 18:11:31 JST

## 対象テストケース
- **T001: Google OAuth初回ログイン成功フロー**
- **T000: アプリケーション基本接続確認**

## 作成されたテストコード

### 1. メイン認証フローテスト

**ファイル**: `app/client/e2e/auth.spec.ts`

**テスト内容**:
- Google OAuthを使用した初回ログイン
- JITプロビジョニングによるユーザー作成
- ユーザープロフィール表示の確認

**信頼性レベル**: 🔴 要件から推測したE2Eテストフロー（実装詳細未確定）

### 2. 基本接続テスト

**ファイル**: `app/client/e2e/basic.spec.ts`

**テスト内容**:
- Next.jsアプリケーションの基本接続確認
- 認証UI要素の存在確認（簡易版）

**信頼性レベル**: 🟢 基本接続（推測なし）、🟡 UI要素（推測含む）

## 設定ファイル

### Playwright設定

**ファイル**: `app/client/playwright.config.ts`

**主要設定**:
- Docker Compose環境での実行に最適化
- ベースURL: `http://localhost:3000`
- 失敗時のトレース・スクリーンショット記録
- Chromium、Firefox対応

### package.json スクリプト追加

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui", 
  "test:e2e:headed": "playwright test --headed"
}
```

## テスト実行結果（期待される失敗）

### 環境セットアップエラー

```
Error: browserType.launch: Executable doesn't exist at .cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell
```

**原因**: Docker環境でのPlaywrightブラウザインストール不備

### 期待される失敗パターン

1. **認証UI未実装**
   - `getByRole('button', { name: /ログイン|login/i })` が見つからない
   
2. **OAuth認証フロー未実装**
   - Google認証画面への遷移が実装されていない
   
3. **ユーザー管理機能未実装**
   - ダッシュボードページが存在しない
   - ユーザープロフィール表示要素が存在しない

## テスト実行コマンド

```bash
# 基本実行
docker compose exec client bun run test:e2e

# 特定ファイルのみ実行
docker compose exec client bunx playwright test e2e/basic.spec.ts --project=chromium

# UI付きで実行
docker compose exec client bun run test:e2e:ui
```

## 品質判定

### 品質レベル: ⚠️ 要改善

- **テスト実行**: 環境問題により実行不可
- **期待値**: 明確で具体的 ✅
- **アサーション**: 適切 ✅
- **実装方針**: 明確 ✅

### 改善が必要な点

1. **環境セットアップ**: Playwrightブラウザインストール問題の解決
2. **テスト実行環境**: Docker環境での安定したテスト実行環境構築

### 完了条件

- [x] 失敗するテストコードの作成
- [x] テストファイル・設定ファイルの作成
- [x] package.jsonスクリプトの追加
- [x] 期待される失敗パターンの特定
- [ ] 実際のテスト実行による失敗確認（環境問題により未完了）

## 次のステップ

Greenフェーズでは以下を実装する必要があります：

1. **環境修正**: Playwright実行環境の整備
2. **認証UI**: ログインボタン・認証フロー
3. **OAuth統合**: Google OAuthプロバイダー設定
4. **ユーザー管理**: JITプロビジョニング・プロフィール表示

**推奨次コマンド**: `/tdd-green` でGreenフェーズ（最小実装）を開始

---

# TDD Red Phase: T002 既存ユーザーの再ログインフロー

## 作成日時
2025-09-05 22:07:46 JST

## テストケース詳細

### テスト概要
- **ID**: T002
- **名称**: 既存ユーザーの再ログインフローテスト
- **目的**: 過去にログイン履歴がある既存ユーザーの認証フロー検証
- **重要度**: 🔴 高優先度（必須実装）

### 検証対象機能

#### 1. 既存ユーザー判定ロジック
- `isNewUser: false`フラグの適切な設定
- JITプロビジョニングのスキップ処理
- 既存ユーザーとしての認証フロー実行

#### 2. lastLoginAt更新処理  
- ログイン時の日時フィールド自動更新
- データベースへの更新処理の実行
- UI上でのlastLoginAt情報表示

#### 3. ユーザー体験の区別
- 新規ユーザーと既存ユーザーのメッセージ区別
- 「おかえりなさい！」等の既存ユーザー向けメッセージ
- ウェルカムメッセージの適切な条件分岐

### テスト設計

#### Given（前提条件）
```typescript
// 2日前にログイン履歴がある既存ユーザー
const existingUser = {
  id: 'existing-user-456',
  name: 'Existing User',
  email: 'existing.user@example.com',
  avatarUrl: null,
  lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};
```

#### When（実行条件）
1. 既存ユーザーの認証情報でログイン試行
2. `/dashboard`ページへアクセス
3. 既存ユーザー向けの認証フロー実行

#### Then（期待結果）
1. **基本表示**: ダッシュボードページが正常表示される
2. **ユーザー情報**: 既存ユーザーの名前・メールアドレスが表示される
3. **lastLoginAt**: ログイン日時が更新され表示される（🔴 未実装機能）
4. **メッセージ**: 既存ユーザー向けメッセージが表示される（🔴 未実装機能）

### 実装済みテストコード

#### ファイル位置
`app/client/e2e/auth.spec.ts`

#### 主要なテスト実装内容

```typescript
test('T002: 既存ユーザーの再ログインフローテスト', async ({ page }) => {
  // TODO(human) 既存ユーザーの再ログイン機能実装が必要
  // 以下の機能が未実装のため、現在このテストは失敗します:
  // 1. 既存ユーザー判定ロジック（isNewUser: false）
  // 2. lastLoginAt フィールドの更新処理  
  // 3. JITプロビジョニングのスキップ処理

  // 既存ユーザーのテストデータ準備
  const existingUser = { /* ... */ };
  
  // 認証環境セットアップ
  await setupAuthenticatedTestEnvironment(page, existingUser);
  
  // 再ログインAPIモック設定
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: { ...existingUser, lastLoginAt: new Date().toISOString() },
          isNewUser: false,  // 【確認内容】: 既存ユーザーフラグ
          sessionToken: 'updated_session_token_for_existing_user',
        },
      }),
    });
  });

  // ダッシュボードアクセス・検証
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  // 基本表示確認（🟡 妥当な推測）
  const dashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
  await expect(dashboardTitle).toBeVisible({ timeout: 10000 });
  
  // ユーザー情報表示確認（🟡 妥当な推測）
  const userNameHeading = page.locator('h2').filter({ hasText: existingUser.name });
  await expect(userNameHeading).toBeVisible({ timeout: 5000 });
  
  // lastLoginAt更新確認（🔴 元資料にない推測）
  const loginInfoElement = page.locator('[data-testarea="last-login-info"]');
  await expect(loginInfoElement).toContainText('最終ログイン');
  
  // 既存ユーザーメッセージ確認（🔴 元資料にない推測）
  const existingUserMessage = page.getByText('おかえりなさい！', { exact: false });
  await expect(existingUserMessage).toBeVisible();
});
```

## テスト実行結果

### 実行コマンド
```bash
docker compose exec e2e npx playwright test e2e/auth.spec.ts -g "T002" --reporter=line
```

### 期待される失敗結果 ✅

**失敗状況**: ✅ **期待通りに失敗を確認**

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'ダッシュボード' })
Expected: visible  
Received: <element(s) not found>
Timeout: 10000ms

at /workspace/e2e/auth.spec.ts:117:34
```

### 失敗理由分析

#### 根本原因
1. **既存ユーザー判定ロジック未実装**: `isNewUser: false`の処理が実装されていない
2. **lastLoginAt更新処理未実装**: ログイン日時の自動更新機能が未実装
3. **既存ユーザー向けUI未実装**: 条件分岐によるメッセージ表示が未実装
4. **JITプロビジョニング制御未実装**: 既存ユーザー時の新規作成回避が未実装

#### テスト失敗の段階
- **第1段階**: ダッシュボードページ自体が表示されない
- **想定される後続失敗**: lastLoginAt表示要素・既存ユーザーメッセージの検証も失敗予定

## 信頼性レベル評価

### 🟡 黄信号（妥当な推測）
- ダッシュボードページの基本表示確認
- ユーザー名・メールアドレスの表示検証
- 基本的な認証フロー動作の期待値

### 🔴 赤信号（元資料にない推測）
- `[data-testarea="last-login-info"]`セレクタの具体的な実装仕様
- 「おかえりなさい！」メッセージの具体的な文言・表示位置
- lastLoginAt表示の詳細なUI仕様

## 次のフェーズへの要求

### Greenフェーズで実装すべき内容

#### 1. バックエンド機能実装
- **既存ユーザー判定ロジック**: データベース内のユーザー存在確認
- **lastLoginAt更新機能**: ログイン時の日時自動更新処理
- **認証APIレスポンス修正**: `isNewUser`フラグの適切な設定

#### 2. フロントエンド機能実装
- **条件分岐実装**: 新規ユーザー・既存ユーザーに応じたメッセージ表示
- **UI要素追加**: lastLoginAt表示エリアの実装
- **既存ユーザー向けメッセージ**: 「おかえりなさい！」メッセージの実装

#### 3. テスト通過のための最小実装
- **ダッシュボードページ表示**: 既存ユーザーでもアクセス可能にする
- **基本的なUI要素**: lastLoginAt表示領域の作成
- **メッセージ表示**: 既存ユーザー判定によるメッセージ切り替え

## 品質判定

### Red Phase品質評価: ✅ **高品質**

**評価理由**:
- **テスト実行**: ✅ 成功（失敗することを確認）
- **期待値**: ✅ 明確で具体的
- **アサーション**: ✅ 適切な検証項目
- **実装方針**: ✅ Greenフェーズで実装すべき内容が明確

## 推奨される次ステップ

1. **`/tdd-green`**: T002のGreenフェーズ（最小実装）を開始
2. **実装優先順位**: 既存ユーザー判定ロジック → UI条件分岐 → lastLoginAt更新
3. **段階的実装**: まずテストを通すための最小限の実装から開始
