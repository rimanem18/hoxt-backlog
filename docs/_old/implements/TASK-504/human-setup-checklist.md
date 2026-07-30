# TASK-504: CloudFlare Pages設定 - 人間作業チェックリスト

**作成日**: 2025年09月18日  
**更新日**: 2025年09月18日  
**タスクタイプ**: DIRECT  
**要件リンク**: REQ-005  
**デプロイ方式**: Direct Upload（推奨）  
**実装方式**: Terraform統合1プロジェクト方式

## 概要

Terraform でCloudFlare Pages設定を実装する前に、**人間が手動で実行する必要がある前提作業**のチェックリストです。

⚠️ **重要**: これらの作業は Terraform では自動化できないため、必ず手動で実行してください。

## デプロイ方式の選択

### 🔒 Direct Upload（推奨）
- **セキュリティ**: 最小権限（Pages Edit のみ）
- **制御**: 自社 CI/CD 環境でのビルド制御
- **柔軟性**: モノレポ・Docker 環境対応

### ⚠️ GitHub 連携（非推奨）
- **セキュリティリスク**: リポジトリ全体の読み取り権限を CloudFlare に付与
- **制約**: Node.js 環境のみ、共有パッケージのビルドが困難

**→ 本チェックリストは Direct Upload 方式 + Terraform統合1プロジェクト方式を前提としています**

## 実装方式の概要

