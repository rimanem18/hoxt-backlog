# バージョン更新履歴 (2025-12-06)

## 主要な変更

### Next.js 15 → 16 へのメジャーアップデート

**重要な変更点**:
- **JSX設定**: `tsconfig.json` の `jsx` が `"preserve"` から `"react-jsx"` に変更
- **型定義追加**: `.next/dev/types/**/*.ts` が `include` に追加
- 破壊的変更の可能性があるため、アプリケーションの動作確認が必要

### 依存パッケージのバージョンアップ

#### フロントエンド主要パッケージ
| パッケージ | 旧バージョン | 新バージョン | 変更種別 |
|-----------|-------------|-------------|---------|
| Next.js | 15.4.6 | 16.0.7 | メジャー |
| React | 19.1.0 | 19.2.1 | マイナー |
| React-DOM | 19.1.0 | 19.2.1 | マイナー |
| @reduxjs/toolkit | 2.8.2 | 2.11.0 | マイナー |
| @supabase/supabase-js | 2.56.0 | 2.86.2 | マイナー |
| @tanstack/react-query | 5.84.2 | 5.90.12 | パッチ |

#### 開発ツール
| パッケージ | 旧バージョン | 新バージョン | 変更種別 |
|-----------|-------------|-------------|---------|
| Biome | 2.1.4 | 2.3.8 | マイナー |
| Playwright | 1.55.0 | 1.57.0 | マイナー |
| TypeScript | 5.x | 5.9.3 | パッチ |
| Tailwind CSS | 4.x | 4.1.17 | パッチ |
| jsdom | 26.1.0 | 27.2.0 | メジャー |
| @testing-library/jest-dom | 6.8.0 | 6.9.1 | パッチ |

## 注意事項

1. **Next.js 16の破壊的変更を確認すること**
   - 公式マイグレーションガイドを参照
   - アプリケーションの動作確認が必須

2. **jsdomのメジャーアップデート**
   - テストコードの動作確認が必要
   - DOM APIの変更がある可能性

3. **TypeScript設定の変更**
   - `jsx: "react-jsx"` への変更により、React 17以降の新しいJSX変換が適用される
   - インポート文の記述方法に影響がある可能性

## 検証結果（2025-12-06 実施済み）

### ✅ 完了した検証
- [x] アプリケーションのビルド確認: `docker compose exec client bun run build` - **成功**
- [x] 型チェック実行: `docker compose exec client bun run typecheck` - **成功**
- [x] テスト実行: `docker compose exec client bun test` - **成功 (115 pass / 0 fail)**

### 必要だった修正

#### 1. next.config.ts の更新
- `eslint` 設定を削除（Next.js 16で非推奨化）
- Next.js 16では`eslint`設定がサポートされなくなった
- Lintは`next lint`コマンドまたはBiomeで実行する必要がある

#### 2. compose.yaml の更新
- Playwright Dockerイメージを更新: `v1.55.0` → `v1.57.0`
- E2Eテストの実行にはDockerイメージとPlaywrightバージョンの一致が必須

### 検証完了項目
- [x] E2Eテスト実行: `docker compose exec e2e npx playwright test` - **成功 (24 passed)**
  - Chromium: 12テスト成功
  - Firefox: 12テスト成功

### 今後の推奨アクション
- [ ] 開発サーバー起動確認: `docker compose exec client bun run dev`
