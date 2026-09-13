---
description: docker compose run --rm semgrep semgrep でサーバーサイドの静的セキュリティチェックを実行する前、特にTDDのGreenフェーズなどで新規ファイルを作成した直後にsemgrepを実行するときに参照する。semgrepの出力に「Scan was limited to files tracked by git」という表示があるにもかかわらず、新規作成したファイルが対象に含まれているか確認していない場合に該当する。
---

## 見出し

`docker compose run --rm semgrep semgrep <args...>` はデフォルトで**gitに追跡されているファイルのみ**をスキャンする。新規作成した未`git add`のファイルは、実行結果に何のエラーも出さずに黙ってスキャン対象から除外される。

## 背景

HOXBL-102 Phase 3で新規ファイル（`PushSubscriptionEntity.ts`, `PostgreSQLPushSubscriptionRepository.ts`等）を複数追加した後、品質ゲートの一環として`docker compose run --rm semgrep semgrep --config=auto app/server/src/viewer ...`を実行した。

## 生じた問題

1回目の実行結果は「Ran 210 rules on 75 files: 0 findings」だったが、出力をよく見ると

```
Scan Summary
Some files were skipped or only partially analyzed.
  Scan was limited to files tracked by git.
```

という注記があった。`git ls-files`で確認すると、新規作成したファイル（`git status`で`??`になっているもの）は75ファイルの中に含まれておらず、実質的に一切スキャンされていなかった。エラーや警告は出ないため、この注記を読み飛ばすと「新規実装したコードはセキュリティチェック済み」と誤解したまま次の工程に進んでしまう。

`git add`で対象ファイルをステージング（コミットはまだしていない）した後に同じコマンドを再実行すると、`git ls-files`で数えたファイル数が変化し、新規ファイルが実際にスキャン対象へ含まれることを確認した。

## 対処法

新規ファイルを追加した後にsemgrepで品質ゲートを実行する前に、対象ファイルを`git add`でステージングする（コミットは不要、インデックスに載せるだけでよい）。

```bash
git add <新規ファイルを含むディレクトリ>
docker compose run --rm semgrep semgrep --config=auto <target>
```

実行後、出力に「Scanning N files tracked by git」という行があるので、そのNが期待するファイル数（`git ls-files <target> | wc -l`等）と一致しているか必ず確認する。

## 学び

- semgrepの「gitに追跡されたファイルのみ対象」という挙動は、`.semgrepignore`等の明示的な除外設定がなくても発生する（デフォルト挙動）ため、除外設定ファイルを探しても気づけない
- 「0 findings」という結果は「対象ファイルにセキュリティ上の問題がない」ことを意味するだけで、「意図した全ファイルがスキャンされた」ことを保証しない。スキャン対象数を必ず突き合わせる習慣が必要
- 同様の「git管理下のファイルのみを対象にする」ツールは他にもありうるため、新規ファイル作成直後の品質ゲート実行では、対象ファイル数や対象パスの表示を都度確認する
