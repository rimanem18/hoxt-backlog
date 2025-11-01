# TDDテストケースの洗い出し

**【機能名】**: 既存API呼び出しの段階的移行（TASK-1003）
**【タスクID】**: TASK-1003
**【作成日】**: 2025-10-27

---

## 開発言語・フレームワーク

- **プログラミング言語**: TypeScript
  - **言語選択の理由**: 型安全性を最大限に活用し、OpenAPI自動生成型定義との統合を実現
  - **テストに適した機能**: 型推論、ジェネリクス、型ガード
- **テストフレームワーク**: Bun標準テストフレームワーク（`bun:test`）
  - **フレームワーク選択の理由**: プロジェクトの標準テストランナー、高速実行、TypeScript統合
  - **テスト実行環境**: Docker Composeのclientコンテナ内（WORKDIR: `/home/bun/app/client`）
- **テストライブラリ**: `@testing-library/react` + `@tanstack/react-query`
  - **選択理由**: React Queryフックのテストに最適、非同期処理のテストに強い

🟢 **信頼性レベル: 青信号** - プロジェクトのCLAUDE.mdおよび既存テストコードから抽出

---

## テストケースの分類

### 1. 正常系テストケース（基本的な動作）

#### T001: useUserフックが型安全にユーザー情報を取得できる

- **テスト名**: useUserフックが型安全にユーザー情報を取得できる
  - **何をテストするか**: openapi-fetchを使用したuseUserフックが、OpenAPI型定義に基づいて型安全にユーザー情報を取得する動作
  - **期待される動作**: API呼び出しが成功し、User型として正確に型推論されたデータが返却される
- **入力値**:
  - `userId`: `'550e8400-e29b-41d4-a716-446655440000'`（有効なUUID v4）
  - **入力データの意味**: 実際のユーザーIDを代表する標準的なUUID形式
- **期待される結果**:
  - `result.current.isSuccess`: `true`
  - `result.current.data.id`: `'550e8400-e29b-41d4-a716-446655440000'`
  - `result.current.data.email`: `'test@example.com'`
  - `result.current.data.provider`: `'google'`
  - `result.current.isLoading`: `false`
  - `result.current.error`: `null`
  - **期待結果の理由**: OpenAPI型定義に基づき、TypeScriptコンパイラが正しい型推論を行い、ランタイムでも正確なデータが返却される
- **テストの目的**: 型安全なAPIクライアントが正常に動作し、TypeScript型推論が機能することを確認
  - **確認ポイント**:
    - openapi-fetchのGETメソッドがOpenAPI型定義に従って動作する
    - React QueryのuseQueryが正しくキャッシュ管理する
    - TypeScript型推論により、data.idやdata.emailに型安全にアクセスできる

🟢 **信頼性レベル: 青信号** - 既存の`useUser.test.tsx`から抽出

---

#### T002: useUpdateUserフックが型安全にユーザー情報を更新できる

- **テスト名**: useUpdateUserフックが型安全にユーザー情報を更新できる
  - **何をテストするか**: openapi-fetchを使用したuseUpdateUserフックが、OpenAPI型定義に基づいて型安全にユーザー情報を更新する動作
  - **期待される動作**: API呼び出しが成功し、更新後のUser型データが返却され、React Queryキャッシュが無効化される
- **入力値**:
  - `userId`: `'550e8400-e29b-41d4-a716-446655440000'`
  - `updateData`: `{ name: 'Updated Name', avatarUrl: 'https://example.com/avatar.jpg' }`
  - **入力データの意味**: ユーザー名とアバターURLの更新を代表する標準的な更新データ
- **期待される結果**:
  - `result.current.isSuccess`: `true`
  - `result.current.data.name`: `'Updated Name'`
  - `result.current.data.avatarUrl`: `'https://example.com/avatar.jpg'`
  - `queryClient.getQueryState(['users', userId]).isInvalidated`: `true`
  - **期待結果の理由**: PUTリクエストが成功し、更新後のデータが返却され、キャッシュが適切に無効化される
