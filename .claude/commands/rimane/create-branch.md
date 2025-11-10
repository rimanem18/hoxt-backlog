---
description: issue 番号と要件名、TASK-ID を与えてブランチ名を考え、 git switch -c します。
---

### 前提条件
ユーザーが と要件名、TASK-ID を与えます。  
{大文字の英字列-数字} を与えます。これを Jira に紐つく {PROJECT-KEY} と認識します。

### 事前確認
- `docs/tasks/{要件名}-*.md` を確認
- `{TASK-ID}` をもとに、このタスクで実施する内容を理解
- 簡潔かつ明確な機能名を考える

### 実行内容
`git switch -c {PROJECT-KEY}_{機能名}` でブランチを新規作成してください。

```bash
# example
git switch -c PROJECT-1_my-hoge-fuga-piyo
```