### 🏗️ Terraform統合1プロジェクト方式
- **環境管理**: 単一CloudFlare Pagesプロジェクトで production/preview 環境を統合管理
- **デプロイ制御**: Terraform CloudFlare Pagesモジュールによる統一デプロイメント管理
- **Lambda連携**: Production/Preview Lambda Function URL の自動環境変数設定
- **環境分離**: ブランチベースでの自動環境分離（main = production、feature/* = preview）
- **同期保証**: Lambda完全分離 + Pages統合による最適化されたアーキテクチャ

## 事前準備チェックリスト

### ✅ 1. CloudFlare アカウント設定

#### 1-1. API トークンの発行（Direct Upload 用）

**操作手順:**
1. [CloudFlare ダッシュボード](https://dash.cloudflare.com/) にログイン
2. 右上のプロフィールアイコン → **My Profile** → **API Tokens** タブ
3. **Create Token** ボタンをクリック
4. **Custom token** を選択し、以下の権限を設定:
   ```
   Account - Cloudflare Pages:Edit
   Zone - Zone:Read (カスタムドメイン使用時のみ)
   ```

**セキュリティ重要事項:**
⚠️ **DNS Edit 権限は除外** - セキュリティリスク軽減のため、DNS 編集権限は付与しない  
⚠️ **最小権限原則** - Pages Edit 権限のみに制限  
⚠️ **トークン有効期限** - 90日以内に設定し、定期ローテーション実施

5. **Account Resources** で対象アカウントを選択
6. **Zone Resources** は設定しない（DNS Edit 権限なしのため）
7. **TTL (Time to live)** を 90日に設定
8. **Continue to summary** → **Create Token**
9. 生成されたトークンを安全な場所にコピー保存

**確認事項:**
- [x] API トークンが正常に生成された
- [x] トークンに Pages Edit 権限のみが付与された
- [x] DNS Edit 権限が除外されていることを確認
- [x] トークンを安全に保存した
- [x] 有効期限が90日以内に設定された

#### 1-2. account_id の確認

**操作手順:**
1. CloudFlare ダッシュボードの Overview 画面
2. 右側サイドバーの **API** セクション
3. **Account ID** をコピー

**確認事項:**
- [x] Account ID を確認・記録した

#### 1-3. zone_id の確認（カスタムドメイン使用時のみ）

**操作手順:**
1. CloudFlare ダッシュボードで対象ドメインを選択
2. 右側サイドバーの **API** セクション
3. **Zone ID** をコピー

**重要注意事項:**
⚠️ DNS 編集権限を除外したため、**DNS レコードは手動設定**が必要です

**確認事項:**
- [x] Zone ID を確認・記録した（カスタムドメイン使用時）
- [x] DNS レコードの手動設定が必要であることを理解した

### ✅ 2. Direct Upload プロジェクトの作成

#### 2-1. Direct Upload プロジェクトの作成

**操作手順:**
1. CloudFlare ダッシュボード → **Pages** → **Create a project**
2. **Upload assets** を選択（Git 連携ではなく）
3. プロジェクト名を入力: `your-project` (production/preview 統合プロジェクト)
4. **Create project** をクリック

**重要注意事項:**
⚠️ Direct Upload プロジェクトは後から Git 連携に変更できません  
⚠️ プロジェクト作成後は `wrangler` CLI または Terraform でのみ管理可能  
⚠️ **1プロジェクト方式**: 単一プロジェクトで production/preview 環境を統合管理

**確認事項:**
- [x] Direct Upload プロジェクトが作成された
- [x] プロジェクト名を記録した
- [x] Git 連携を選択していないことを確認
- [x] 統合プロジェクト方式であることを理解した

### ✅ 3. カスタムドメイン設定（使用する場合のみ）

#### 3-1. サブドメインの推奨設定

**推奨構成:**
- **本番環境**: `app.yourdomain.com`
- **プレビュー環境**: `preview.yourdomain.com`

**操作手順（サブドメインを使用する場合）:**
1. DNS 管理画面で以下の CNAME レコードを**手動で**追加:
   ```
   app.yourdomain.com → your-project.pages.dev
   preview.yourdomain.com → your-project.pages.dev
   ```
2. CloudFlare Pages → **Custom domains** → **Add a custom domain**
3. `app.yourdomain.com` を入力して追加
4. SSL/TLS 証明書の自動発行を待機（最大15分）

**セキュリティ利点:**
✅ DNS 編集権限が不要のため、セキュリティリスクを軽減  
✅ DNS 設定の変更履歴を明確に管理可能

**確認事項:**
- [x] CNAME レコードを手動で追加した
- [x] カスタムドメインが CloudFlare Pages に追加された
- [x] SSL/TLS 証明書が正常に発行された

#### 3-2. Apex ドメイン設定（使用する場合のみ）

**操作手順（Apex ドメインを使用する場合）:**
1. CloudFlare ダッシュボード → **Add site**
2. 使用予定のドメイン名を入力
3. **Free** プランを選択（必要に応じて変更）
4. DNS レコードのスキャン結果を確認
5. CloudFlare が提供するネームサーバを確認
6. ドメインレジストラの管理画面でネームサーバを変更
7. 24-48時間後に名前解決が切り替わることを確認

**確認事項:**
- [x] ドメインゾーンが CloudFlare に追加された
- [x] ネームサーバがレジストラで変更された
- [x] DNS の名前解決が CloudFlare 経由になった

### ✅ 4. GitHub Repository Secrets と Variables の設定

**重要制約**: GitHub Environment は private repository の無料プランでは利用不可のため、Repository-level で設定します。

#### 4-1. Repository Secrets の設定

**操作場所:** GitHub → Repository → Settings → Secrets and variables → Actions → Repository secrets

**設定する Secrets（共通化による管理負荷軽減）:**
```
# 共通Secrets（PROD/PREVIEW共通）
CLOUDFLARE_API_TOKEN: [1-1で生成したAPIトークン]
CLOUDFLARE_ACCOUNT_ID: [1-2で確認したAccount ID]

# 統合OIDC認証用（ブランチ制限付き統合ロール）
AWS_ROLE_ARN: [統合AWSのIAMロールARN]
# 注記: mainブランチ・PRのみアクセス許可。feature/develop等ブランチ無効化
```

#### 4-2. Repository Variables の設定

**操作場所:** GitHub → Repository → Settings → Secrets and variables → Actions → Repository variables

**設定する Variables:**
```
PROJECT_NAME: your-project
PRODUCTION_DOMAIN: your-project.net
ACCESS_ALLOW_ORIGIN_PRODUCTION: https://your-project.net
ACCESS_ALLOW_ORIGIN_PREVIEW: https://*.your-project.pages.dev
```

#### 4-3. 環境分離メカニズム

**動的参照方式:**
```yaml
# GitHub Actions での使用例
env:
  # 共通Secrets（環境判定不要）
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  PROJECT_NAME: ${{ vars.PROJECT_NAME }}
  # 統合OIDC認証（ブランチ制限により安全）
  AWS_ROLE_ARN: ${{ secrets.AWS_ROLE_ARN }}
```

**確認事項:**
- [ ] 共通Repository Secrets設定完了
- [ ] 統合OIDC認証用Repository Secrets設定完了
- [ ] Repository Variables 設定完了
- [ ] ブランチ制限による安全性確保を確認
- [ ] 管理負荷軽減による運用効率化を確認

### ✅ 5. 将来対応オプション（段階的実装）

#### 5-1. OIDC移行準備（オプション）

**AWS IAM OIDC プロバイダー設定:**
- GitHub Actions からの OIDC認証用 IAM ロールの準備
- より安全な認証方式への段階的移行パスを確保

**メリット:**
- 長期Secretsの削除によるセキュリティ向上
- より細かいIAM権限制御

#### 5-2. GitHub Team/Enterprise 移行時

**GitHub Environment 復活:**
- 有料プランへのアップグレード時に Environment 機能を活用
- より細かいアクセス制御と承認フローの実装

**移行パス:**
- Repository Secrets → Environment Secrets への段階移行
- 既存の命名規約を活用した無停止移行

## セキュリティ対策チェックリスト

### 🔒 必須セキュリティ対策

- [x] **最小権限**: API トークンは Pages Edit のみ
- [x] **DNS 権限除外**: DNS Edit 権限は付与しない
- [x] **トークンローテーション**: 90日以内に再生成予定を設定
- [x] **環境分離**: production/preview 環境を明確に分離
- [ ] **監査ログ**: GitHub Actions のログ保持設定を確認

### 🛡️ 追加セキュリティ対策（推奨）

- [ ] **IP制限**: API トークンにIP制限を設定（可能な場合）
- [ ] **アラート設定**: 不正アクセス検知のモニタリング
- [ ] **バックアップ**: プロジェクト設定のバックアップ取得

## 作業完了チェック

すべての作業が完了したら、以下を確認してください：

### 最終確認項目
- [x] CloudFlare API トークンが正常に動作する
- [x] Direct Upload プロジェクトが作成済み
- [x] カスタムドメインの CNAME レコードが設定済み（使用時のみ）
- [ ] GitHub Repository Secrets（PROD/PREVIEW命名規約）が設定済み
- [ ] 必要な Secrets/Variables がすべて設定済み
- [ ] セキュリティ対策チェックリストが完了

### テスト手順

#### API トークン動作確認
```bash
# CloudFlare API の疎通確認
curl -X GET "https://api.cloudflare.com/client/v4/accounts" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"
```

**期待結果**: アカウント情報が JSON で返される

#### Pages プロジェクト確認
```bash
# Pages プロジェクト一覧確認
curl -X GET "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/pages/projects" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"
```

**期待結果**: 作成したプロジェクトが一覧に表示される

## 次のステップ

✅ すべてのチェック項目が完了したら、以下の手順で進行できます：

1. **Terraform 実装**: TASK-504 の Terraform統合1プロジェクト方式による実装
   - CloudFlare Pages統合モジュールによる環境別デプロイメント
   - Lambda Function URL連携による自動環境変数設定
2. **CI/CD 構築**: GitHub Actions ワークフロー実装（統合方式対応）
3. **監視設定**: デプロイメント監視とアラートの設定

## Terraform統合実装のポイント

### 🔧 必須実装要素
- **CloudFlare Pages統合モジュール**: Terraform `cloudflare_pages_project` による統合管理
- **環境変数同期**: Lambda Function URL → Pages Environment Variables の自動設定
- **環境分離**: production/preview deployment_configs による論理分離
- **依存関係制御**: Lambda → Pages の適切な依存関係定義

### 🏗️ 実装アーキテクチャ
- **Lambda**: 完全分離（Production/Preview専用関数）
- **Pages**: 1プロジェクト統合（deployment_configs分離）
- **連携**: Function URL による自動API接続

### 📋 実装参考
詳細な実装方法は `@docs/design/continuous-deployment/cloudflare-pages-environment-strategy.md` を参照してください。

## トラブルシューティング

### よくある問題と解決方法

**問題**: API トークンでアクセスできない  
**解決**: トークンの権限設定を再確認し、必要に応じて再生成

**問題**: Direct Upload プロジェクトが作成できない  
**解決**: アカウントの Pages プロジェクト上限を確認し、不要なプロジェクトを削除

**問題**: カスタムドメインの SSL 証明書が発行されない  
**解決**: CNAME レコードの設定を確認し、DNS 浸透を待つ（最大15分）

**問題**: Terraform CloudFlare Pages リソースが作成できない  
**解決**: API トークンと Account ID の設定を確認し、プロジェクト名の重複がないか確認

**問題**: Lambda Function URL が Pages環境変数に反映されない  
**解決**: Terraform の依存関係定義を確認し、Lambda → Pages の実行順序を保証

## 関連ドキュメント

- [CloudFlare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [CloudFlare Pages API リファレンス](https://developers.cloudflare.com/api/operations/pages-project-create-project)
- [Wrangler CLI ドキュメント](https://developers.cloudflare.com/workers/wrangler/)
- [CloudFlare API トークン管理](https://developers.cloudflare.com/api/tokens/)
- [CloudFlare Pages セキュリティベストプラクティス](https://developers.cloudflare.com/pages/configuration/custom-domains/)
