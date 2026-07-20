---
name: gh-pr-create
allowed-tools: Bash(git push:*),Bash(git fetch:*), Bash(git status:*), Bash(git diff:*), Bash(gh pr create:*)
description: 現在のブランチとプッシュ先のブランチの diff を確認し、テンプレートに従ってプルリクを出します。
model: sonnet
effort: medium
---

- ユーザからマージ先のブランチを受け取ります。
- マージ先のブランチ名を受け取らなかった場合、自己判断はせず、マージ先のブランチを確認したいことを促して、明確にしてください。
- 現在のブランチとプッシュ先のブランチの diff を確認し、テンプレートに従って Pull Request を出してください。

## 事前準備
- 現在のブランチを `git push origin {現在のブランチ名}` で push
- リモートリポジトリを `git fetch`
- 現在開いているブランチ名に含まれる {大文字の英字列-数字}を Jira に紐つく {PROJECT-KEY} と認識します。

## 実行内容
- `git diff` で、現在のブランチとリモートのマージ先ブランチを比較し、変更の詳細を確認（例: `this_branch` と `origin/main` を比較）
- `gh pr create` でプルリクエストを作成
  - プルリクエストの内容に記載する文章は、すべて説明的にして、想定ターゲットの存在しない内容にしてください。

Pull Request 作成には以下を参照してください。

- [Pull Request テンプレート](./references/PULL_REQUEST_TEMPLATE.md)

**禁止**: スキルリファレンスのテンプレートに従っていない PR の作成
**禁止**: コードブロックや Mermaid をエスケープ
