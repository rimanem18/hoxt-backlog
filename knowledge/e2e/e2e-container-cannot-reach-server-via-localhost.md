---
description: Playwright E2Eテスト（docker compose exec e2e）や手動のブラウザ動作確認で、`page.route()`によるAPIモックを使わず実際のserverコンテナへ本物のリクエストを到達させたいとき（例: 招待メールのFakeゲートウェイが記録した実トークンでviewerアクセスAPIを叩く等、フルスタックの結合確認が必要な場面）に参照する。`net::ERR_CONNECTION_REFUSED`やタイムアウトでAPI呼び出しが失敗する場合に該当する。
---

# e2eコンテナ内のブラウザは`NEXT_PUBLIC_API_BASE_URL`の`localhost`にアクセスできない

## 背景

`compose.yaml`の`client`サービスは`NEXT_PUBLIC_API_BASE_URL=http://localhost:${SERVER_PORT}`を
持つ。これは、ブラウザがホストマシン上で動作し`http://localhost:3000`へアクセスする場合
（`server`もホストへ`ports: "3001:3001"`で公開されているため）にのみ正しく解決される値である。

一方、`e2e`サービス（Playwrightブラウザの実行コンテナ）は`client`と同じ`hoxt-backlog_default`
ブリッジネットワーク上にいるが、独立したネットワーク名前空間を持つ別コンテナである。
`docker compose`のポート公開（`ports:`）はホストのネットワークインターフェースに対して行われる
ものであり、他のコンテナの`localhost`には影響しない。

既存のE2Eテスト（`app/client/e2e/**/*.spec.ts`）がこの問題に一度も遭遇していなかったのは、
`e2e.md`が推奨する「APIによるテストデータセットアップ」の実践として、実際には
`page.route('**/api/...')`でAPIレスポンスを丸ごとモックしており、本物のバックエンドへの
ネットワーク到達性に依存していなかったため（`app/client/e2e/todo/helpers/task-setup.ts`等）。

## 生じた問題

HOXBL-101 Phase 8で、実装したviewer公開閲覧ページ（トークン付きURL）をブラウザで手動確認する
ため、`docker compose exec e2e node ...`からPlaywrightで`http://client:3000/viewer/{token}`へ
遷移したところ、画面には「通信エラーが発生しました。再試行してください」とだけ表示され、
`page.on('requestfailed', ...)`で確認すると

```
http://localhost:3001/api/viewer/tasks :: net::ERR_CONNECTION_REFUSED
```

となっていた。`page.route()`でモックを差し込んでいない、実サーバーへの結合確認だったために
表面化した。

## 対処法

`page.route()`で`http://localhost:3001/**`を横取りし、docker-compose内部DNS名
（`http://server:3001`）へ書き換えて`route.fetch()`→`route.fulfill()`で中継する。

```ts
await page.route('http://localhost:3001/**', async (route) => {
  const url = route.request().url().replace(
    'http://localhost:3001',
    'http://server:3001',
  );
  const response = await route.fetch({ url });
  await route.fulfill({ response });
});
```

これにより、アプリのコード（`NEXT_PUBLIC_API_BASE_URL`）は一切変更せず、ブラウザが実際に
送信するリクエストだけを配線し直せる。

サーバー側でテスト用の生トークンが必要な場合は、`viewerTestRoutes.ts`が提供する
`POST /api/__test__/viewer-tokens`（`isTestEndpointsEnabled()`時のみマウント、本番では
絶対に有効化されない）を、サーバーコンテナの内部から叩くと簡単に発行できる
（コンテナ内は同一ネットワーク名前空間のため`localhost:3001`で自分自身に到達できる）。

```bash
docker compose exec server bun -e "
const res = await fetch('http://localhost:3001/api/__test__/viewer-tokens', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'x@example.com', expiresAt: '2026-09-20T00:00:00.000Z' }),
});
console.log(await res.text());
"
```

## 学び

- この既存プロジェクトのE2Eテストが`localhost`問題に触れてこなかったのは、設計上
  「バックエンドへの実到達」を避けて`page.route()`モックに倒しているため。Phase 9（E2E）で
  もし「招待メールのFakeゲートウェイが記録した実トークンでviewerアクセスAPIを実際に叩く」
  ようなフルスタック結合シナリオを組む場合は、既存パターン通り`page.route()`でモックし切るか、
  上記の`server:3001`への付け替えパターンのどちらかを明示的に選択する必要がある
- `docker compose exec {container} bun -e "..."`のようにコンテナ内部から`fetch`する分には
  同一コンテナ内の`localhost`で自分自身に到達できるため、この問題は発生しない
