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

### Phase 1: CI ワークフロー作成
- [ ] `.github/workflows/ci.yml` を作成
  - [ ] client-test ジョブ: GitHub Actions ランナーで `app/client` の bun test + 型チェック実行
  - [ ] server-test ジョブ: GitHub Actions ランナーで `app/server` の bun test + 型チェック実行  
  - [ ] e2e-test ジョブ: Playwright 公式コンテナ内でテスト実行
    - [ ] PostgreSQL サービスコンテナとの連携設定
    - [ ] コンテナ内で client/server を起動してからテスト実行
    - [ ] wait-on を使用したサービス起動待機処理
- [ ] client-test, server-test に Bun 依存関係キャッシュ設定を追加
- [ ] e2e-test に needs 依存（client-test, server-test 成功後に実行）を設定
- [ ] E2E テスト失敗時の Playwright レポート自動保存設定（`actions/upload-artifact` 使用）

### Phase 2: package.json スクリプト調整
- [ ] client の `package.json` に `check` スクリプト追加（lint + 型チェック）
- [ ] server の `package.json` に `check` スクリプト追加（lint + 型チェック）
- [ ] E2E テスト用の build/start コマンド確認・調整

### Phase 3: 安定性・効率性向上（o3 評価に基づく改善）
- [ ] Docker Compose healthcheck 設定を追加（wait-on より確実な readiness 判定）
  - [ ] server サービスに healthcheck エンドポイント追加
  - [ ] `docker compose up --wait` でヘルスチェック完了まで待機
- [ ] Playwright コンテナの安定性向上
  - [ ] `--shm-size=1G` などメモリ設定を明示してブラウザ起動失敗を防止
  - [ ] 必要に応じて `mcr.microsoft.com/playwright:base-debian` への軽量化検討
- [ ] キャッシュ最適化
  - [ ] `~/.bun/install/cache` と `**/playwright/.cache` をキャッシュ対象に追加
  - [ ] Docker レイヤキャッシュ（`cache-from: type=gha`）の導入検討
- [ ] ランタイム差分テスト（Bun vs Node）の週次実行設定を追加

### Phase 4: 動作確認・観測性
- [ ] テスト PR を作成して CI が正常動作することを確認
- [ ] 各ジョブが並行実行され、適切にパス/フェイルすることを確認  
- [ ] E2E テスト失敗時に Playwright レポートが正しくアップロードされることを確認
- [ ] CI 実行時間とコスト効率をモニタリング
- [ ] flaky テストの発生頻度を追跡する仕組みの検討

