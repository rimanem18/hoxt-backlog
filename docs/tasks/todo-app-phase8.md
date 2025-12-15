# TODO リストアプリ - Phase 8: E2Eテスト・統合テスト

## 📄 フェーズ情報

- **要件名**: todo-app
- **フェーズ**: Phase 8 / 8
- **期間**: 5日間（40時間）
- **担当**: 品質保証
- **目標**: E2Eテスト、統合テスト、品質確認

## 🎯 フェーズ概要

### 目的

Playwrightを使用したE2Eテストを実装し、ユーザーシナリオ全体の動作確認を行う。
セキュリティチェック、パフォーマンス確認、品質保証を完了する。

### 成果物

- ✅ E2Eテスト（Playwright）
- ✅ 統合テスト（バックエンド）
- ✅ セキュリティチェック（Semgrep）
- ✅ パフォーマンステスト
- ✅ 品質保証完了

### 依存関係

- **前提条件**: Phase 1〜7完了（全機能実装）
- **このフェーズ完了後**: リリース準備

## 📅 週次計画

### Week 1（5日間）

**Day 1**: TASK-1339 - E2Eテスト環境構築
**Day 2**: TASK-1340 - E2Eテスト（タスク作成・一覧）
**Day 3**: TASK-1341 - E2Eテスト（編集・削除・ステータス変更）
**Day 4**: TASK-1342 - セキュリティチェック
**Day 5**: TASK-1343 - 品質保証・最終確認

## 📋 タスク一覧

### TASK-1339: E2Eテスト環境構築

- [ ] **タスク完了**
- **タスクタイプ**: DIRECT
- **推定工数**: 8時間
- **依存タスク**: TASK-1338
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/client/playwright.config.ts`


ファイル: `app/client/e2e/todo/helpers/auth.ts`

```typescript
import type { Page } from '@playwright/test';

export async function login(page: Page) {
  const authToken = process.env.TEST_AUTH_TOKEN!;

  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('auth-token', token);
  }, authToken);

  await page.reload();
}
```

#### 完了条件

- [ ] Playwright設定が完了する
- [ ] 認証ヘルパーが実装される
- [ ] テスト環境が動作する

#### 参照

- 技術スタック: Playwright 1.55.0
- CLAUDE.md: E2Eテストガイドライン

---

### TASK-1340: E2Eテスト（タスク作成・一覧）

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1339
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/client/e2e/todo/task-create-list.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('タスク作成・一覧', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('タスクが作成され一覧に表示される', async ({ page }) => {
    // Given: タスク作成フォームが表示される
    await expect(page.getByPlaceholder('タスクを入力...')).toBeVisible();

    // When: タスクを作成
    await page.getByPlaceholder('タスクを入力...').fill('E2Eテストタスク');
    await page.getByRole('button', { name: '追加' }).click();

    // Then: タスクが一覧に表示される
    await expect(page.getByText('E2Eテストタスク')).toBeVisible();
  });

  test('優先度フィルタが動作する', async ({ page }) => {
    // Given: 複数のタスクが存在
    await page.getByPlaceholder('タスクを入力...').fill('高優先度タスク');
    await page.getByRole('combobox', { name: '優先度' }).selectOption('high');
    await page.getByRole('button', { name: '追加' }).click();

    // When: 優先度フィルタを適用
    await page.getByRole('combobox', { name: '優先度フィルタ' }).selectOption('high');

    // Then: フィルタされたタスクのみ表示される
    await expect(page.getByText('高優先度タスク')).toBeVisible();
  });

  test('ソート機能が動作する', async ({ page }) => {
    // Given: 複数のタスクが存在

    // When: 優先度ソートを選択
    await page.getByRole('combobox', { name: '並び替え' }).selectOption('priority_desc');

    // Then: 優先度順にソートされる
    const tasks = await page.locator('[data-testid="task-item"]').allTextContents();
    // 優先度順の検証...
  });
});
```