- **テストの目的**: useMutationによる更新処理が型安全に動作し、キャッシュ無効化が正しく機能することを確認
  - **確認ポイント**:
    - openapi-fetchのPUTメソッドがOpenAPI型定義に従って動作する
    - React QueryのuseMutationが正しくキャッシュ無効化する
    - 更新後のデータがTypeScript型推論により型安全にアクセスできる

🟢 **信頼性レベル: 青信号** - 既存の`useUpdateUser.test.tsx`から抽出

---

#### T003: APIクライアントが環境変数から正しく初期化される

- **テスト名**: APIクライアントが環境変数から正しく初期化される
  - **何をテストするか**: createApiClient関数が環境変数NEXT_PUBLIC_API_BASE_URLから正しくベースURLを取得し、APIクライアントを初期化する動作
  - **期待される動作**: APIクライアントが正しいベースURLで初期化され、GET/POST/PUT/DELETEメソッドが利用可能になる
- **入力値**:
  - 環境変数`NEXT_PUBLIC_API_BASE_URL`: `'http://localhost:3001/api'`
  - **入力データの意味**: 開発環境での標準的なAPIベースURL（`/api`サフィックス付き）
- **期待される結果**:
  - `apiClient`: 定義済み
  - `apiClient.GET`: 定義済み
  - `apiClient.POST`: 定義済み
  - `apiClient.PUT`: 定義済み
  - `apiClient.DELETE`: 定義済み
  - **期待結果の理由**: openapi-fetchのcreateClient関数が正しく初期化され、全HTTPメソッドが利用可能になる
- **テストの目的**: APIクライアントの初期化が正常に動作することを確認
  - **確認ポイント**:
    - getApiBaseUrl関数が正しく`/api`サフィックスを付与する
    - createClient関数が正しくpaths型を使用する

🟢 **信頼性レベル: 青信号** - 既存の`api.test.ts`から抽出

---

#### T004: 認証トークンが正しくAPIクライアントに統合される

- **テスト名**: 認証トークンが正しくAPIクライアントに統合される
  - **何をテストするか**: ApiClientContextを使用してAPIクライアントに認証トークンが統合され、リクエストヘッダーにAuthorizationが付与される動作
  - **期待される動作**: APIクライアントが認証トークンを含むヘッダーでリクエストを送信する
- **入力値**:
  - `headers`: `{ Authorization: 'Bearer test-token' }`
  - **入力データの意味**: Supabase Authで発行されたJWTトークンを代表
- **期待される結果**:
  - `mockFetch`が`Authorization: Bearer test-token`ヘッダー付きで呼ばれる
  - **期待結果の理由**: openapi-fetchがcreateClient時に指定されたheadersを正しくリクエストに付与する
- **テストの目的**: 認証トークンの統合が正常に動作することを確認
  - **確認ポイント**:
    - ApiClientProviderが認証トークン付きのクライアントを提供する
    - useApiClientフックがコンテキストから正しいクライアントを取得する

🟡 **信頼性レベル: 黄信号** - 既存テストとアーキテクチャ設計から推測

---

### 2. 異常系テストケース（エラーハンドリング）

#### T005: ユーザーが存在しない場合に適切なエラーを返す

- **テスト名**: ユーザーが存在しない場合に適切なエラーを返す
  - **エラーケースの概要**: 存在しないユーザーIDでGETリクエストを送信した際、404 Not Foundエラーが返却される
  - **エラー処理の重要性**: API契約に従った適切なエラーハンドリングにより、ユーザーに分かりやすいエラーメッセージを提供
- **入力値**:
  - `userId`: `'nonexistent-uuid'`
  - **不正な理由**: データベースに存在しないユーザーID
  - **実際の発生シナリオ**: URLパラメータの手動編集、削除済みユーザーへのアクセス
