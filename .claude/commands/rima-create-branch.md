---
description: issue 番号と機能名を与えてブランチ名を考え、 git switch -c します。
---

### 前提条件
ユーザーが issue 番号と要件名、TASK-ID を与えます。

### 事前確認
- `docs/tasks/{要件名}-tasks.md` を確認
- `{TASK-ID}` をもとに、このタスクで実施する内容を理解
- 簡潔かつ明確な機能名を考える

### 実行内容
`git switch -c issue#{issue 番号}_{機能名}` でブランチを新規作成してください。
