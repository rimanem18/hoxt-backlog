---
name: tdd-implement
description: /tdd-requirements で生成された要件に従って TDD で実装します。
---

1. - 指定されたTDD要件の TASK 番号の実施範囲を特定し、次のサブエージェントが混乱しないように、タスクの実施範囲を明確化
    - フロントエンドか、バックエンドか、API のつなぎこみは必要か
  - `@.claude/skills/common/references/*.md` を List して用意されているガイドラインを把握

2. @agent-tdd-impl-engineer に実装を依頼してください。TDD 要件のファイルパスを渡して、それに従って実装するように指示してください。

### Engineer への入力例

例1
```md
フロントエンド開発ガイドラインを参照してください。

## 関連情報

- `docs/implements/{要件名}/{task_id}/{feature_name}-requirements.md`
```

例2
```md
バックエンド開発ガイドラインを参照してください。

## 関連情報

- `docs/implements/{要件名}/{task_id}/{feature_name}-requirements.md`
```

その他、必要なガイドラインがありそうなら含めてください。

**必須**: `docs/tasks/{要件名}-phase*.md` の関連タスクのチェックボックスを埋める
**禁止**: メインエージェントがファイルの内容を Read ツールで読み込む
 