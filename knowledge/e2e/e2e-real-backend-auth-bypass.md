---
description: Playwright E2Eで、page.route()による全モックではなく実バックエンド（実DB・実API）に対して認証必須のエンドポイント（project作成者としての操作等）を呼び出す必要があるときに参照する。viewerのTestOnlyViewerAccessTokenIssuerのような「トークンだけ発行するテスト専用経路」では、AuthMiddlewareが実JWKS検証を行うため不十分な場合に該当する。「E2Eから疑似ログイン状態を作りたいが、実Supabaseアカウントは用意されていない」という場面で参照する。
---

## 見出し

project作成者側の操作を実バックエンドに対してE2Eで検証するには、Supabase JWKS検証を通過できる専用の認証バイパス機構が必要で、かつ発行する疑似トークンはJWTと同じ3パート構造でなければクライアント側のガードに弾かれる

## 背景

このプロジェクトの既存E2Eテスト（`app/client/e2e/project/`, `app/client/e2e/todo/`, `app/client/e2e/auth-email/`）はすべて`page.route()`による全モックで、実際のSupabase認証・実バックエンドには一度も到達していなかった（`knowledge/e2e/e2e-container-cannot-reach-server-via-localhost.md`参照）。

HOXBL-101 Phase 9で、viewer招待〜メール送信〜一覧確認〜取り消し〜復元を「実際に招待メール（Fakeゲートウェイ）が送信され、実DBの状態が変化する」レベルで検証する必要があった。viewer側のトークンアクセス（`GET /api/viewer/tasks`）は`TestOnlyViewerAccessTokenIssuer`が既にテスト専用の発行経路を持っていたが、project作成者側の操作（招待・一覧・取り消しAPI）は既存`AuthMiddleware`が実際のSupabase JWKS検証を行うfail-closedな認証経路であり、テスト用のバイパス手段が存在しなかった。

## 生じた問題

project作成者としてのE2E操作には、実際にDBへ検証可能な形で認証済みJWTを渡す必要があるが、実Supabaseテストアカウントは環境に用意されておらず（`.env`はサンドボックスから読み取り不可、既存のauth-email E2Eも全てモックで実Supabase到達を避けている）、かつ`AuthMiddleware`は本番同様のJWKS署名検証をそのまま通す設計だった。

## 対処法

### 1. IAuthProviderをラップする委譲実装でバイパスを追加する

`AuthDIContainer.getAuthProvider()`が返す`IAuthProvider`実装（`SupabaseJwtVerifier`）を、`TestBypassAuthProvider`でラップした。

```ts
// AuthDIContainer.ts
AuthDIContainer.authProviderInstance = new TestBypassAuthProvider(
  new SupabaseJwtVerifier(),
);
```

`TestBypassAuthProvider.verifyToken(token)`は、`isTestEndpointsEnabled()`が真かつトークンのpayloadに専用マーカーを含む場合のみ署名検証をスキップし、それ以外は常に委譲先（本物のJWKS検証）へ渡す。この設計により、`jwks.ts`や`AuthMiddleware.ts`（全リクエストが通る共通の認証経路）には一切手を加えず、テスト専用ロジックをDIコンテナの配線だけに閉じ込められる。

### 2. トークン発行はJITプロビジョニングの既存ロジックを再利用する

`POST /api/__test__/auth-sessions`（`isTestEndpointsEnabled()`時のみマウント）は、`AuthenticationDomainService.authenticateUser()`（本番のJIT/合流ロジックと同じもの）を直接呼び、DBに実在するユーザーを作成または再利用する。

```ts
const { user } = await domainService.authenticateUser({
  id: `e2e_${crypto.randomUUID()}`, // 呼び出しごとに新規生成
  provider: 'email',
  email,
  name,
});

const accessToken = issueTestAccessToken({
  sub: user.externalId, // 生成したidではなく、戻り値のexternalIdを使う
  email: user.email,
  provider: user.provider,
});
```

**注意点**: `authenticateUser`は「渡した`id`で見つからなければ、同じemailの既存ユーザーへ`findByEmail`フォールバックで合流する」ロジックを持つ（`knowledge/auth/supabase-identity-linking-provider-mismatch.md`と同じ仕組み）。そのため、同じemailで2回目にこのエンドポイントを叩くと、返る`user.externalId`は最初に生成したランダムIDのまま変わらない。トークンには**戻り値の`user.externalId`**を埋め込む必要があり、リクエストのたびに生成する`id`をそのまま使うと、`AuthMiddleware`の`findByExternalId(sub, provider)`がDB上の値と一致せず認証に失敗する。

### 3. 疑似トークンはJWTと同じ3パート構造にする

当初、独自の接頭辞（`e2e_test_token.<base64>`）1個のトークン文字列を発行していたが、クライアント側の`app/client/src/shared/utils/authValidation.ts`が

```ts
const tokenHasThreeParts = authData.access_token.split('.').length === 3;
```

でJWT形式（3パート）であることをローカルに要求しており、この条件を満たさないとAuthGuardが「未認証」と判定し、バックエンドには到達する前にログイン画面へリダイレクトされてしまうことが判明した。対処として、`header.payload.signature`という3パート構造にし、payload内に`marker: 'e2eTestToken'`を埋め込んで判別する方式に変更した。

```ts
const TEST_TOKEN_HEADER = Buffer.from(
  JSON.stringify({ alg: 'none', typ: 'e2eTestToken' }),
).toString('base64url');

export function issueTestAccessToken(claims: TestTokenClaims): string {
  const payload = { ...claims, marker: 'e2eTestToken' };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${TEST_TOKEN_HEADER}.${encodedPayload}.e2e-test-signature`;
}
```

### 4. E2E側はブラウザのlocalStorageに疑似トークンを注入する

既存の`buildMockAuthStorageState(origin, user, { accessToken })`（`app/client/e2e/shared/helpers/auth-session.ts`）がすでに`accessToken`のoverrideを受け付ける設計だったため、そのまま再利用できた。AuthGuardのセッション確認（`/api/v1/*`）はモックし、実際のドメインAPI呼び出し（`localhost:3001` → `server:3001`）は`page.route()`で中継する。

## 学び

- クライアント側にAPIレスポンスとは独立した「トークン形式そのもの」に対するローカルバリデーション（`split('.').length === 3`等）が存在する場合、サーバー側だけを見て疑似トークンの形式を決めると、バックエンドの検証ロジックまで到達する前にクライアント側で弾かれる。E2E用の疑似トークンを設計する際は、サーバー側の検証だけでなくクライアント側のガードも確認する
- JITプロビジョニング系のロジック（`findByExternalId`失敗時に`findByEmail`で合流する等）を持つ認証サービスをテスト用に再利用する場合、呼び出し側が渡した入力値（今回は生成用の`id`）と、戻り値のエンティティが持つ実際の値（`externalId`）が一致するとは限らない。後続で使う識別子は必ず戻り値から取る
- 認証バイパスのような高リスクな追加は、既存の共通認証経路（`jwks.ts`, `AuthMiddleware.ts`）に分岐を増やすのではなく、`IAuthProvider`のような既存の抽象化をラップする形で追加すると、本番の検証ロジックに触れずに済み、レビュー・監査の対象を局所化できる
- ガードは「トークン発行時」と「トークン検証時」の両方で独立してチェックする（今回は`isTestEndpointsEnabled()`をエンドポイントのマウント条件と`TestBypassAuthProvider.verifyToken`の両方で評価）と、片方が想定外の状態になっても他方がfail-closedに働く
