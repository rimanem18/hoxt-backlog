# Phase 9: E2Eテスト（主要シナリオ検証）

## 1. このフェーズの目的

Playwrightにより、招待〜メール送信〜一覧確認〜取り消し〜再招待復活、viewerの横断閲覧、異常系（自己招待・無効トークン・期限切れトークン・他ユーザーprojectへの操作）を通しシナリオとして検証する。ユーザー指定により、Phase 1〜8で実装済みの機能に対する最後の確認タスクとしてこのフェーズを配置する。

## 2. 確認可能なこと

- ブラウザ操作ベースで、招待から閲覧・取り消し・復元までの主要シナリオが一気通貫で動作することが確認できる
- 異常系（自己招待、無効メール形式、他ユーザーprojectへの操作、無効・期限切れトークンでのアクセス）がE2Eレベルでも拒否されることが確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-101〜REQ-106, REQ-201, REQ-301〜REQ-306, REQ-501〜REQ-503
- **関連設計**: design.md 全章

## 4. 依存関係

- **前提フェーズ**: Phase 7, Phase 8
- **ブロッカー**: なし（生アクセストークンの取得手段はPhase 3 TASK-3-02で既に用意されている前提。このフェーズでは、その仕組みをE2Eテストコードから利用するだけでよい）

## 5. タスク一覧

- [x] **TASK-9-00: E2E認証バイパス機構の追加（計画外・DIRECT）**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: なし（テスト基盤）
  - **実装詳細**: project作成者側（招待・一覧・取り消し）のE2Eを実バックエンドに対して実行するための認証手段が計画に存在しなかったため追加した。`app/server/src/user/infrastructure/TestBypassAuthProvider.ts`（`IAuthProvider`委譲実装、`isTestEndpointsEnabled()`かつpayloadにE2E専用マーカーを持つ場合のみ署名検証をスキップ）、`app/server/src/user/presentation/authTestRoutes.ts`（`POST /api/__test__/auth-sessions`、DB上に実在するuserに対する疑似アクセストークンを発行）を新設し、`AuthDIContainer.getAuthProvider()`が返すプロバイダーを`TestBypassAuthProvider`でラップした
  - **完了条件**: E2Eから発行した疑似トークンで、実バックエンドのJWT認証必須エンドポイント（project作成含む）を呼び出せること。本番環境・テスト専用エンドポイント無効環境ではバイパスが機能しないこと
  - **注意点**: 詳細は本ファイル末尾「差異の記録」を参照

- [x] **TASK-9-01: E2Eヘルパー - Fakeゲートウェイの送信内容取得ユーティリティ実装**
  - **タイプ**: DIRECT
  - **依存タスク**: Phase 3（TASK-3-02のFakeゲートウェイ）
  - **関連要件**: なし（テスト基盤）
  - **関連設計**: overview.md 2章, RISK-06
  - **実装詳細**: `app/client/e2e/viewer/helpers/mail-capture.ts`に、Phase 3で用意したテスト専用の送信内容取得経路を呼び出し、直近の招待メール送信内容（宛先email・アクセスURL・生トークン）を取得するユーティリティと、任意の`expiresAt`を指定してトークンを発行する経路を呼び出すユーティリティ（TASK-9-07で使用）を実装する
  - **完了条件**: E2Eテストコードから、招待操作後の送信内容と、期限切れ状態を指定したトークン発行の両方を利用できること
  - **注意点**: これらの経路が本番環境で機能しないことを、Phase 3側のガードを前提に再確認する

- [x] **TASK-9-02: viewer招待〜メール送信〜一覧確認のE2Eシナリオ（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-9-01
  - **関連要件**: REQ-101, REQ-102, REQ-004, REQ-105
  - **関連設計**: design.md §5.1, §7.1
  - **実装詳細**: `app/client/e2e/viewer/viewer-invite.spec.ts`に、project作成者がviewerを招待し、招待済みviewer一覧に反映されることを確認するシナリオを実装する（AC-01, AC-07）
  - **完了条件**: シナリオがグリーンで実行されること

