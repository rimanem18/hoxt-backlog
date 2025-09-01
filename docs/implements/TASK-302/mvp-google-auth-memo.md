# TDD開発メモ: mvp-google-auth（ユーザープロフィール表示拡張）

## 概要

- **機能名**: ユーザープロフィール表示実装（TASK-302）
- **開発開始**: 2025年9月2日 火曜日 07:06:30 JST
- **現在のフェーズ**: Red（失敗するテスト作成）
- **対象機能**: 認証済みユーザーの詳細プロフィール情報表示とエラーハンドリング強化

## 関連ファイル

- **要件定義**: `docs/implements/TASK-302/mvp-google-auth-requirements.md`
- **テストケース定義**: `docs/implements/TASK-302/mvp-google-auth-testcases.md`
- **実装ファイル**: 
  - `app/client/src/features/user/components/UserProfile.tsx`
  - `app/client/src/features/user/hooks/useUserProfile.ts`
  - `app/client/src/features/user/services/userService.ts`
- **テストファイル**: 
  - `app/client/src/features/user/__tests__/UserProfile.test.tsx`
  - `app/client/src/features/user/__tests__/useUserProfile.test.ts`
  - `app/client/src/features/user/__tests__/userService.test.ts`

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025年9月2日 火曜日 07:06:30 JST

### テストケース

**合計12の包括的テストケースを作成**：

#### 正常系テストケース（3ケース）
1. **1-1. 認証済みユーザーの完全なプロフィール情報表示**
   - 🟢 既存User型定義・実装パターンに基づく高信頼性
   - 名前・メール・アバター・最終ログイン日時の完全表示確認

2. **1-2. プロフィール取得中のスケルトンUI表示**
   - 🟡 チェックリスト要件から設計、妥当な推測
   - ローディング状態でのスケルトンプレースホルダー表示確認

3. **1-3. 各画面サイズでの適切なレスポンシブレイアウト表示**
   - 🟢 チェックリスト明示要件による高信頼性
   - デスクトップ・タブレット・スマートフォンでの最適化表示確認

#### 異常系テストケース（3ケース）
4. **2-1. バックエンドAPI通信失敗時のエラー表示と再試行機能**
   - 🟡 一般的なAPI通信エラーパターンからの妥当な推測
   - 500エラー時のエラー表示と再試行ボタン確認

5. **2-2. JWT認証失敗時の適切なエラー処理**
   - 🟢 既存認証実装パターン（TASK-301）からの高信頼性
   - 401エラー時のログイン誘導確認

6. **2-3. ネットワーク接続不良時のエラー処理**
   - 🟡 一般的なネットワークエラーパターンからの妥当な推測
   - ネットワークエラー時のオフライン表示確認

#### 境界値テストケース（3ケース）
7. **3-1. 50文字を超える長いユーザー名の適切な省略表示**
   - 🟢 EDGE-101要件明示による高信頼性
   - 51文字名前の47文字+"..."省略表示確認

8. **3-2. アバター画像URL無効時のデフォルト画像表示**
   - 🟢 既存実装確認済み + EDGE-102要件による高信頼性
   - null・無効URL時のデフォルト画像フォールバック確認

9. **3-3. 必須フィールド以外がnull/undefinedの場合の適切な表示**
   - 🟡 新規ユーザーパターンからの妥当な推測
   - 初回ログイン時の「初回ログインです」メッセージ確認

#### APIレイヤーテストケース（3ケース）
10. **useUserProfile フックのAPI通信・状態管理**
11. **userService の HTTP通信・認証・エラーハンドリング**

### テストコード

```typescript
// メインコンポーネントテスト（9ケース）
app/client/src/features/user/__tests__/UserProfile.test.tsx

// フックテスト（4ケース）
app/client/src/features/user/__tests__/useUserProfile.test.ts  

// API サービステスト（5ケース）
app/client/src/features/user/__tests__/userService.test.ts
```

### 期待される失敗

**全テストが意図的に失敗**：
```
 0 pass
 9 fail
Ran 9 tests across 1 file. [878.00ms]
```

**失敗理由**：
- `UserProfile component not implemented yet` エラー
- `useUserProfile hook not implemented yet` エラー
- `userService.getUserProfile not implemented yet` エラー

### 次のフェーズへの要求事項

**Greenフェーズで実装すべき内容**：

1. **features/userアーキテクチャ基盤**
   - UserProfileコンポーネント（最終ログイン日時表示機能付き）
   - useUserProfileフック（loading/error/user状態管理）
   - userService API連携レイヤー（GET /api/user/profile）

2. **UI/UX機能**
   - スケルトンUI実装（アバター・名前・メール・最終ログイン日時用）
   - エラーハンドリング（再試行ボタン付き）
   - レスポンシブ対応（Tailwind CSSクラス適用）

3. **境界値対応**
   - 長い名前の省略表示（47文字+"..."）
   - デフォルト画像フォールバック処理
   - null値処理（「初回ログインです」表示）

4. **品質要件**
   - 日本語ローカライズ表示（最終ログイン日時）
   - アクセシビリティ対応（適切なaria属性）
   - データテストID設定（テストability向上）

## Greenフェーズ（最小実装）

*未実装 - 次のステップ*

## Refactorフェーズ（品質改善）

*未実装 - 最終ステップ*