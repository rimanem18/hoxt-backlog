ここから下に TODO を記載

# GitHub Actions で CI 構築

## 設計方針
- **トリガー**: main ブランチへの PR 時のみ実行
- **実行環境**: 
  - client-test: GitHub Actions ランナーで `app/client` 内で bun 環境を使用
  - server-test: GitHub Actions ランナーで `app/server` 内で bun 環境を使用
  - e2e-test: Playwright 公式コンテナ（mcr.microsoft.com/playwright:v1.55.0-jammy）を使用
- **並行実行**: client test, server test を並行実行後、e2e test を実行（needs 依存で効率化）

## 実装タスク

### Phase 1: CI ワークフロー作成 ✅
- [x] `.github/workflows/ci.yml` を作成
  - [x] client-test ジョブ: GitHub Actions ランナーで `app/client` の bun test + 型チェック実行
  - [x] server-test ジョブ: GitHub Actions ランナーで `app/server` の bun test + 型チェック実行  
  - [x] e2e-test ジョブ: Playwright 公式コンテナ内でテスト実行
    - [x] PostgreSQL サービスコンテナとの連携設定
    - [x] コンテナ内で client/server を起動してからテスト実行
    - [x] wait-on を使用したサービス起動待機処理
- [x] client-test, server-test に Bun 依存関係キャッシュ設定を追加
- [x] e2e-test に needs 依存（client-test, server-test 成功後に実行）を設定
- [x] E2E テスト失敗時の Playwright レポート自動保存設定（`actions/upload-artifact` 使用）
- [x] **追加対応**: 環境依存URL問題の解決
  - [x] Playwright 設定での CI 環境判定による baseURL 分岐
  - [x] テストファイル内の正規表現動的生成  
  - [x] コンポーネントでの API URL 環境変数対応

### Phase 2: package.json スクリプト調整 ✅
- [x] client の `package.json` に `check` スクリプト追加（lint + 型チェック）
  - [x] `typecheck` と `biome check` を組み合わせた包括的品質チェック
  - [x] `dev`/`start` コマンドに `CLIENT_PORT` 環境変数対応追加
- [x] server の `package.json` に `check` スクリプト追加（lint + 型チェック）
  - [x] `typecheck` と `biome check` を組み合わせた包括的品質チェック  
  - [x] `start`/`test` コマンドを CI 用に追加
- [x] E2E テスト用の build/start コマンド確認・調整
  - [x] client: `build` → `start` の本番ビルドフロー確認
  - [x] server: `SERVER_PORT` 環境変数対応確認
  - [x] CI ワークフローとの整合性確保

### Phase 3: 安定性・効率性向上（o3 評価に基づく改善） ✅
- [x] Docker Compose healthcheck 設定を追加（wait-on より確実な readiness 判定）
  - [x] server サービスに healthcheck エンドポイント追加（既存の `/api/health` 活用）
  - [x] DB, server, client の順次 healthcheck 依存関係設定
  - [x] CI で healthcheck を活用した指数バックオフ待機ロジック追加
- [x] Playwright コンテナの安定性向上
  - [x] `--shm-size=1gb` メモリ設定でブラウザ起動失敗を防止
  - [x] 軽量化は必要に応じて将来検討（現在は安定性優先）
- [x] キャッシュ最適化
  - [x] `~/.bun/install/cache` と `**/playwright/.cache` をキャッシュ対象に追加
  - [x] E2E ジョブで client/server 両方の lockfile をキーに使用
  - [x] Docker レイヤキャッシュは現在の設計では不要（CI が Docker 未使用のため）
- [x] ランタイム差分テスト（Bun vs Node）の週次実行設定
  - [x] 検討の結果、メンテナンス負担削減のため実装を見送り
  - [x] E2E テストが Playwright コンテナ（Node）で実行されることで基本的な差異は検知可能
  - [x] 必要に応じて将来的に手動で互換性確認を実施

### 最終 CI 戦略の確定 ✅
- [x] **ハイブリッド戦略の採用**: 複数検討の結果、以下の組み合わせが最適と判断
  - **Unit Tests（client-test, server-test）**: Bun ランタイム使用
    - 理由: 開発時との一貫性、高速実行、既存テストコードとの互換性
  - **E2E Tests（e2e-test）**: Server を Node.js で起動、Playwright は Node コンテナで実行
    - 理由: 本番環境（Node.js）との整合性確保、実際の運用環境での動作検証
- [x] **技術的根拠**:
  - Client（Next.js）: ビルド後は静的ファイルのため、ランタイム差異は影響しない
  - Server（Hono API）: 本番は Node.js のため、E2E で Node.js 動作を検証することは有意義
  - Test compatibility: Unit tests は Bun 標準テスト用に作成済み、Node.js では動作不可
