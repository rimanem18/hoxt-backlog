---
description: Supabaseのidentity linkingをON にした環境で、AuthMiddlewareやAuthenticationDomainServiceなど`findByExternalId(externalId, provider)`でユーザーを検索する処理を実装・変更するときに参照する。同一人物が複数プロバイダー（Google+emailなど）でサインインし`provider`が変化しても`sub`は同一になるため、providerが切り替わった合流ユーザーが後続API呼び出しで401になる場合や、`AuthProvider`型に新しいプロバイダーを追加する場合に該当する。
---

# Supabase identity linking ON 環境での provider 不一致問題

## 背景

Supabase の identity linking を ON にした環境で、同一ユーザーが複数の認証プロバイダー（Google + email など）を使う場合、JWT の `app_metadata.provider` が変化しても `sub`（Supabase UUID）は同一になる。
この前提に起因するバグパターンと対処法。

## 問題のシナリオ

```
1. ユーザーが Google でサインアップ
   JWT: { sub: "UUID-1", app_metadata: { provider: "google" } }
   app DB: { externalId: "UUID-1", provider: "google", email: "user@example.com" }

2. 同一ユーザーが email+password でもサインイン（identity linking により同一 sub）
   JWT: { sub: "UUID-1", app_metadata: { provider: "email" } }

3. AuthMiddleware が findByExternalId("UUID-1", "email") を呼ぶ
   → DB には provider="google" で登録されているため NOT FOUND → 401
```

## 発生した問題

`AuthMiddleware` で `findByExternalId(sub, provider)` のみで検索していたため、`provider` が切り替わった合流ユーザーが後続 API 呼び出しで常に 401 になる。

`/auth/verify`（JIT プロビジョニング）は `AuthenticationDomainService.authenticateUser` を通るため `findByEmail` フォールバックで正常動作するが、他のエンドポイントは `AuthMiddleware` のみを通るため失敗していた。

## 対処法

### 1. AuthenticationDomainService（JIT プロビジョニングパス）

`findByExternalId` で見つからない場合に `findByEmail` でフォールバック：

```typescript
// authenticateUser メソッド内
const userData = await this.userRepository.findByExternalId(
  externalInfo.id,
  externalInfo.provider as AuthProvider,
);

if (!userData) {
  // provider をまたいだ同一人物の二重登録を防ぐため（REQ-002）
  const emailUser = await this.userRepository.findByEmail(
    EmailAddress.of(externalInfo.email).value,
  );

  if (emailUser) {
    user = UserEntity.restore(emailUser);
  } else {
    user = await this.createUserFromExternalInfo(externalInfo);
    isNewUser = true;
  }
}
```

### 2. AuthMiddleware（後続 API 呼び出しパス）

`findByExternalId` 失敗後に `payload.email` で `findByEmail` フォールバック：

```typescript
let user = await userRepository.findByExternalId(externalId, provider);

// identity linking ON 環境で provider が切り替わった合流ユーザー向けフォールバック
// externalId が一致しない場合は別ユーザーの可能性があるため認証失敗として扱う
if (!user && payload.email) {
  const userByEmail = await userRepository.findByEmail(
    EmailAddress.of(payload.email as string).value,
  );
  if (userByEmail && userByEmail.externalId === externalId) {
    user = userByEmail;
  }
}

if (!user) {
  throw new AuthError('USER_NOT_FOUND', 401, '...');
}
```

Supabase の JWT ペイロードには `payload.email` が含まれるため、このフォールバックが機能する。`findByEmail` がヒットしても JWT の `externalId` と DB 上の `externalId` が一致しない場合は別人の可能性があるため、ユーザーとして採用しない。

## email 正規化の注意点

`findByEmail` に渡す前に必ず `EmailAddress` 値オブジェクトで正規化する：

```typescript
// NG: 素の文字列のまま渡す（前後空白・大文字小文字が残る可能性）
userRepository.findByEmail(rawEmail)

// OK: EmailAddress.of() で trim + 小文字化してから渡す
userRepository.findByEmail(EmailAddress.of(rawEmail).value)
```

DB の UNIQUE インデックスも `lower(email)` 関数インデックスを使用しているため、正規化の一貫性が重要。

## 型キャストの注意点

`AuthMiddleware` で `isValidAuthProvider` チェック後にキャストする際、追加したプロバイダーをキャスト先の union 型に含めること：

```typescript
// NG: 追加した 'email' が含まれていない
const provider = providerStr as 'google' | 'github' | 'facebook' | 'microsoft' | 'apple' | 'line';

// OK: AuthProvider 型（全プロバイダーを含む）を使う
const provider = providerStr as AuthProvider;
```

新しいプロバイダーを `AuthProvider` 型に追加したとき、ミドルウェアのキャストも確認すること。

## 設計上の考慮点

この `findByEmail` フォールバックは認証リクエストごとに追加 DB クエリが発生する（`findByExternalId` が失敗した場合のみ）。パフォーマンスよりも 1メール=1ユーザー の整合性保証を優先した設計判断。

将来的な改善案：
- `user_identities` テーブルを分離し `(external_id, provider)` の複数 ID を持てる構造にする
- これにより `findByExternalId` 単体で合流ユーザーも検索できるようになる