テストケース:
- 正常系: タスク作成
- 正常系: タスク一覧表示
- 正常系: 優先度フィルタ
- 正常系: ステータスフィルタ
- 正常系: ソート

#### 完了条件

- [ ] E2Eテスト（タスク作成・一覧）が実装される
- [ ] すべてのテストが通る

#### 参照

- 要件: REQ-001, REQ-006, REQ-201, REQ-202, REQ-203

---

### TASK-1341: E2Eテスト（編集・削除・ステータス変更）

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1340
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/client/e2e/todo/task-update-delete.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('タスク編集・削除', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    // タスクを事前作成
    await page.getByPlaceholder('タスクを入力...').fill('テストタスク');
    await page.getByRole('button', { name: '追加' }).click();
  });

  test('タスクが編集される', async ({ page }) => {
    // Given: タスクが存在
    await expect(page.getByText('テストタスク')).toBeVisible();

    // When: 編集ボタンをクリック
    await page.getByRole('button', { name: '編集' }).first().click();

    // Then: モーダルが表示される
    await expect(page.getByRole('heading', { name: 'タスクを編集' })).toBeVisible();

    // When: タスクを編集
    await page.getByLabel('タイトル').fill('編集済みタスク');
    await page.getByRole('button', { name: '保存' }).click();

    // Then: タスクが更新される
    await expect(page.getByText('編集済みタスク')).toBeVisible();
  });

  test('タスクが削除される', async ({ page }) => {
    // Given: タスクが存在
    await expect(page.getByText('テストタスク')).toBeVisible();

    // When: 削除ボタンをクリック
    await page.getByRole('button', { name: '削除' }).first().click();

    // Then: タスクが削除される
    await expect(page.getByText('テストタスク')).not.toBeVisible();
  });

  test('ステータスが変更される', async ({ page }) => {
    // Given: タスクが存在（未着手）
    await expect(page.getByText('テストタスク')).toBeVisible();

    // When: ステータスを変更
    const statusSelect = page.getByRole('combobox', { name: 'ステータス' }).first();
    await statusSelect.selectOption('in_progress');

    // Then: ステータスが更新される
    await expect(statusSelect).toHaveValue('in_progress');
  });

  test('Markdown説明が表示される', async ({ page }) => {
    // Given: Markdown説明を持つタスクを作成
    await page.getByRole('button', { name: '編集' }).first().click();
    await page.getByLabel('説明（Markdown）').fill('## チェックリスト\n- [ ] タスク1');
    await page.getByRole('button', { name: '保存' }).click();

    // When: タスクを展開

    // Then: Markdownが表示される
    await expect(page.getByRole('heading', { name: 'チェックリスト' })).toBeVisible();
  });
});
```

テストケース:
- 正常系: タスク編集
- 正常系: タスク削除
- 正常系: ステータス変更
- 正常系: Markdown表示

#### 完了条件

- [ ] E2Eテスト（編集・削除・ステータス変更）が実装される
- [ ] すべてのテストが通る

#### 参照

- 要件: REQ-002, REQ-003, REQ-004, REQ-007

---

### TASK-1342: セキュリティチェック

- [ ] **タスク完了**
- **タスクタイプ**: DIRECT
- **推定工数**: 8時間
- **依存タスク**: TASK-1341
- **要件名**: todo-app

#### 実装詳細

**1. Semgrepスキャン**

```bash
docker compose run --rm semgrep semgrep scan --config=auto --sarif -o semgrep-report.sarif
```

チェック項目:
- SQLインジェクション
- XSS
- CSRF
- JWT検証の脆弱性
- 不適切な認証・認可

**2. RLSテスト**

ファイル: `app/server/src/infrastructure/__tests__/rls.integration.test.ts`

```typescript
test('他ユーザーのタスクにアクセスできない', async () => {
  // Given: ユーザーAがタスクを作成
  const userA = 'user-a-id';
  const userB = 'user-b-id';

  await RlsHelper.setCurrentUser(db, userA);
  const taskA = await repository.save(createTask());

  // When: ユーザーBがユーザーAのタスクにアクセス
  await RlsHelper.setCurrentUser(db, userB);
  const result = await repository.findById(userB, taskA.getId());

  // Then: nullが返される（アクセス不可）
  expect(result).toBeNull();
});
```

**3. JWT検証テスト**

- 有効なJWT
- 無効なJWT
- 期限切れJWT
- subクレームなし

#### 完了条件

- [ ] Semgrepスキャンが合格する
- [ ] RLSテストが通る
- [ ] JWT検証テストが通る
- [ ] OWASP Top 10の脆弱性がない

#### 参照

- 要件: NFR-102, NFR-103, NFR-104
- 技術スタック: Semgrep 1.96.0

---

### TASK-1343: 品質保証・最終確認

- [ ] **タスク完了**
- **タスクタイプ**: DIRECT
- **推定工数**: 8時間
- **依存タスク**: TASK-1342
- **要件名**: todo-app

#### 実装詳細

**1. テストカバレッジ確認**

```bash
# サーバー側
docker compose exec server bun test --coverage

