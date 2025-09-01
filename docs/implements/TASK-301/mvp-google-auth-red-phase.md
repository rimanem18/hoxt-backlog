# TDD開発メモ: mvp-google-auth（Redフェーズ）

## 概要

- **機能名**: mvp-google-auth (フロントエンド認証フロー)
- **開発開始**: 2025-08-31
- **現在のフェーズ**: Red（失敗するテスト作成）
- **対象テストケース**: 4-1. ローディング状態管理テスト（REQ-UI-001対応）

## 関連ファイル

- **要件定義**: `docs/implements/TASK-301/mvp-google-auth-requirements.md`
- **テストケース定義**: `docs/implements/TASK-301/mvp-google-auth-testcases.md`
- **実装ファイル**: `app/client/src/features/auth/components/LoginButton.tsx` (未実装)
- **テストファイル**: `app/client/src/features/auth/__tests__/ui-ux/LoadingState.test.tsx`

---

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025-08-31

### 選定したテストケース

**4-1. ローディング状態管理テスト（REQ-UI-001対応）**

- **テスト名**: 認証処理中のローディングUI表示と操作制御確認
- **優先度**: 🟥 優先度1（プロダクション品質必須・緊急）
- **信頼性レベル**: 🟢 REQ-UI-001要件と既存実装から直接抽出

### 作成したテストコード

**ファイルパス**: `/app/client/src/features/auth/__tests__/ui-ux/LoadingState.test.tsx`

```typescript
/**
 * UI/UXテスト: ローディング状態管理テスト
 * REQ-UI-001対応 - 認証処理中のローディングUI表示と操作制御確認
 */

// 主要テストケース:
// 1. 認証処理中のローディングUI表示と操作制御確認
// 2. ダブルクリック防止機能の確認  
// 3. 長時間処理対応メッセージの表示確認

// 検証項目:
// - ボタン無効化: disabled={true} 属性設定
// - スピナー表示: Loading コンポーネント表示
// - ARIA属性: aria-busy="true" 設定
// - ラベル変更: 「認証中...」テキスト表示
// - 重複実行防止: 0.5秒以内の連続クリック制御
// - 長時間処理対応: 10秒経過時の追加メッセージ表示
```

### 期待される失敗

**実行コマンド**: 
```bash
docker compose exec client bun test src/features/auth/__tests__/ui-ux/LoadingState.test.tsx
```

**失敗メッセージ**:
```
error: Cannot find module '@/features/auth/components/LoginButton' from '/home/bun/app/client/src/features/auth/__tests__/ui-ux/LoadingState.test.tsx'

0 pass
1 fail  
1 error
```

**失敗理由**: 
- `LoginButton` コンポーネントが存在しない（未実装）
- テストで要求している機能がすべて未実装状態

### 次のフェーズへの要求事項

**Greenフェーズで実装すべき内容**:

1. **LoginButtonコンポーネント作成**
   - ファイル: `app/client/src/features/auth/components/LoginButton.tsx`
   - Props: `{ provider: 'google' | 'apple' }` （プロバイダー非依存）

2. **ローディング状態管理機能**
   - `useState` でローディング状態管理
   - `isLoading` 状態による UI 制御

3. **UI要素の実装**
   - ボタン無効化: `disabled={isLoading}` 
   - スピナーコンポーネント: `testId="loading-spinner"`
   - ARIA属性: `aria-busy`・`aria-label`
   - 動的ラベル: 「認証中...」への変更

4. **アクセシビリティ対応**
   - WCAG 2.1 AA準拠の実装
   - スクリーンリーダー対応
   - キーボード操作対応

5. **エッジケース対応**
   - ダブルクリック防止機能
   - 長時間処理対応（10秒経過メッセージ）

### 技術仕様

- **使用技術**: TypeScript + React + Tailwind CSS
- **テストフレームワーク**: Bun Test + @testing-library/react
- **状態管理**: React useState (ローカル状態)
- **アクセシビリティ**: @testing-library/jest-dom matchers

### 設計方針

- **プロバイダー非依存**: 将来のApple認証対応を見据えた抽象化
- **コンポーネント分離**: LoginButton として独立性確保
- **テスタビリティ重視**: test-id よりセマンティックな要素選択
- **UI/UX品質優先**: REQ-UI-001～004 要件の確実な実装

---

## 品質評価（Redフェーズ）

### テスト品質: ✅ 高品質

- **テスト実行**: ✅ 期待通りに失敗（モジュール未存在エラー）
- **期待値**: ✅ 明確で具体的（ARIA属性・DOM要素・動作仕様）
- **アサーション**: ✅ 適切（アクセシビリティ・UI状態・機能動作）
- **実装方針**: ✅ 明確（コンポーネント設計・技術選定が具体的）

### 信頼性レベル分析

- 🟢 青信号: 80% (REQ-UI-001要件から直接抽出)
- 🟡 黄信号: 20% (EDGE-UI-001・002からの妥当な推測)
- 🔴 赤信号: 0% (推測による要件なし)

---

## 次のステップ

**推奨アクション**: `/tdd-green` でGreenフェーズ（最小実装）を開始

**実装優先順序**:
1. **LoginButtonコンポーネント**: 基本構造とProps定義
2. **ローディング状態管理**: useState によるUI制御
3. **ARIA属性設定**: アクセシビリティ要件対応
4. **スピナーコンポーネント**: 視覚的フィードバック
5. **エッジケース機能**: ダブルクリック防止・長時間処理対応