- [x] **実装済み要素**:
  - `app/server/src/presentation/http/server/node.serve.ts`: Node.js 起動スクリプト
  - `app/server/package.json`: `start:node` スクリプト追加
  - `.github/workflows/ci.yml`: E2E で `npm run start:node` 使用
  - 必要な依存関係: `@hono/node-server`, `tsx` をpackage.jsonに追加済み

### Phase 4: 動作確認・観測性
- [x] **実装完了・コミット済み**: Phase 1-3 の全実装が完了し、ハイブリッド CI 戦略が確定
  - commit: `25e0fb9` で CI 設定、Node.js 起動スクリプト、戦略文書化を完了
- [ ] **CI 実行時の依存関係エラー対応**: shared-schemas の TypeScript 解決エラーを根本解決
  - 現状: `Cannot find module 'drizzle-zod'` エラーが server-test で発生
  - 暫定対応: tsconfig.json の include に `../packages/**/*.ts` 追加済み
- [ ] **次のステップ**: テスト PR を作成して CI が正常動作することを確認
  - ブランチ: `HOXBL-15_issue#25_e2e-test-suite` から main への PR 作成準備完了
- [ ] 各ジョブが並行実行され、適切にパス/フェイルすることを確認  
- [ ] E2E テスト失敗時に Playwright レポートが正しくアップロードされることを確認
- [ ] CI 実行時間とコスト効率をモニタリング
- [ ] flaky テストの発生頻度を追跡する仕組みの検討

### Phase 5: shared-schemas 依存関係問題の根本解決 🔧
**背景**: 現在の `app/packages/shared-schemas/` 構成で以下の問題が発生
- TypeScript 型チェック時に `drizzle-zod`, `zod` モジュールが見つからない
- packages 配下に独自の node_modules を持たせるのは複雑
- CI 実行時に依存関係解決エラーが発生

#### 解決戦略: Bun Workspace + Monorepo 構成 (o3 提案)
- **設計思想**: 依存関係を 1 ヶ所（ルート node_modules）に集約し、TypeScript Project References で型安全性を確保
- **技術基盤**: Bun workspace + TypeScript Project References + Next.js transpilePackages

#### 実装計画
- [ ] **フェーズ 5.1: ディレクトリ構成変更**
  ```
  / (ルート)
  ├─ package.json (workspace 定義)
  ├─ bun.lock
  ├─ tsconfig.base.json
  ├─ apps/
  │  ├─ client/ (Next.js)
  │  └─ server/ (Hono + Bun)
  └─ packages/
     └─ shared-schemas/ (Zod / drizzle-zod)
  ```

- [ ] **フェーズ 5.2: Workspace 設定**
  - ルート package.json に workspace 定義追加
  - shared-schemas を `@acme/shared-schemas` としてパッケージ化
  - 依存関係をルート node_modules に集約

- [ ] **フェーズ 5.3: TypeScript Project References 設定**
  - tsconfig.base.json でベース設定とパスエイリアス定義
  - 各パッケージで Project References 参照
  - `tsc -b` による増分ビルド対応

- [ ] **フェーズ 5.4: Next.js トランスパイル設定**
  - `transpilePackages: ['@acme/shared-schemas']` で自動ビルド
  - 外部パッケージの TypeScript 直接取り込み

- [ ] **フェーズ 5.5: CI 設定更新**
  - workspace 対応でルート `bun install` 実行
  - `bunx tsc -b` による monorepo 型チェック
  - 各アプリケーションの個別実行（`--filter` 活用）

#### 期待される効果
- ✅ **依存関係解決**: ルート node_modules による一元管理
- ✅ **型安全性**: Project References による完全な型チェック
- ✅ **開発体験**: Hot reload 対応、エディタ補完正常化  
- ✅ **ビルド効率**: 増分ビルド、不要な事前コンパイル削除
- ✅ **保守性**: 1 ヶ所での依存管理、明確な import パス

#### 現在の CI 設定への影響分析

**現在の CI 構成 (ハイブリッド戦略)**
```yaml
client-test:
  working-directory: ./app/client
  run: bun install && bun run check && bun test

server-test:  
  working-directory: ./app/server
  run: bun install && bun run check && bun test

e2e-test:
  run: |
    cd ./app/server && bun install && npm install
    cd ../client && bun install
    # サービス起動 + テスト実行
```

**monorepo 移行後の変更が必要な箇所**
- [ ] **依存関係インストール**: 各ジョブの個別 `bun install` → ルート 1回のみ
- [ ] **型チェック**: `bun run typecheck` → `bunx tsc -b` (Project References)
- [ ] **working-directory**: 各アプリディレクトリ → ルート基準の相対パス
- [ ] **キャッシュキー**: 個別 lockfile → 統一 bun.lock
- [ ] **フィルタ実行**: `bun test` → `bun test --filter ./apps/client`

