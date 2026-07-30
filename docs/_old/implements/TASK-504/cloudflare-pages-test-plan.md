# TASK-504: CloudFlare Pages設定 - テスト計画

**作成日**: 2025年09月19日  
**タスク**: TASK-504  
**要件リンク**: REQ-005  

## テスト要件

### 単体テスト: Pages API接続確認
- [x] CloudFlare Pages プロジェクト作成確認
- [x] Terraform設定の構文検証
- [x] 必要な変数の設定確認

### 統合テスト: 静的ファイルデプロイ
- [x] Next.js SSGビルドの動作確認
- [x] 出力ディレクトリ（out）の生成確認
- [x] ビルド成果物の構造確認

### E2Eテスト: ドメインアクセス確認
- [ ] Production環境URLアクセス
- [x] Preview環境URLアクセス
- [x] DNS設定の動作確認

## UI/UX要件

### ローディング状態: ビルド進行状況表示
- [x] CloudFlare Pages ダッシュボードでビルド状況確認
- [ ] GitHub Actionsでのビルドログ確認

### エラー表示: デプロイ失敗通知
- [ ] ビルドエラー時の適切なエラーメッセージ
- [ ] デプロイ失敗時のロールバック確認

### モバイル対応: レスポンシブ動作確認
- [ ] モバイルデバイスでのページ表示確認
- [ ] タブレットでのページ表示確認

## エラーハンドリング

### Pages API認証エラー
- [ ] CLOUDFLARE_API_TOKEN 未設定時のエラー処理
- [ ] 無効なトークン時のエラーメッセージ

### ビルド失敗処理
- [ ] Next.jsビルドエラー時の処理
- [ ] 依存関係エラー時の処理

### DNS設定エラー
- [ ] ゾーンID不正時のエラー処理
- [ ] ドメイン設定ミス時のエラー処理

## 完了条件

### CloudFlare Pagesプロジェクト作成完了
- [x] Terraformモジュールの実装完了
- [x] 必要な変数の定義完了
- [x] 出力値の設定完了

### DNS設定完了
- [x] Production用CNAMEレコード設定
- [x] Preview用CNAMEレコード設定

### テストデプロイ成功
- [x] 実際のTerraformデプロイテスト（環境設定後）
- [x] Next.jsビルドテスト
- [ ] エンドツーエンドアクセステスト

## 設定確認チェックリスト

### Terraform設定
- [x] CloudFlareプロバイダー設定
- [x] CloudFlare Pagesモジュール有効化
- [x] 必要な変数追加（cloudflare_account_id, cloudflare_zone_id）
- [x] 出力値設定

### Next.js設定
- [x] SSG出力モード設定（output: 'export'）
- [x] ビルドコマンド設定（bun run build）
- [x] 出力ディレクトリ設定（out）

### Environment設定
- [x] Production環境変数設定
- [x] Preview環境変数設定
- [x] Lambda Function URL連携

## 注意事項

1. **CloudFlare API Token**: CLOUDFLARE_API_TOKEN環境変数の設定が必要
2. **Account ID**: CloudFlareアカウントIDの取得と設定が必要
3. **Zone ID**: DNS管理するドメインのZone IDが必要
4. **ドメイン設定**: 実際のドメイン名の設定が必要

## 次のステップ

TASK-504完了後、以下のタスクに進む：
- TASK-505: drizzle-kitマイグレーション設定
- TASK-601: メインデプロイワークフロー