- **期待される結果**:
  - `result.current.isError`: `true`
  - `result.current.data`: `undefined`
  - `result.current.error.message`: `'ユーザーが見つかりません'`を含む
  - **エラーメッセージの内容**: ユーザーにとって分かりやすい日本語メッセージ
  - **システムの安全性**: React Queryがerror状態に遷移し、UIでエラー表示可能
- **テストの目的**: 404エラーが適切にハンドリングされることを確認
  - **品質保証の観点**: API契約に従ったエラーレスポンスにより、フロントエンドが適切にエラー処理できる

🟢 **信頼性レベル: 青信号** - 既存の`useUser.test.tsx`およびAPI仕様から抽出

---

#### T006: ネットワークエラー時に適切にエラーハンドリングする

- **テスト名**: ネットワークエラー時に適切にエラーハンドリングする
  - **エラーケースの概要**: ネットワーク接続エラーが発生した際、適切にエラーを処理する
  - **エラー処理の重要性**: ネットワーク障害時にアプリケーションがクラッシュせず、ユーザーに適切なフィードバックを提供
- **入力値**:
  - `mockFetch.mockRejectedValue(new Error('Network error'))`
  - **不正な理由**: ネットワーク接続の切断、タイムアウト
  - **実際の発生シナリオ**: Wi-Fi切断、サーバーダウン、タイムアウト
- **期待される結果**:
  - `result.current.isError`: `true`
  - `result.current.data`: `undefined`
  - `result.current.error`: 定義済み
  - **エラーメッセージの内容**: ネットワークエラーを示すメッセージ
  - **システムの安全性**: React Queryがerror状態に遷移し、リトライ戦略に従う
- **テストの目的**: ネットワークエラーが適切にハンドリングされることを確認
  - **品質保証の観点**: ネットワーク障害時にアプリケーションの安定性を維持

🟢 **信頼性レベル: 青信号** - 既存の`useUser.test.tsx`およびAPI仕様から抽出

---

#### T007: バリデーションエラー時に詳細なエラーメッセージを返す

- **テスト名**: バリデーションエラー時に詳細なエラーメッセージを返す
  - **エラーケースの概要**: リクエストボディがZodバリデーションに失敗した際、400 Bad Requestエラーと詳細なエラーメッセージが返却される
  - **エラー処理の重要性**: バリデーションエラーの詳細を提供することで、ユーザーが修正箇所を特定しやすくなる
- **入力値**:
  - `updateData`: `{ name: '', avatarUrl: 'invalid-url' }`（不正なデータ）
  - **不正な理由**: nameが空文字列（最小長1）、avatarUrlが不正なURL形式
  - **実際の発生シナリオ**: フォーム入力の検証漏れ、クライアント側バリデーションの不備
- **期待される結果**:
  - `result.current.isError`: `true`
  - `result.current.error.message`: `'バリデーションエラー'`を含む
  - **エラーメッセージの内容**: どのフィールドが不正かを明示
  - **システムの安全性**: 不正なデータがデータベースに保存されない
- **テストの目的**: バリデーションエラーが適切にハンドリングされることを確認
  - **品質保証の観点**: API契約に従ったバリデーションにより、データ整合性を保証

🟢 **信頼性レベル: 青信号** - 既存の`useUpdateUser.test.tsx`およびAPI仕様から抽出

---

#### T008: 認証トークンが不正な場合に401エラーを返す

- **テスト名**: 認証トークンが不正な場合に401エラーを返す
  - **エラーケースの概要**: 不正なJWTトークンでAPIリクエストを送信した際、401 Unauthorizedエラーが返却される
  - **エラー処理の重要性**: 認証エラーを適切に処理し、ユーザーにログイン画面へのリダイレクトを促す
- **入力値**:
  - `headers`: `{ Authorization: 'Bearer invalid-token' }`
  - **不正な理由**: JWT署名が不正、有効期限切れ
  - **実際の発生シナリオ**: トークンの有効期限切れ、トークンの改ざん
- **期待される結果**:
  - `result.current.isError`: `true`
  - `error.code`: `'UNAUTHORIZED'`
  - `error.message`: `'認証エラー'`を含む
  - **エラーメッセージの内容**: 認証が必要であることを示すメッセージ
  - **システムの安全性**: 不正なトークンでのアクセスを拒否し、セキュリティを確保
