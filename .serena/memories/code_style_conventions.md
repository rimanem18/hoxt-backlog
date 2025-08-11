# コードスタイル・規約

## 共通スタイル

### フォーマッティング（Biome）
- **インデント**: スペース2つ
- **クォート**: シングルクォート（'）
- **自動インポート整理**: 有効
- **ファイル末尾**: 改行必須

### TypeScript規約
- **厳格な型安全性**: any型禁止（特別な理由がある場合のみコメント付きで許可）
- **型注釈**: 明示的な型定義を推奨
- **@ts-ignore禁止**: @ts-expect-errorで代替

### ドキュメンテーション規約

#### 関数/メソッドのJSDoc
```typescript
/**
 * 何をするかの仕様（What）を記載
 * @param paramName - パラメータの説明
 * @returns 戻り値の説明
 * @throws Error エラーケースの説明
 */
```

#### 関数内コメント
```typescript
// なぜこの処理が必要なのか（Why）を記載
// なぜこの実装方法を選んだのかの理由
```

## プロジェクト固有規約

### 命名規則
- **クラス**: PascalCase（例: `GreetEntity`）
- **関数/メソッド**: camelCase（例: `getValue()`）
- **定数**: UPPER_SNAKE_CASE
- **ファイル名**: PascalCase.ts（例: `GreetEntity.ts`）

### 禁止事項
- `var` の使用
- `let` の多用（constを優先）
- `JSX.Element` 型（React.ReactNodeで代替）
- テストの `.skip`（TODO コメントで代替）

### 推奨事項
- 1行80文字以内
- `const` の積極的使用
- テスト駆動開発
- 統合テスト重視（過度なモックは非推奨）