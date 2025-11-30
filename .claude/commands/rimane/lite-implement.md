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
  - Refactor: テストを通すことだけではなく、誰が読んでもわかりやすい可読性の確保・将来の変更や機能変更が容易にするための保守性の確保・コードの重複を排除したり、複雑さを取り除いてシンプルさの確保をして、コード品質向上をおこなってください。

2. 実装を終えたら、test と lint, 型チェック, semgrep を実施します。問題があれば修正します。
  - `docker compose exec {コンテナサービス名} bunx tsc --noEmit`
  - `docker compose exec {コンテナサービス名} bun run fix`
  - `docker compose exec {コンテナサービス名} test`
  - `docker compose run --rm semgrep semgrep <args...>`

3. フォーマットが終わったら、 Codex MCP を使用してレビューを依頼します。
  - {at-mark}/filepath でファイル情報を渡すことができます。

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

#think