- **テストの目的**: 認証エラーが適切にハンドリングされることを確認
  - **品質保証の観点**: JWKS検証によるセキュリティ確保、認証エラー時の適切なユーザー体験

🟡 **信頼性レベル: 黄信号** - API仕様から推測（既存テストには未実装）

---

### 3. 境界値テストケース（最小値、最大値、null等）

#### T009: nullableフィールド（avatarUrl, lastLoginAt）がnullの場合に正しく処理される

- **テスト名**: nullableフィールドがnullの場合に正しく処理される
  - **境界値の意味**: OpenAPI型定義でnullableと定義されたフィールドがnullの場合、TypeScript型推論が正しく動作する
  - **境界値での動作保証**: nullable型が正しく推論され、nullチェックなしでランタイムエラーが発生しない
- **入力値**:
  - `mockUser.avatarUrl`: `null`
  - `mockUser.lastLoginAt`: `null`
  - **境界値選択の根拠**: OpenAPI型定義でnullableと定義されたフィールド
  - **実際の使用場面**: アバターURLが設定されていないユーザー、初回ログインユーザー
- **期待される結果**:
  - `data.data.avatarUrl`: `null`（型安全にnullとして推論される）
  - `data.data.lastLoginAt`: `null`（型安全にnullとして推論される）
  - **境界での正確性**: TypeScriptコンパイラがnullable型として正しく推論する
  - **一貫した動作**: nullフィールドでもランタイムエラーが発生しない
- **テストの目的**: nullable型が正しく推論され、nullチェックが適切に機能することを確認
  - **堅牢性の確認**: nullable型のフィールドでアプリケーションがクラッシュしない

🟢 **信頼性レベル: 青信号** - 既存の`api.test.ts`から抽出

---

#### T010: 空のクエリパラメータ（limit, offset）がデフォルト値で処理される

- **テスト名**: 空のクエリパラメータがデフォルト値で処理される
  - **境界値の意味**: クエリパラメータが省略された場合、OpenAPI型定義のデフォルト値（limit: 20, offset: 0）が適用される
  - **境界値での動作保証**: デフォルト値が正しく適用され、API仕様に準拠したリクエストが送信される
- **入力値**:
  - `query`: `{}` （limitとoffsetを省略）
  - **境界値選択の根拠**: OpenAPI型定義でデフォルト値が定義されている
  - **実際の使用場面**: ページネーション初回アクセス時
- **期待される結果**:
  - APIリクエストに`limit=20&offset=0`が付与される
  - **境界での正確性**: デフォルト値が正しく適用される
  - **一貫した動作**: 省略時と明示的指定時で動作が一貫している
- **テストの目的**: クエリパラメータのデフォルト値が正しく適用されることを確認
  - **堅牢性の確認**: パラメータ省略時にAPIが正常に動作する

🟡 **信頼性レベル: 黄信号** - API仕様から推測（既存テストには未実装）

---

#### T011: UUID形式の境界値テスト（有効な最小・最大UUID）

- **テスト名**: UUID形式の境界値テスト
  - **境界値の意味**: UUID v4形式の最小値（全0）と最大値（全F）が正しく処理される
  - **境界値での動作保証**: UUID形式のバリデーションが正しく機能する
- **入力値**:
  - `userId`: `'00000000-0000-0000-0000-000000000000'`（最小UUID）
  - `userId`: `'ffffffff-ffff-ffff-ffff-ffffffffffff'`（最大UUID）
  - **境界値選択の根拠**: UUID v4形式の数値範囲の境界
  - **実際の使用場面**: 極端なケースでのバリデーション確認
- **期待される結果**:
  - OpenAPI型定義のUUID形式バリデーションが通過する
  - APIリクエストが正常に送信される
  - **境界での正確性**: UUID形式のバリデーションが正しく機能する
  - **一貫した動作**: 最小・最大値でも正常に動作する
