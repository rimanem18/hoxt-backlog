# HOXT Backlog - Terraform Infrastructure

## 概要

HOXT BacklogプロジェクトのAWSインフラストラクチャをTerraformで管理します。
S3とDynamoDBを使用したリモートstateとstate lockingを実装しています。

## ディレクトリ構成

```
terraform/
├── README.md                 # このファイル
├── versions.tf              # Terraformとプロバイダーのバージョン制約
├── variables.tf             # 入力変数定義
├── backend.tf               # リモートバックエンド設定
├── state-management.tf      # S3バケット、KMS、DynamoDBテーブル
└── outputs.tf              # 出力値定義
```

## 初回セットアップ

### 1. 環境変数の設定

`.env`ファイルに以下の環境変数が設定されていることを確認：

```bash
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/GitHubActions-Production
AWS_REGION=ap-northeast-1
```

### 2. 初期状態管理リソースの作成

最初の実行では、backend設定を無効化してローカルstateで実行：

```bash
# backend.tfを一時的にリネーム
mv backend.tf backend.tf.disabled

# 初期化とリソース作成
make iac-init
make iac-plan
make iac-apply
```

### 3. リモートバックエンドへの移行

リソース作成後、リモートバックエンドを有効化：

```bash
# backend設定を復活
mv backend.tf.disabled backend.tf

# リモートバックエンドへの移行
make iac-init
# "yes" で既存stateをリモートに移行

# 動作確認
make iac-plan
```

## 運用コマンド

| コマンド | 説明 |
|----------|------|
| `make iac` | Terraformコンテナに接続（対話式） |
| `make iac-init` | Terraform初期化 |
| `make iac-plan` | 変更計画の表示 |
| `make iac-apply` | 変更の適用 |

## セキュリティ設定

### S3バケット
- KMS暗号化：有効
- バージョニング：有効
- パブリックアクセス：完全ブロック
- ライフサイクル：非現行バージョンを30日で削除

### DynamoDBテーブル
- 課金モード：オンデマンド
- 削除防止：有効

### 権限管理
- GitHub OIDC経由でのIAMロール引き受け
- 最小権限の原則に基づくポリシー設定

## 注意事項

1. **初回セットアップ時は必ずbackend.tfを無効化してください**
2. **削除防止が設定されているリソースは手動削除が必要です**
3. **KMSキーの削除には7日間の待機期間があります**
4. **AWS認証情報はGitHub Secretsで管理してください**

## トラブルシューティング

### State Lock関連
```bash
# ロックが残っている場合の強制解除
terraform force-unlock [LOCK_ID]
```

### Backend初期化エラー
```bash
# キャッシュクリア
rm -rf .terraform
make iac-init
```