- [x] **TASK-9-03: viewer招待の異常系E2E（自己招待・不正メール形式・他ユーザーprojectへの操作拒否）（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-9-02
  - **関連要件**: REQ-302, REQ-304, REQ-001, REQ-305
  - **関連設計**: design.md §5.3
  - **実装詳細**: 自己招待エラー、不正メール形式エラー、他ユーザーprojectへの招待/一覧確認/取り消し操作の拒否をE2Eで検証する（AC-04, AC-06, AC-12）
  - **完了条件**: シナリオがグリーンで実行されること

- [x] **TASK-9-04: 招待の取り消し〜再招待による復元のE2Eシナリオ（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-9-02
  - **関連要件**: REQ-106, REQ-503
  - **関連設計**: design.md §6
  - **実装詳細**: `app/client/e2e/viewer/viewer-revoke-restore.spec.ts`に、招待の取り消し（他projectへの影響がないこと含む）と、取り消し済み組み合わせへの再招待による復元を確認するシナリオを実装する（AC-08, AC-13）
  - **完了条件**: シナリオがグリーンで実行されること

- [x] **TASK-9-05: viewerトークンアクセスによる横断閲覧のE2Eシナリオ（複数project）（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-9-01
  - **関連要件**: REQ-104, REQ-003
  - **関連設計**: design.md §5.2
  - **実装詳細**: `app/client/e2e/viewer/viewer-access.spec.ts`に、TASK-9-01で取得したトークンでviewer公開閲覧画面にアクセスし、複数projectのtaskがprojectごとにグルーピングされ、title・description・status・priorityが表示されることを確認するシナリオを実装する（AC-09）
  - **完了条件**: シナリオがグリーンで実行されること

- [x] **TASK-9-06: 無効トークンアクセス拒否、招待全取り消し後の空状態のE2Eシナリオ（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-9-05
  - **関連要件**: REQ-301, REQ-201
  - **関連設計**: design.md §5.2手順3・6, §5.3
  - **実装詳細**: 存在しない・不正な形式のトークンでのアクセス拒否、および招待が全て取り消された状態での空状態表示（エラーにならないこと）をE2Eで検証する（AC-10の一部, AC-11）
  - **完了条件**: シナリオがグリーンで実行されること

- [x] **TASK-9-07: 期限切れトークンアクセス拒否のE2Eシナリオ（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-9-05
  - **関連要件**: REQ-306
  - **関連設計**: design.md §5.2手順3
  - **実装詳細**: 期限切れトークンでのアクセス拒否をE2Eで検証する（AC-10の境界値）。ブラウザ側のクロック操作（Playwrightの`clock`API）はサーバー側の時刻判定には影響しないため使用しない。Phase 3 TASK-3-02で用意したテスト専用経路（`expiresAt`を任意の過去日時に指定してトークンを発行する）をTASK-9-01のE2Eヘルパー経由で呼び出し、期限切れ状態を確実に再現する
  - **完了条件**: シナリオがグリーンで実行されること
  - **注意点**: この再現手段が本番環境では機能しないことは、Phase 3側のガードにより担保済みであることを再確認する

## 6. このフェーズの完了条件

- Phase 3〜8で実装した主要シナリオ（正常系・異常系・境界値）がE2Eレベルで一気通貫に確認できること
- `docker compose exec e2e npx playwright test e2e/viewer`がすべてグリーンであること
- テスト専用の生トークン取得・期限切れ再現手段が、本番環境では機能しないことを担保していること

## 7. 実施記録

- 開始時刻: 2026-08-22 17:15 JST
- 終了時刻: 2026-08-22 17:42 JST
- 合計時間: 約27分（typecheck/test/lint/build/semgrep・E2E実行時間を含む）

### 差異の記録

