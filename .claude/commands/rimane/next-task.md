---
allowed-tools: Bash(git switch:*), Bash(git pull:*), Bash(git fetch:*)
description: 次のタスクに切り替えるための準備をします。
---


## 事前実行

!`git switch main`
!`git pull origin main`
!`git fetch -p`

## 実行内容

1. fetch された新しいブランチに `git switch {branch-name}` を実施してください。
2. 現在のブランチを確認し、 fetch された新しいブランチになっていることを確認してください。
