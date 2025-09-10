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
- [ ] テスト PR を作成して CI が正常動作することを確認
- [ ] 各ジョブが並行実行され、適切にパス/フェイルすることを確認  
- [ ] E2E テスト失敗時に Playwright レポートが正しくアップロードされることを確認
- [ ] CI 実行時間とコスト効率をモニタリング
- [ ] flaky テストの発生頻度を追跡する仕組みの検討