- **TASK-9-00（計画外）: E2E認証バイパス機構の追加**: 計画は「project作成者側（招待・一覧・取り消し）のE2Eを実バックエンドに対して実行する」ことを前提としていたが、project作成者側の認証手段が計画に存在しなかった（viewer側の`TestOnlyViewerAccessTokenIssuer`に相当するものが認証側になかった）。着手前にユーザーへ選択肢（1. テスト専用認証バイパスを新設 / 2. 実Supabaseテストアカウントを使う / 3. project作成者側はpage.route()で従来通りモックする）を提示し、「テスト専用の認証バイパスを新設」を選択いただいた。これに基づき、`TestBypassAuthProvider`（`IAuthProvider`委譲実装）と`POST /api/__test__/auth-sessions`（`authTestRoutes.ts`）を新設し、`AuthDIContainer.getAuthProvider()`を経由する既存の認証経路に対して`isTestEndpointsEnabled()`かつE2E専用マーカー付きトークンの場合のみ検証をスキップするラッパーとして追加した。本番環境・テスト専用エンドポイント無効環境ではバイパスされないことをユニットテストで担保している
- **疑似アクセストークンをJWTと同じ3パート構造にした**: 当初、カスタム接頭辞（`e2e_test_token.`）1個のトークン文字列を検討したが、クライアント側の`authValidation.ts`が`access_token.split('.').length === 3`でJWT形式であることを要求しており、この形式でないとAuthGuardが未認証と判定してしまうことが実装中に判明した。そのため、`header.payload.signature`という3パート構造とし、payload内に`marker: 'e2eTestToken'`を埋め込んで判別する方式に変更した
- **Codexレビュー相当の一般探索サブエージェントによるコードレビュー（CLAUDE.local.mdの方針では複数観点のCodex MCP直接接続を想定していたが、今回は1エージェントへの多観点依頼で代替）で検出し対応した指摘**:
  - 【test-coverage/conventions, 中】`authTestRoutes.ts`に対応する`__tests__`が存在せずプロジェクト規約に反していた指摘。`app/server/src/user/presentation/__tests__/authTestRoutes.test.ts`を追加し、email未指定・不正型それぞれで400を返すことを検証した
  - 【line-by-line, 中】`body.email as string`が素通しキャストで、未指定・不正型でも500に丸投げされていた指摘。email必須・文字列型チェックを追加し、違反時は400 `VALIDATION_ERROR`を返すよう修正した
- **Codexレビュー相当のレビューで検討し対応を見送った指摘**:
  - 【cross-file, 低】`authTestRoutes.ts`に本番同等のログ出力・パフォーマンス計測がなくE2E失敗時の切り分けがしづらい指摘。テスト専用インフラコードに本番水準の計測を持ち込むのは実施時間に見合わないと判断し、Playwrightのtrace/screenshotとE2Eヘルパー側の例外メッセージで代替とした
- **`docker compose exec server bun run build:lambda`が権限エラーで失敗**: esbuildによるバンドル自体は1.6mbで生成成功したが、`dist/index.js`への書き込みが`permission denied`で失敗した。既存の`dist/`ディレクトリの所有者起因の環境要因であり、今回の実装内容とは無関係と判断した（`bunx tsc --noEmit`・`bun test`・`bun run build`（client）はすべて成功）

### 所要時間

- `docker compose exec server bunx tsc --noEmit`: エラーゼロ
- `docker compose exec server bun test`: 979 pass / 0 fail（約21秒、フルスイート）
- `docker compose exec server bun run fix`（Biome lint & format）: 修正なし
- `docker compose exec client bunx tsc --noEmit`: エラーゼロ
- `docker compose exec client bun run fix`（Biome lint & format）: 修正なし
- `docker compose run --rm semgrep semgrep --config auto`（変更ファイル対象）: 0 findings
- `docker compose exec client bun run build`: 正常にビルド完了（`/viewer/[token]`は動的ルートとして生成）
- `docker compose exec e2e npx playwright test e2e/viewer`: 9 pass / 0 fail（約7秒）
- `make fmt`: 修正なし
