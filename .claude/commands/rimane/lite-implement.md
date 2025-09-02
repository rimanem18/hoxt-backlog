---
name: rima-lite-implement
---

伝えられた要件名と TASK 番号をもとに、その要件のタスクを完了してください。

## 要件・設計の理解

まずは以下を読み込んでください。

- `docs/spec/{要件名}-requirements.md` を確認
- `docs/design/{要件名}/architecture.md` を確認
- `docs/design/{要件名}/database-schema.sql` を確認
- `docs/design/{要件名}/api-endpoints.md` を確認
- `docs/design/{要件名}/interfaces.ts` を確認
- `docs/design/{要件名}/dataflow.md` を確認
- `docs/tasks/{要件名}-tasks.md` を確認


## 実装

1. 仕様に則ってコードを Red - Green - Refactor のサイクルで実装します。Red は仕様に則り、Green, Refactor のときにはテストの意味自体が破壊されないようにします。

2. `docker compose exec {コンテナサービス名} bun run fix` でフォーマットします。問題があれば修正します。

3. コーディングが終わったら、 architecture-quality-code-reviewer を使用し、問題がないか確認します。

4. レビューによって品質やセキュリティに問題が見つかったか？
  - Yes
    -> 改善する
  - No
    -> ユーザーに成果物の確認を促す。

5. review 後の改善に関して
対応に完全は求めていない。（原則、成果60%程度で承認）:

- **対応必須**: 機能が壊れていたら修正
- **対応推奨**: 不要なコードの削除
- **対応非推奨**: 実施時間に見合わない品質向上
- **対応禁止**: ついでに機能を追加

6. 改めて `docker compose exec {コンテナサービス名} bun run fix` でフォーマットします。問題があれば修正します。
