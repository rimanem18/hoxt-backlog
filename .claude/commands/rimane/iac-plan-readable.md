---
allowed-tools: Bash(make iac:*), Bash(make iac-plan-save:*), Bash(make iac-init:*)
description: terraform plan を実行し、出力されたファイルを人間が読みやすい md 形式に変換します。
---

## 実行内容
- `make iac-plan-save` を実行
  - `make` コマンドはカレントディレクトリで実行する
  - 必要に応じて `make iac`, `make iac-init` が使用できる
  - `TF_VAR_*` 環境変数が設定されているため、backend-config はそれを使う
  - 再設定が必要な場合、`make iac-init` を使用する
  - `terraform/terraform.tfplan` も生成されますが、削除しないでください
- 出力された `terraform/plan-output.txt` をテーブルを中心に使って人間の読みやすいように、`terraform/plan-output.md` に出力する。同名が存在していたとしても上書き保存する。

## 出力フォーマット例

````md
# Terraform Plan 実行結果

**更新日**: YYYY年MM月dd日 hh:mm JST

## 概要

| リソース名 | 個数 |
|-----------|-------|
| 新規 | n個 |
| 更新 | n個 |
| 削除 | n個 |


| リソース名 | タイプ | 説明 |
|-----------|-------|------|
| `myproject-role` | IAM ロール | 新規作成 |
| `myproject-policy` | IAM ポリシー | `myproject-role` にアタッチ |
| `myproject-api` | Lambda 関数 | HTTPプロトコル、CORS設定済 |
| `myporject-api` | API Gateway | Preview 環境用エンドポイント |
| `myproject-terraform-state` | S3 バケット | パブリックアクセスブロック |
| `myproject-terraform-locks` | DynamoDB テーブル |  |

## リソース詳細

{リソースごとに異なるテーブルヘッダが必要な、さらなる詳細設定をセクションごとにテーブルで表示（タグ含む）}

## 関連性

{関連性を mermaid で図示}

## 出力名（known after apply）

{テーブルで表示}

````

## 実行後の確認

実行後、以下を報告する。問題があっても自動修正してはならない。

- すべてのリソースの名前にプロジェクトが識別できる値がふくまれている
- 用途が説明されている
- 最低限のセキュリティ要件を満たしている
- 出力されたファイルは `.gitignore` によって除外されている
- `@docs/spec/continuous-deployment-requirements.md` にのっとった仕様になっていることを確認
- `@docs/design/continuous-deployment/` にのっとった設計になっていることを確認