**具体的な CI ワークフロー変更案**
```yaml
client-test:
  steps:
    - run: bun install  # ルートでworkspace全体をインストール
    - run: bunx tsc -b  # Project References型チェック
    - run: bun test --filter ./apps/client

server-test:
  steps: 
    - run: bun install  # 同上（キャッシュで高速化）
    - run: bunx tsc -b
    - run: bun test --filter ./apps/server

e2e-test:
  steps:
    - run: bun install
    - run: |
        cd ./apps/server && npm run start:node &
        cd ./apps/client && bun run dev &
        # 待機・テスト実行
```

**キャッシュ最適化の変更**
- **Before**: 個別 lockfile (`app/client/bun.lock`, `app/server/bun.lock`)
- **After**: 統一 lockfile (`bun.lock`) + workspace node_modules

#### リスク評価
- 🔄 **移行作業**: 既存 import パスの全面書き換え
- 🔄 **CI 設定変更**: workspace 対応による全ジョブのビルドフロー調整
- 🔄 **学習コスト**: monorepo 管理手法の習得  
- 🔄 **キャッシュ効率**: 統一 lockfile による既存キャッシュ無効化
- ✅ **後方互換性**: 最小限の破壊的変更で実現可能
- ✅ **実行速度**: workspace により依存関係インストールが高速化

#### 実装判断の材料

**OpenAPI 導入を考慮した配置戦略 (o3 分析)**
```
比較: packages/shared-schemas vs app/server/schema/

✅ packages/shared-schemas (推奨)
・データ構造 と エンドポイント定義 の適切な分離
・将来の API バージョン管理 (/v1, /v2) に対応
・他言語実装 (Go/Lambda等) への再利用可能性
・クライアント専用パッケージ (Storybook等) からの import 対応
・OpenAPI 自動生成パイプラインとの親和性

❌ app/server/schema/ (非推奨)  
・server コードとの密結合
・client の tree-shaking/externals 設定が複雑化
・API バージョン分岐管理の煩雑さ
・スキーマ単独利用の困難さ
```

**OpenAPI 統合時の技術フロー**
```
packages/schemas/ (Zod スキーマ)
    ↓
apps/server/ (Hono + @hono/zod-openapi)
    ↓ 
openapi.json (自動生成)
    ↓
packages/sdk/ (TypeScript 型生成)
    ↓
apps/client/ (Next.js での型安全 fetch)
```

**o3 提案の monorepo 構成採用時の利点:**
- ✅ 根本的な依存関係解決（現在の TypeScript エラー完全解消）
- ✅ 保守性向上（一元的な依存管理、明確なパッケージ構造）
- ✅ 開発体験改善（エディタ補完、Hot reload 正常化）
- ✅ CI の簡素化・高速化（統一 bun install、増分ビルド）
- ✅ **OpenAPI エコシステムとの親和性**（スキーマ分離、型生成パイプライン）

**現状維持（暫定対応）の場合:**
- ✅ 即座の問題解決（tsconfig.json 修正済み、CI 通る可能性）
- ✅ 既存構造維持（学習コストなし、移行作業なし）  
- 🔄 根本解決されない（将来的な依存関係問題再発リスク）
- 🔄 複雑な構成継続（packages の独立 node_modules 管理）

#### 最終決定: 現実的なアプローチ採用 ✅

**判断理由:**
- OpenAPI 導入予定により `packages/shared-schemas` 配置が最適
- monorepo 移行は大きな変更で学習コストが高い
- 現状構成を最小限の変更で修正する方が実用的

**採用する解決策: packages/shared-schemas に独立 node_modules**
```bash
# CI での対応
- name: Install shared-schemas dependencies
  run: |
    cd ./app/packages/shared-schemas
    bun install
```

#### Phase 4.5: 現実的な CI 修正（即座実行）
- [ ] **packages/shared-schemas/package.json 修正**: dependencies を正しく設定
- [ ] **CI ワークフローに packages 依存関係インストール追加**
  - client-test, server-test で packages/shared-schemas の bun install
  - キャッシュキーに packages/bun.lock も含める
- [ ] **動作確認**: TypeScript エラーの解消を確認

#### 理由:
- ✅ **最小変更**: 既存構造をほぼ維持
- ✅ **即座解決**: CI エラーを今すぐ修正可能  
- ✅ **OpenAPI 親和性**: 将来の OpenAPI 導入に最適な配置維持
- ✅ **学習コスト削減**: monorepo 管理手法の習得不要
- 🔄 **複数 node_modules**: packages にも dependencies が必要（許容可能）

**注記**: Phase 5 monorepo 移行は将来の選択肢として文書化済み。当面は現実的なアプローチで進行。

