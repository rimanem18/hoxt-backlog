---
description: Playwright E2Eテスト（docker compose exec e2e）でフォームのclick()後にonSubmitが発火せずネイティブHTML送信（フルページリロード、URLに`?`が付与）になる、あるいは原因不明のハイドレーション不全に遭遇したときに参照する。Next.js devサーバーのOrigin検証（DNSリバインディング対策）がDocker Composeのサービス名（例: client:3000）を信頼せずHMR WebSocketを破壊し、hydrateRoot()まで到達しなくなる既知の問題と、allowedDevOrigins / NEXT_PUBLIC_TRUSTED_DOMAINSによる対処法・切り分け手順を記載している。
---

# Docker Compose 環境でNext.js devサーバーのOrigin検証がハイドレーションを破壊する問題

## 背景

Playwright E2E テスト（`docker compose exec e2e npx playwright test`）で、ブラウザがサービス名
（例: `http://client:3000`）経由で Next.js dev サーバーにアクセスする構成の場合、
Next.js の DNS リバインディング対策（Origin 検証）に阻まれてクライアントサイドの
ハイドレーションが完了しなくなることがある。

## 発生した問題

E2E テストでフォームの `送信` ボタンを `click()` すると、React の `onSubmit` が一切呼ばれず、
素の HTML フォームとしてネイティブ送信（フルページリロード、URL に `?` が付与される）が
発生する現象が起きた。

### 誤った当初仮説

最初は「ハイドレーションのタイミング問題」（クリックが React のイベントハンドラ登録より早い）
だと疑ったが、以下の切り分けで否定された。

- `page.waitForLoadState('networkidle')` を挟んでも再現する
- クライアント側バリデーションのみで完結するはず（ネットワーク不要）のケースでも再現する
- `document.querySelector('form')` に `__reactFiber$...` / `__reactProps$...` が
  一切付与されていない（5秒ポーリングしても付与されない）→ **そもそもハイドレーションが
  完了していない**
- 新規実装ページだけでなく、既存のホームページでも同様に再現する（実装コードのバグではない）
- `window.addEventListener('submit', ...)` で bubble 完了後に `event.defaultPrevented` を
  確認すると `false` → React 側が一切ハンドリングしていないことが確定

### 真因の特定手順

1. ブラウザのコンソールに `[HMR] connected` が出ず、代わりに
   `WebSocket connection to 'ws://client:3000/_next/webpack-hmr' failed: Error during
   WebSocket handshake: net::ERR_INVALID_HTTP_RESPONSE` が繰り返し出ていた
2. `curl` で同じ WebSocket ハンドシェイクを手動実行して切り分け

   ```bash
   # Origin を Host と一致させる（ブラウザの挙動を再現）と失敗する
   curl -v -N --max-time 6 \
     -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Origin: http://client:3000" \
     http://client:3000/_next/webpack-hmr
   # => "Received HTTP/0.9 when not allowed" で失敗

   # Origin を localhost にすると成功する
   curl ... -H "Origin: http://localhost:3000" http://client:3000/_next/webpack-hmr
   # => "HTTP/1.1 101 Switching Protocols" で成功
   ```

3. **`Origin` ヘッダーがリクエスト先の Host（`client:3000`）と一致する場合にのみ失敗し、
   別の Origin（`localhost:3000`）だと成功する** という逆説的な挙動を確認
4. Next.js の dev サーバーには DNS リバインディング対策として、`localhost` /
   `127.0.0.1` 以外のホストからのアクセスを `allowedDevOrigins`
   （`next.config.ts`）で明示的に許可する必要がある機能があり、これが原因と判明
5. HMR の WebSocket 接続失敗は本来 hydration と無関係に見えるが、Next.js dev の
   クライアントブートストラップは HMR ソケット確立を待ってから React の
   hydrateRoot を進める実装になっており、ここが失敗すると **ページ全体で
   ハイドレーションが一切完了しない**

## 対処法

`app/client/next.config.ts` に `allowedDevOrigins` を追加し、Docker Compose の
サービス名を明示的に許可する。

```typescript
const nextConfig: NextConfig = {
  // Docker Compose環境ではブラウザが `client` サービス名でdevサーバーへ
  // アクセスするため、Next.jsのDNSリバインディング対策（Origin検証）が
  // localhost以外を許可せずHMR WebSocketハンドシェイクを破棄してしまう。
  allowedDevOrigins: ['client'],
  // ...
};
```

あわせて、Origin 検証とは別に、アプリ側で実装しているオープンリダイレクト対策
（`validateRedirectUrl` 等、信頼済みドメインの allowlist チェック）にも
Docker サービス名を追加しないと、`window.location.origin` を使った
`redirectTo` の構築（パスワードリセット等）が「信頼できないURL」として
弾かれることがあるため注意する。

```yaml
# compose.yaml
- NEXT_PUBLIC_TRUSTED_DOMAINS=http://localhost:${CLIENT_PORT},http://localhost:${SERVER_PORT},http://client:${CLIENT_PORT}
```

いずれも `next dev` 実行時のみ影響する設定変更であり、`output: 'export'` の
本番ビルド挙動や、本番/preview 環境の環境変数には影響しない。

## 切り分けの学び

- `pageerror` イベントが発生しない ≠ ハイドレーションが成功している。
  `document.querySelector(el)` に `__reactFiber$...` / `__reactProps$...` が
  付与されているかどうかで直接確認するほうが確実
- 「React DevTools をダウンロードしてください」というコンソールログは
  `react-dom` パッケージが読み込まれた証拠にしかならず、`hydrateRoot()` が
  成功した証拠にはならない
- HMR の WebSocket 失敗は「開発体験の問題」として軽視しがちだが、
  Next.js のバージョンによってはアプリ全体のハイドレーション成否に
  直結することがあるため、原因不明のハイドレーション不全を調査する際は
  最初に確認すべき項目の一つ
