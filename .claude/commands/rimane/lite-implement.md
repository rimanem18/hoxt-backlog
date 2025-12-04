---
description: Claude が実装し、Codex がレビューする形で協働で実装します。
---

与えられた指示を完了してください。

- use context7 MCP
- use serena MCP
- use Codex MCP

codex 利用時は、 prompt のみ送信してください。sessionid や model は指定しないでください。


## プランニングフェーズ

1. 次のセクションで示されている実装順序にのっとった指示を遂行するためにプランを立てます。
  - プラン内容には、TDD or DIRECT のどちらで実装するか必ず記載します。
  - ユーザから何かしらの推測や提案が示された場合は、それが妥当かどうか精査します。

2. プラン内容を Codex MCP に共有し、レビューしてもらいます。

3. ユーザに提示し、ユーザの承認を得たら実装フェーズに進みます。

## 実装フェーズ

1. Red - Green - Refactor のサイクルで実装します。ただし、「TDD が適さないタスクである」と判断した場合は、DIRECT に実装して OK です。
  - Red: 仕様に則り、落ちるテストを書いてください。
  - Green: テストを通すことだけを考えた最小限の実装をおこなってください。
  - Refactor: テストを通すことだけではなく、コード品質向上をおこなってください。
    - 将来の変更や機能変更が容易にするための保守性の確保
    - コードの重複を排除したり、複雑さを取り除いてシンプルさの確保

2. 実装を終えたら、test と lint, 型チェック, semgrep を実施します。問題があれば修正します。
  - `docker compose exec {コンテナサービス名} bunx tsc --noEmit`
  - `docker compose exec {コンテナサービス名} bun run fix`
  - `docker compose exec {コンテナサービス名} test`
  - `docker compose run --rm semgrep semgrep <args...>`

3. フォーマットが終わったら、 Codex MCP を使用してレビューを依頼します。
  - {at-mark}/filepath でファイル情報を渡すことができます。
  - 提案をしてもらう際は5段階評価を依頼し、その理由も添えるよう求めてください。

4. レビューによって機能や品質、セキュリティに問題が見つかったか？
  - Yes
    -> 改善する
  - No
    -> ユーザーに成果物の確認を促す。

5. レビュー後の改善に関して

- **対応必須**: 機能が壊れていたら修正
- **対応推奨**: 不要なコードの削除
- **対応推奨**: 実施時間に見合った提案の取り入れ
- **対応任意**: 必要最低限の Why のコメント記載
- **対応非推奨**: 実施時間に見合わない品質向上
- **対応禁止**: ついでに機能を追加

6. 改めて、test と lint, 型チェック, semgrep を実施します。問題があれば修正します。
  - `docker compose exec {コンテナサービス名} bunx tsc --noEmit`
  - `docker compose exec {コンテナサービス名} bun run fix`
  - `docker compose exec {コンテナサービス名} test`
  - `docker compose run --rm semgrep semgrep <args...>`

## 実行後のサマリー出力

````

【実装サマリー】

- {サマリーを出力}

【Codex提案の対応必要性評価】

以下の提案がありましたが、対応は見送りました。

  1. Selector の分離

  対応推奨度: ⭐

  - 提案: memoized selectors のエクスポート
  - 評価理由:
    - 現状のstate構造は極めてシンプル（filters.priority, filters.status, sort.sortBy）
    - パフォーマンス問題は発生していない
    - 実際に複雑な算出ロジックが必要になった時点で実装すべき（YAGNI原則）
  - 判断: 対応不要

  ---
  2. resetFilters のクローン化

  対応推奨度: ⭐

  - 提案: state.filters = { ...initialState.filters } でクローン
  - 評価理由:
    - Redux Toolkit の Immer は内部で不変性を完全に保証
    - 現在の実装で参照共有の問題は発生しない
    - 過剰な防御的プログラミングはコードを冗長にする
  - 判断: 対応不要

  ---
  3. TaskSortBy 型の集約

  対応推奨度: ⭐⭐

  - 提案: sortBy のリテラル型を const 配列から派生
  - 評価理由:
    - 現在は3つのみで管理コストは低い
    - shared-schemas に TaskSort 型が既に存在する可能性あり
    - 型の一元管理は将来的に有用だが、現時点では緊急性なし
  - 判断: 優先度低（Phase 7 UI実装時に検討）

  ---
  4. typed hooks のエクスポート

  対応推奨度: ⭐⭐⭐⭐

  - 提案: useAppDispatch, useAppSelector の追加
  - 評価理由:
    - 既存の auth/error/oauthError slices でも型付きhooksを使用していない
    - プロジェクト全体で一貫性がない状態
    - ただし、今後のUI実装（Phase 7）で多用する前に導入すべき
  - 判断: Phase 7開始前に別タスクとして対応推奨

  {以下、同じようなフォーマットで出力}


対応推奨度⭐⭐⭐⭐の内容がn個あります。対応しますか？

- {内容をリストにして推奨アプローチを示してください}
````

#think
