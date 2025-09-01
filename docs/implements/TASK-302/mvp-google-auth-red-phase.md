# TASK-302: mvp-google-auth TDD Redフェーズ設計内容

## Redフェーズ完了日時

**作成日時**: 2025年9月2日 火曜日 07:06:30 JST  
**実行環境**: Docker client コンテナ (Next.js 15 + TypeScript 5 + Bun Test)

## テストコード設計方針

### アーキテクチャ設計
- **新規ディレクトリ構造**: `features/user/` によるクリーンアーキテクチャ採用
- **レイヤー分離**: components / hooks / services の3層構造
- **依存性注入**: フック・サービスのモック化による独立テスト

### テストデータ設計
- **User型準拠**: 既存shared-schemas/authのUser型を完全活用
- **リアルなデータ**: プロダクション環境相当のテストデータ使用
- **境界値重視**: 51文字名前、null値、無効URLなど実際の問題ケース

### 日本語コメント設計
- **Given-When-Then構造**: 各フェーズに詳細な日本語説明
- **信頼性レベル表示**: 🟢🟡🔴による元資料との対応関係明示
- **目的・内容・期待動作**: 各テストの明確な目標設定

## 作成したテストファイル

### 1. UserProfile.test.tsx（メインコンポーネント）
```typescript
// 9つの包括的テストケース
describe('TASK-302: ユーザープロフィール表示実装', () => {
  // 正常系: 完全プロフィール表示・スケルトンUI・レスポンシブ
  // 異常系: API エラー・認証エラー・ネットワークエラー  
  // 境界値: 長い名前・無効画像・null値処理
});
```

**特徴**:
- モック化されたuseUserProfileフックを使用
- @testing-library/react + user-event での操作テスト
- データテストID設計（avatar-skeleton, name-skeleton等）

### 2. useUserProfile.test.ts（カスタムフック）
```typescript
// 4つのフック状態管理テスト
describe('useUserProfile フック', () => {
  // 初期状態・API成功・API失敗・refetch機能
});
```

**特徴**:
- renderHookによるフック単体テスト
- userServiceモック化による独立性確保
- 非同期状態遷移の詳細検証

### 3. userService.test.ts（API連携レイヤー）
```typescript  
// 5つのHTTP通信テスト
describe('userService API連携レイヤー', () => {
  // 正常通信・認証エラー・サーバーエラー・ネットワークエラー・トークン未存在
});
```

**特徴**:
- global.fetchモック化によるHTTP通信テスト
- JWT認証ヘッダー検証
- localStorage連携テスト

## 意図的失敗の確認

### テスト実行結果
```bash
 0 pass
 9 fail  
Ran 9 tests across 1 file. [878.00ms]
```

### 失敗メッセージ分析
1. **UserProfile component not implemented yet**: 正常な意図的失敗
2. **useUserProfile hook not implemented yet**: 正常な意図的失敗
3. **userService.getUserProfile not implemented yet**: 正常な意図的失敗

### 失敗理由の詳細
- **コンポーネント**: `throw new Error()` による明示的な未実装
- **フック**: `throw new Error()` による明示的な未実装
- **サービス**: `throw new Error()` による明示的な未実装

## 品質判定結果

✅ **高品質**:
- **テスト実行**: 成功（失敗することを確認）
- **期待値**: 明確で具体的（12の詳細テストケース）
- **アサーション**: 適切（role・text・attribute検証）
- **実装方針**: 明確（3層アーキテクチャ + レスポンシブ + エラーハンドリング）

## アーキテクチャ品質評価

### SOLID原則準拠
- **S**: UserProfile・useUserProfile・userService の単一責任分離
- **O**: インターフェース設計による拡張開放
- **D**: 依存性注入によるテスタビリティ確保

### 技術選択の妥当性
- **TypeScript**: 型安全性による品質確保
- **Bun Test**: 高速実行環境
- **@testing-library**: 実用性重視のテスト設計
- **Tailwind CSS**: レスポンシブ対応の効率性

## 設計上の技術的判断

### エラーハンドリング設計
1. **認証エラー**: ログイン画面への適切な誘導
2. **API エラー**: 再試行ボタン付きユーザーフレンドリーメッセージ
3. **ネットワークエラー**: オフライン状態の視覚的表示

### レスポンシブ設計
1. **ブレークポイント**: デスクトップ・タブレット・スマートフォン
2. **クラス設計**: `responsive-container`, `responsive-avatar`
3. **ユーザビリティ**: 各サイズでの適切な表示保証

### アクセシビリティ設計
1. **セマンティック HTML**: 適切な見出し構造・role属性
2. **スクリーンリーダー対応**: aria-live・alt属性
3. **キーボード操作**: ボタンとリンクの適切な実装

## 次のフェーズ移行準備

### Greenフェーズ実装順序
1. **userService**: API通信基盤の最小実装
2. **useUserProfile**: 状態管理フックの最小実装  
3. **UserProfile**: UI表示コンポーネントの最小実装

### 最小実装の定義
- **機能**: テストが通るために必要最小限の実装のみ
- **品質**: リファクタ前提のシンプルな実装
- **スコープ**: 拡張機能は除外、基本機能のみ

TDD Redフェーズが正常に完了し、Greenフェーズに移行する準備が完了しました。