- **テストの目的**: UUID形式のバリデーションが境界値でも正しく機能することを確認
  - **堅牢性の確認**: 極端なUUID値でもシステムが安定動作する

🟡 **信頼性レベル: 黄信号** - OpenAPI型定義から推測（既存テストには未実装）

---

## テストケース実装時の日本語コメント指針

以下のテンプレートに従って、各テストケースに日本語コメントを記載してください。

### テストケース開始時のコメント

```typescript
test('useUserフックが型安全にユーザー情報を取得できる', async () => {
  // 【テスト目的】: openapi-fetchを使用したuseUserフックが、OpenAPI型定義に基づいて型安全にユーザー情報を取得する動作を確認
  // 【テスト内容】: モックfetchで成功レスポンスを返し、useUserフックを呼び出して型安全なデータ取得を検証
  // 【期待される動作】: API呼び出しが成功し、User型として正確に型推論されたデータが返却される
  // 🟢 信頼性レベル: 青信号 - 既存のuseUser.test.tsxから抽出
```

### Given（準備フェーズ）のコメント

```typescript
  // 【テストデータ準備】: モックユーザーデータを用意し、成功レスポンスをシミュレート
  // 【初期条件設定】: QueryClientとApiClientProviderを設定し、React Queryフックのテスト環境を構築
  // 【前提条件確認】: mockFetchが正しく初期化され、レスポンスが返却可能な状態
  const mockUser = {
    id: userId,
    externalId: '1234567890',
    provider: 'google' as const,
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: '2025-01-25T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
    lastLoginAt: null,
  };
```

### When（実行フェーズ）のコメント

```typescript
  // 【実際の処理実行】: useUserフックを呼び出し、ユーザーIDでユーザー情報を取得
  // 【処理内容】: openapi-fetchのGETメソッドが内部的に呼ばれ、モックレスポンスが返却される
  // 【実行タイミング】: renderHookにより、React Queryのライフサイクルに従ってフックが実行される
  const { result } = renderHook(() => useUser(userId), { wrapper });
```

### Then（検証フェーズ）のコメント

```typescript
  // 【結果検証】: React QueryのisSuccess状態になることを確認
  // 【期待値確認】: dataがUser型として推論され、各フィールドが正しい値を持つことを確認
  // 【品質保証】: 型安全性が実行時まで保証され、TypeScriptコンパイラの型推論が正しく機能する
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  // 【検証項目】: ユーザーIDが正しく返却される
  // 🟢 信頼性レベル: 青信号
  expect(result.current.data?.id).toBe(userId);

  // 【検証項目】: メールアドレスが型安全にアクセス可能
  // 🟢 信頼性レベル: 青信号
  expect(result.current.data?.email).toBe('test@example.com');
});
```

### セットアップ・クリーンアップのコメント

```typescript
beforeEach(() => {
  // 【テスト前準備】: 各テスト実行前にモックfetchとQueryClientを初期化
  // 【環境初期化】: テスト間でキャッシュや状態が共有されないよう、クリーンな環境を構築
  mockFetch = mock();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // テスト時はリトライしない
      },
    },
  });
});

afterEach(() => {
  // 【テスト後処理】: 各テスト実行後にQueryClientをクリアし、モックを復元
  // 【状態復元】: 次のテストに影響しないよう、キャッシュとモックをリセット
  queryClient.clear();
  mock.restore();
  mock.clearAllMocks();
});
```

---

## 品質判定

✅ **高品質**:
- ✅ テストケース分類: 正常系（4件）・異常系（4件）・境界値（3件）が網羅されている
- ✅ 期待値定義: 各テストケースの期待値が明確（型推論、エラーメッセージ、キャッシュ無効化等）
- ✅ 技術選択: TypeScript + Bun標準テストフレームワーク + @testing-library/reactが確定
- ✅ 実装可能性: 既存テストコード（`api.test.ts`, `useUser.test.tsx`, `useUpdateUser.test.tsx`）が実装済み

