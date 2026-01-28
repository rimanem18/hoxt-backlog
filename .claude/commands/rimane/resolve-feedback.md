---
description: プルリクエストについた指摘に対して対応するかどうか判断し、推奨アプローチを提案します。
---

この指摘の妥当性を5段階で評価し、修正が必要か判断します。

## 事前確認

1. 内容から指摘箇所を導き出し、関連ファイルを分析
2. 必要な関連ガイドラインを取捨選択して把握

- バックエンド開発ガイドライン: `.claude/skills/common/references/backend.md`
- フロントエンド開発ガイドライン `.claude/skills/common/references/frontend.md`
- スキーマ駆動開発ガイドライン: `.claude/skills/common/references/schema-db.md`
- E2Eテストガイドライン `.claude/skills/common/references/e2e.md`

## 実行内容

1. 妥当性を 1（妥当性が低い）〜5（妥当性が高い）で評価
2. 推奨アプローチを3つ以上提案（テストケースに対する指摘の場合、テストケース削除の選択肢とその価値・影響度も含める）

$arguments

#think
