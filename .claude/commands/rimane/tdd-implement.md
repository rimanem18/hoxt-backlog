---
name: tdd-implement
description: tumiki:tdd-requirements で生成された要件に従って TDD で実装します。
---

## 事前準備

1. まずは以下を把握してください。

- `@docs/spec/{feature_name}-*.md`
- `@docs/design/{feature_name}/*`
- `@docs/implements/{feature_name}/{task_id}/*-requirements.md`

2. テスト要件を参考にテストケースを実装してください。テストケースの実装状況をチェックボックスリストにして記録してください。
3. refactor まで実装とレビューが済んだら、チェックボックスを埋めてユーザーに報告してください。
4. 信頼度や信号や【】などは記載せず、 シンプルかつオンボーディングしたばかりのエンジニアにもわかりやすく明記したコメントのみを記載してください。
5. すべての実装が完了したら、 `@docs/tasks/{feature_name}-phase*.md` を探して適切なフェーズの、完了した範囲のチェックボックスを埋めてください。

## 実行

`/rimane:lite-implement` を実施することで実装を開始してください。