# クライアント側
docker compose exec client bun test --coverage
```

目標: 80%以上

**2. 型チェック・Biomeチェック**

```bash
# 型チェック
docker compose exec server bun run typecheck
docker compose exec client bun run typecheck

# Biomeチェック
docker compose exec server bun run check
docker compose exec client bun run check
```

**3. パフォーマンステスト**

- タスク一覧取得: 1秒以内
- タスク作成: 500ms以内
- タスク更新: 500ms以内

**4. ブラウザ互換性確認**

- Chrome（最新版）
- Firefox（最新版）
- Safari（最新版）

**5. レスポンシブデザイン確認**

- モバイル（375px）
- タブレット（768px）
- デスクトップ（1920px）

**6. アクセシビリティ確認**

- キーボード操作
- スクリーンリーダー対応
- WCAG 2.1 AA準拠

#### 完了条件

- [ ] テストカバレッジ80%以上
- [ ] 型チェック合格
- [ ] Biomeチェック合格
- [ ] パフォーマンステスト合格
- [ ] ブラウザ互換性確認完了
- [ ] レスポンシブデザイン確認完了
- [ ] アクセシビリティ確認完了

#### 参照

- 要件: NFR-001, NFR-002, NFR-201
- 技術スタック: すべて

---

## 🎉 フェーズ完了チェックリスト

### E2Eテスト

- [ ] E2Eテスト環境構築完了
- [ ] タスク作成・一覧テスト完了
- [ ] 編集・削除・ステータス変更テスト完了
- [ ] すべてのE2Eテストが通る

### セキュリティ

- [ ] Semgrepスキャン合格
- [ ] RLSテスト合格
- [ ] JWT検証テスト合格
- [ ] OWASP Top 10の脆弱性なし

### 品質保証

- [ ] テストカバレッジ80%以上
- [ ] 型チェック合格
- [ ] Biomeチェック合格
- [ ] パフォーマンステスト合格
- [ ] ブラウザ互換性確認完了
- [ ] レスポンシブデザイン確認完了
- [ ] アクセシビリティ確認完了

### リリース準備

- [ ] すべてのフェーズ完了
- [ ] ドキュメント整備完了
- [ ] デプロイ手順確認完了

---

## 📚 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Semgrep公式ドキュメント](https://semgrep.dev/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 📝 メモ

### 実装時の注意事項

1. **E2Eテスト**: storageState APIで認証状態管理
2. **セキュリティ**: RLS動作確認を徹底
3. **品質保証**: すべての確認項目をチェック
4. **リリース準備**: デプロイ手順を確認

### トラブルシューティング

- **E2Eテスト失敗**: Trace Viewerで原因分析
- **セキュリティ**: Semgrepレポートを詳細確認
- **パフォーマンス**: クエリ最適化、インデックス確認
