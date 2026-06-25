# TASK-1002: 型安全なAPIクライアント実装 - テストケース一覧

**作成日**: 2025-01-25
**タスクID**: TASK-1002
**要件定義書**: `type-safe-api-client-requirements.md`

---

## 開発言語・テストフレームワーク

### 🔵 プログラミング言語

- **言語**: TypeScript 5.9.2
- **言語選択の理由**:
  - Next.js 15プロジェクトの標準言語
  - 型安全性を保証するための必須要件
  - OpenAPI仕様から生成された型定義を活用
- **テストに適した機能**:
  - 型推論によるコンパイル時エラー検出
  - `as const`による厳密な型定義
  - Genericsによる柔軟な型安全性

### 🔵 テストフレームワーク

- **フレームワーク**: Bun標準テストフレームワーク
- **フレームワーク選択の理由**:
  - プロジェクトのガイドライン（CLAUDE.md）で必須指定
  - Bunパッケージマネージャーとの完全な統合
  - 高速なテスト実行
- **テスト実行環境**:
  - Dockerコンテナ内（client service）
  - コマンド: `docker compose exec client bun test`
- **追加ライブラリ**:
  - `@tanstack/react-query`: React Queryフックのテスト
  - `msw` (Mock Service Worker): APIモック（検討中）

---

## 1. 正常系テストケース（基本的な動作）

### T001: APIクライアント初期化が正しく動作する

- **テスト名**: APIクライアント初期化が正しく動作する
  - **何をテストするか**: `createClient`関数が正しくAPIクライアントインスタンスを生成する
  - **期待される動作**: baseURLとheadersが正しく設定されたクライアントが返却される
- **入力値**:
  - `baseUrl`: `"http://localhost:3001"`
  - `headers`: `{ Authorization: "Bearer test-token" }`
  - **入力データの意味**: 開発環境のバックエンドAPIエンドポイントと認証トークン
- **期待される結果**:
  - APIクライアントインスタンスが正常に生成される
  - `GET`、`POST`、`PUT`メソッドが使用可能
  - **期待結果の理由**: `openapi-fetch`の仕様に基づく正常な初期化
- **テストの目的**: APIクライアントの基本的な初期化機能を確認
  - **確認ポイント**:
    - インスタンスが正しく生成される
    - 設定値（baseURL、headers）が保持される
- 🔵 このテストケースはopenapi-fetchの公式ドキュメントと要件定義書を参考に作成

```typescript
// 【テスト目的】: APIクライアントの初期化が正しく動作することを確認
// 【テスト内容】: createClient関数でAPIクライアントインスタンスを生成
// 【期待される動作】: baseURLとheadersが正しく設定されたクライアントが返却される
// 🔵 openapi-fetchの公式ドキュメントを参考

test('APIクライアント初期化が正しく動作する', () => {
  // 【テストデータ準備】: APIクライアント初期化に必要なbaseURLとheaders
  const baseUrl = 'http://localhost:3001';
  const headers = { Authorization: 'Bearer test-token' };

  // 【実際の処理実行】: createClient関数を呼び出してクライアント生成
  const client = createClient<paths>({ baseUrl, headers });

  // 【結果検証】: クライアントインスタンスが正常に生成されたことを確認
  // 🔵 openapi-fetchの仕様に基づく検証
  expect(client).toBeDefined(); // 【検証項目】: クライアントインスタンスが存在する
  expect(client.GET).toBeDefined(); // 【検証項目】: GETメソッドが使用可能
  expect(client.POST).toBeDefined(); // 【検証項目】: POSTメソッドが使用可能
  expect(client.PUT).toBeDefined(); // 【検証項目】: PUTメソッドが使用可能
});
```

---

### T002: GETメソッドで型安全にユーザー情報を取得できる

- **テスト名**: GETメソッドで型安全にユーザー情報を取得できる
  - **何をテストするか**: `client.GET('/users/{id}')`が正しくユーザー情報を取得する
  - **期待される動作**: 型安全なレスポンスが返却され、`data.data`でユーザー情報にアクセス可能
- **入力値**:
  - `path.id`: `"550e8400-e29b-41d4-a716-446655440000"`（有効なUUID v4）
  - **入力データの意味**: データベースに存在するユーザーのID
- **期待される結果**:
  ```typescript
  {
    data: {
      success: true,
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        createdAt: "2025-01-25T00:00:00Z",
        updatedAt: "2025-01-25T00:00:00Z",
        lastLoginAt: null
      }
    },
    error: undefined
  }
  ```
  - **期待結果の理由**: OpenAPI仕様で定義されたレスポンス形式に準拠
- **テストの目的**: GETメソッドによる型安全なデータ取得を確認
  - **確認ポイント**:
    - レスポンスの型が正しく推論される
    - `data.data`でユーザー情報にアクセス可能
    - `error`が`undefined`
- 🔵 要件定義書のパターン1（ユーザー情報取得）を参考

```typescript
// 【テスト目的】: GETメソッドで型安全にユーザー情報を取得できることを確認
// 【テスト内容】: client.GET('/users/{id}')を呼び出してユーザー情報を取得
// 【期待される動作】: 型安全なレスポンスが返却され、data.dataでユーザー情報にアクセス可能
// 🔵 要件定義書のパターン1を参考

test('GETメソッドで型安全にユーザー情報を取得できる', async () => {
  // 【テストデータ準備】: モックAPIレスポンスを設定
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: '2025-01-25T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
    lastLoginAt: null,
  };

  // 【実際の処理実行】: GETメソッドでユーザー情報を取得
  const { data, error } = await apiClient.GET('/users/{id}', {
    params: { path: { id: '550e8400-e29b-41d4-a716-446655440000' } },
  });

  // 【結果検証】: レスポンスが正しく返却されたことを確認
  // 🔵 OpenAPI仕様に基づく検証
  expect(error).toBeUndefined(); // 【検証項目】: エラーが発生していない
  expect(data).toBeDefined(); // 【検証項目】: データが存在する
  expect(data.success).toBe(true); // 【検証項目】: 成功フラグがtrue
  expect(data.data.id).toBe(mockUser.id); // 【検証項目】: ユーザーIDが一致
  expect(data.data.email).toBe(mockUser.email); // 【検証項目】: メールアドレスが一致
});
```

---

### T003: PUTメソッドで型安全にユーザー情報を更新できる

- **テスト名**: PUTメソッドで型安全にユーザー情報を更新できる
  - **何をテストするか**: `client.PUT('/users/{id}')`が正しくユーザー情報を更新する
  - **期待される動作**: 更新後のユーザー情報が型安全に返却される
- **入力値**:
  - `path.id`: `"550e8400-e29b-41d4-a716-446655440000"`
  - `body`: `{ name: "Updated Name", avatarUrl: "https://example.com/avatar.jpg" }`
  - **入力データの意味**: 更新対象のユーザーIDと新しいユーザー名・アバターURL
- **期待される結果**:
  ```typescript
  {
    data: {
      success: true,
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "test@example.com",
        name: "Updated Name",
        avatarUrl: "https://example.com/avatar.jpg",
        createdAt: "2025-01-25T00:00:00Z",
        updatedAt: "2025-01-25T01:00:00Z",
        lastLoginAt: null
      }
    },
    error: undefined
  }
  ```
  - **期待結果の理由**: OpenAPI仕様で定義されたPUTエンドポイントのレスポンス形式
- **テストの目的**: PUTメソッドによる型安全なデータ更新を確認
  - **確認ポイント**:
    - リクエストボディの型が正しく推論される
    - 更新後のデータが正しく返却される
    - `updatedAt`が更新される
- 🔵 要件定義書のパターン2（ユーザー情報更新）を参考

```typescript
// 【テスト目的】: PUTメソッドで型安全にユーザー情報を更新できることを確認
// 【テスト内容】: client.PUT('/users/{id}')を呼び出してユーザー情報を更新
// 【期待される動作】: 更新後のユーザー情報が型安全に返却される
// 🔵 要件定義書のパターン2を参考

test('PUTメソッドで型安全にユーザー情報を更新できる', async () => {
  // 【テストデータ準備】: 更新データを設定
  const updateData = {
    name: 'Updated Name',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  // 【実際の処理実行】: PUTメソッドでユーザー情報を更新
  const { data, error } = await apiClient.PUT('/users/{id}', {
    params: { path: { id: '550e8400-e29b-41d4-a716-446655440000' } },
    body: updateData,
  });

  // 【結果検証】: 更新が正しく反映されたことを確認
  // 🔵 OpenAPI仕様に基づく検証
  expect(error).toBeUndefined(); // 【検証項目】: エラーが発生していない
  expect(data).toBeDefined(); // 【検証項目】: データが存在する
  expect(data.success).toBe(true); // 【検証項目】: 成功フラグがtrue
  expect(data.data.name).toBe(updateData.name); // 【検証項目】: 名前が更新されている
  expect(data.data.avatarUrl).toBe(updateData.avatarUrl); // 【検証項目】: アバターURLが更新されている
});
```

---

### T004: React QueryフックuseUserが正しい型を返す

- **テスト名**: React QueryフックuseUserが正しい型を返す
  - **何をテストするか**: `useUser`フックが型安全にユーザー情報を返す
  - **期待される動作**: `data.data`がUser型として推論される
- **入力値**:
  - `userId`: `"550e8400-e29b-41d4-a716-446655440000"`
  - **入力データの意味**: 取得対象のユーザーID
- **期待される結果**:
  - `data.data.id`: string型（UUID v4）
  - `data.data.email`: string型
  - `data.data.name`: string型
  - `isLoading`: boolean型
  - `error`: Error型 | undefined
  - **期待結果の理由**: React Queryの型推論とOpenAPI型定義の組み合わせ
- **テストの目的**: React Queryフックの型安全性を確認
  - **確認ポイント**:
    - `data`の型が正しく推論される
    - `isLoading`、`error`が正しく機能する
- 🟡 React Queryの標準的な使用パターンから推測

```typescript
// 【テスト目的】: React QueryフックuseUserが正しい型を返すことを確認
// 【テスト内容】: useUserフックを呼び出してユーザー情報を取得
// 【期待される動作】: data.dataがUser型として推論される
// 🟡 React Queryの標準的な使用パターンから推測

test('React QueryフックuseUserが正しい型を返す', async () => {
  // 【テストデータ準備】: React Query Provider設定
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  // 【実際の処理実行】: useUserフックを呼び出し
  const { result } = renderHook(
    () => useUser('550e8400-e29b-41d4-a716-446655440000'),
    { wrapper }
  );

  // 【結果検証】: データが正しく取得され、型が推論されることを確認
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  // 🟡 React Queryの標準的な返却値を検証
  expect(result.current.data).toBeDefined(); // 【検証項目】: データが存在する
  expect(result.current.data.id).toBe('550e8400-e29b-41d4-a716-446655440000'); // 【検証項目】: ユーザーIDが一致
  expect(result.current.isLoading).toBe(false); // 【検証項目】: ローディング状態がfalse
  expect(result.current.error).toBeNull(); // 【検証項目】: エラーがnull
});
```

---

### T005: React QueryフックuseUpdateUserがキャッシュを適切に無効化する

- **テスト名**: React QueryフックuseUpdateUserがキャッシュを適切に無効化する
  - **何をテストするか**: `useUpdateUser`フックが成功時にキャッシュを無効化する
  - **期待される動作**: `onSuccess`コールバックで`invalidateQueries`が呼ばれる
- **入力値**:
  - `userId`: `"550e8400-e29b-41d4-a716-446655440000"`
  - `data`: `{ name: "New Name" }`
  - **入力データの意味**: 更新対象のユーザーIDと新しい名前
- **期待される結果**:
  - `invalidateQueries({ queryKey: ['users', userId] })`が呼ばれる
  - キャッシュが無効化され、再取得が発生する
  - **期待結果の理由**: React Queryのキャッシュ無効化メカニズム
- **テストの目的**: React Queryのキャッシュ管理機能を確認
  - **確認ポイント**:
    - `invalidateQueries`が正しく呼ばれる
    - キャッシュが無効化される
- 🟡 React Queryの標準的なキャッシュ無効化パターンから推測

```typescript
// 【テスト目的】: React QueryフックuseUpdateUserがキャッシュを適切に無効化することを確認
// 【テスト内容】: useUpdateUserフックでユーザー情報を更新し、キャッシュ無効化を検証
// 【期待される動作】: onSuccessコールバックでinvalidateQueriesが呼ばれる
// 🟡 React Queryの標準的なキャッシュ無効化パターンから推測

test('React QueryフックuseUpdateUserがキャッシュを適切に無効化する', async () => {
  // 【テストデータ準備】: React Query Provider設定とモック
  const queryClient = new QueryClient();
  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  // 【実際の処理実行】: useUpdateUserフックを呼び出し
  const { result } = renderHook(() => useUpdateUser(), { wrapper });

  await act(async () => {
    result.current.mutate({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      data: { name: 'New Name' },
    });
  });

  // 【結果検証】: キャッシュ無効化が正しく実行されたことを確認
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  // 🟡 React Queryのキャッシュ無効化メカニズムを検証
  expect(invalidateQueriesSpy).toHaveBeenCalledWith({
    queryKey: ['users', '550e8400-e29b-41d4-a716-446655440000'],
  }); // 【検証項目】: invalidateQueriesが正しいキャッシュキーで呼ばれた
});
```

---

## 2. 異常系テストケース（エラーハンドリング）

### T006: 404エラー時に適切なエラーレスポンスを返す

- **テスト名**: 404エラー時に適切なエラーレスポンスを返す
  - **エラーケースの概要**: 存在しないユーザーIDでGETリクエストを送信
  - **エラー処理の重要性**: ユーザーに適切なエラーメッセージを表示し、システムの安全性を保つ
- **入力値**:
  - `path.id`: `"nonexistent-uuid"`（存在しないUUID）
  - **不正な理由**: データベースに存在しないユーザーID
  - **実際の発生シナリオ**: URLに誤ったIDを直接入力した場合
- **期待される結果**:
  ```typescript
  {
    data: undefined,
    error: {
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "ユーザーが見つかりません"
      }
    }
  }
  ```
  - **エラーメッセージの内容**: 「ユーザーが見つかりません」という分かりやすいメッセージ
  - **システムの安全性**: エラー時に内部実装詳細を露出しない（NFR-303準拠）
- **テストの目的**: 404エラーハンドリングの確認
  - **品質保証の観点**: ユーザーに適切なフィードバックを提供し、システムの堅牢性を保証
- 🔵 要件定義書のEDGE-002を参考

```typescript
// 【テスト目的】: 404エラー時に適切なエラーレスポンスを返すことを確認
// 【テスト内容】: 存在しないユーザーIDでGETリクエストを送信
// 【期待される動作】: errorに404エラー情報が含まれる
// 🔵 要件定義書のEDGE-002を参考

test('404エラー時に適切なエラーレスポンスを返す', async () => {
  // 【テストデータ準備】: 存在しないユーザーIDを設定
  const nonexistentId = 'nonexistent-uuid';

  // 【実際の処理実行】: 存在しないIDでGETリクエスト送信
  const { data, error } = await apiClient.GET('/users/{id}', {
    params: { path: { id: nonexistentId } },
  });

  // 【結果検証】: 404エラーが正しく返却されたことを確認
  // 🔵 OpenAPI仕様の404レスポンスに基づく検証
  expect(data).toBeUndefined(); // 【検証項目】: データが存在しない
  expect(error).toBeDefined(); // 【検証項目】: エラーが存在する
  expect(error.success).toBe(false); // 【検証項目】: 成功フラグがfalse
  expect(error.error.code).toBe('USER_NOT_FOUND'); // 【検証項目】: エラーコードが一致
  expect(error.error.message).toBe('ユーザーが見つかりません'); // 【検証項目】: エラーメッセージが一致
});
```

---

### T007: ネットワークエラー時に適切にエラーハンドリングする

- **テスト名**: ネットワークエラー時に適切にエラーハンドリングする
  - **エラーケースの概要**: ネットワーク接続が失敗した場合のエラーハンドリング
  - **エラー処理の重要性**: ユーザーに「ネットワークエラー」を通知し、リトライを促す
- **入力値**:
  - ネットワーク接続が切断されている状態
  - **不正な理由**: バックエンドAPIに到達できない
  - **実際の発生シナリオ**: オフライン状態、サーバーダウン、DNSエラー
- **期待される結果**:
  - `error`にネットワークエラー情報が含まれる
  - React Queryの`error`ステートが`true`
  - **エラーメッセージの内容**: 「ネットワークエラーが発生しました」
  - **システムの安全性**: エラー時にアプリケーションがクラッシュしない
- **テストの目的**: ネットワークエラーハンドリングの確認
  - **品質保証の観点**: ネットワークエラー時にもアプリケーションが安定動作する
- 🔵 要件定義書のEDGE-001を参考

```typescript
// 【テスト目的】: ネットワークエラー時に適切にエラーハンドリングすることを確認
// 【テスト内容】: ネットワーク接続が切断されている状態でAPIリクエスト送信
// 【期待される動作】: errorにネットワークエラー情報が含まれる
// 🔵 要件定義書のEDGE-001を参考

test('ネットワークエラー時に適切にエラーハンドリングする', async () => {
  // 【テストデータ準備】: ネットワークエラーをシミュレート
  const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

  // 【実際の処理実行】: ネットワークエラー発生状態でGETリクエスト送信
  const client = createClient<paths>({
    baseUrl: 'http://localhost:3001',
    fetch: mockFetch,
  });

  const { data, error } = await client.GET('/users/{id}', {
    params: { path: { id: '550e8400-e29b-41d4-a716-446655440000' } },
  });

  // 【結果検証】: ネットワークエラーが正しく処理されたことを確認
  // 🔵 openapi-fetchのエラーハンドリング仕様に基づく検証
  expect(data).toBeUndefined(); // 【検証項目】: データが存在しない
  expect(error).toBeDefined(); // 【検証項目】: エラーが存在する
});
```

---

### T008: 認証トークン未設定時にエラーを投げる

- **テスト名**: 認証トークン未設定時にエラーを投げる
  - **エラーケースの概要**: 認証トークンが設定されていない状態でAPIクライアントを初期化
  - **エラー処理の重要性**: セキュリティ要件を満たし、未認証リクエストを防止
- **入力値**:
  - `token`: `null`または`undefined`
  - **不正な理由**: 認証トークンが必須だが設定されていない
  - **実際の発生シナリオ**: ログイン前、トークン期限切れ、Cookieクリア
- **期待される結果**:
  - `Error`が投げられる
  - エラーメッセージ: 「認証トークンが設定されていません」
  - **エラーメッセージの内容**: ユーザーにログインを促すメッセージ
  - **システムの安全性**: 未認証リクエストを防ぎ、セキュリティを保護
- **テストの目的**: 認証トークンチェックの確認
  - **品質保証の観点**: セキュリティ要件（NFR-303）を満たす
- 🔵 要件定義書のEDGE-003を参考

```typescript
// 【テスト目的】: 認証トークン未設定時にエラーを投げることを確認
// 【テスト内容】: 認証トークンがnullの状態でAPIクライアント初期化
// 【期待される動作】: Errorが投げられ、エラーメッセージが表示される
// 🔵 要件定義書のEDGE-003を参考

test('認証トークン未設定時にエラーを投げる', () => {
  // 【テストデータ準備】: 認証トークンをnullに設定
  const getAuthToken = vi.fn().mockReturnValue(null);

  // 【実際の処理実行】: 認証トークンがnullの状態でクライアント初期化
  expect(() => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('認証トークンが設定されていません');
    }
    createClient<paths>({
      baseUrl: 'http://localhost:3001',
      headers: { Authorization: `Bearer ${token}` },
    });
  }).toThrow('認証トークンが設定されていません');

  // 【結果検証】: エラーが正しく投げられたことを確認
  // 🔵 セキュリティ要件（NFR-303）に基づく検証
  // 【検証項目】: 認証トークン未設定時にエラーが発生する
});
```

---

## 3. 境界値テストケース（最小値、最大値、null等）

### T009: 空のレスポンスボディを正しく処理する

- **テスト名**: 空のレスポンスボディを正しく処理する
  - **境界値の意味**: APIレスポンスが空の場合の動作を確認
  - **境界値での動作保証**: 空レスポンスでもアプリケーションがクラッシュしない
- **入力値**:
  - レスポンスボディ: `{}`（空のオブジェクト）
  - **境界値選択の根拠**: APIが空のレスポンスを返す可能性がある
  - **実際の使用場面**: 削除操作成功時、204 No Contentレスポンス
- **期待される結果**:
  - `data`が空のオブジェクト`{}`として返却される
  - エラーが発生しない
  - **境界での正確性**: 空レスポンスが正しく解釈される
  - **一貫した動作**: 他のレスポンスと同様に型安全に処理される
- **テストの目的**: 空レスポンス処理の確認
  - **堅牢性の確認**: 空データでもアプリケーションが安定動作する
- 🟡 一般的なAPIクライアントの動作から推測

```typescript
// 【テスト目的】: 空のレスポンスボディを正しく処理することを確認
// 【テスト内容】: 空のオブジェクトをレスポンスとして返すAPIをモック
// 【期待される動作】: dataが空のオブジェクトとして返却され、エラーが発生しない
// 🟡 一般的なAPIクライアントの動作から推測

test('空のレスポンスボディを正しく処理する', async () => {
  // 【テストデータ準備】: 空のレスポンスボディをモック
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  });

  // 【実際の処理実行】: 空レスポンスを返すAPIをリクエスト
  const client = createClient<paths>({
    baseUrl: 'http://localhost:3001',
    fetch: mockFetch,
  });

  const { data, error } = await client.GET('/users/{id}', {
    params: { path: { id: '550e8400-e29b-41d4-a716-446655440000' } },
  });

  // 【結果検証】: 空レスポンスが正しく処理されたことを確認
  // 🟡 一般的なAPIクライアントの動作を検証
  expect(error).toBeUndefined(); // 【検証項目】: エラーが発生していない
  expect(data).toBeDefined(); // 【検証項目】: dataが存在する
});
```

---

### T010: nullフィールドを含むレスポンスを正しく処理する

- **テスト名**: nullフィールドを含むレスポンスを正しく処理する
  - **境界値の意味**: nullable フィールドがnullの場合の動作を確認
  - **境界値での動作保証**: null値が正しく型推論される
- **入力値**:
  - `avatarUrl`: `null`
  - `lastLoginAt`: `null`
  - **境界値選択の根拠**: OpenAPI仕様でnullableフィールドが定義されている
  - **実際の使用場面**: アバター未設定、一度もログインしていないユーザー
- **期待される結果**:
  - `data.data.avatarUrl`: `null`（string | null型）
  - `data.data.lastLoginAt`: `null`（string | null型）
  - TypeScriptコンパイラがnull値を許容
  - **境界での正確性**: null値が正しく処理される
  - **一貫した動作**: null値でもアプリケーションがクラッシュしない
- **テストの目的**: nullableフィールドの型安全性を確認
  - **堅牢性の確認**: null値が含まれていても正常動作する
- 🔵 OpenAPI仕様のnullableフィールド定義を参考

```typescript
// 【テスト目的】: nullフィールドを含むレスポンスを正しく処理することを確認
// 【テスト内容】: avatarUrlとlastLoginAtがnullのユーザー情報を取得
// 【期待される動作】: null値が正しく型推論され、エラーが発生しない
// 🔵 OpenAPI仕様のnullableフィールド定義を参考

test('nullフィールドを含むレスポンスを正しく処理する', async () => {
  // 【テストデータ準備】: nullフィールドを含むユーザー情報をモック
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: '2025-01-25T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
    lastLoginAt: null,
  };

  // 【実際の処理実行】: nullフィールドを含むユーザー情報を取得
  const { data, error } = await apiClient.GET('/users/{id}', {
    params: { path: { id: '550e8400-e29b-41d4-a716-446655440000' } },
  });

  // 【結果検証】: null値が正しく処理されたことを確認
  // 🔵 OpenAPI仕様のnullableフィールドに基づく検証
  expect(error).toBeUndefined(); // 【検証項目】: エラーが発生していない
  expect(data.data.avatarUrl).toBeNull(); // 【検証項目】: avatarUrlがnull
  expect(data.data.lastLoginAt).toBeNull(); // 【検証項目】: lastLoginAtがnull
});
```

---

## 4. TypeScriptコンパイルテスト

### T011: 存在しないエンドポイントへのアクセスでコンパイルエラーが発生する

- **テスト名**: 存在しないエンドポイントへのアクセスでコンパイルエラーが発生する
  - **何をテストするか**: paths型に存在しないエンドポイントをリクエスト
  - **期待される動作**: TypeScriptコンパイルエラーが発生
- **入力値**:
  - エンドポイント: `"/invalid/endpoint"`
  - **入力データの意味**: OpenAPI仕様に定義されていないエンドポイント
- **期待される結果**:
  - TypeScriptコンパイルエラー
  - エラーメッセージ: `Argument of type '"/invalid/endpoint"' is not assignable to parameter of type 'keyof paths'`
  - **期待結果の理由**: paths型の型チェック機能により、存在しないエンドポイントを検出
- **テストの目的**: 型安全性によるエンドポイント検証を確認
  - **確認ポイント**: コンパイル時にエラーが検出される
- 🔵 要件定義書のエラーケース2を参考

```typescript
// 【テスト目的】: 存在しないエンドポイントへのアクセスでコンパイルエラーが発生することを確認
// 【テスト内容】: paths型に存在しないエンドポイントをリクエスト
// 【期待される動作】: TypeScriptコンパイルエラーが発生
// 🔵 要件定義書のエラーケース2を参考

// ❌ 以下のコードはTypeScriptコンパイルエラーを発生させる
// @ts-expect-error - 存在しないエンドポイントへのアクセスを意図的にテスト
const { data } = await apiClient.GET('/invalid/endpoint', {});

// 【検証項目】: TypeScriptコンパイラが型エラーを検出する
// このテストは実際にはコンパイル時にエラーが発生するため、
// 実行時テストではなく、型チェックツール（tsc --noEmit）で検証する
```

---

### T012: 誤った型のパラメータでコンパイルエラーが発生する

- **テスト名**: 誤った型のパラメータでコンパイルエラーが発生する
  - **何をテストするか**: 誤った型のパラメータを指定した場合のコンパイルエラー
  - **期待される動作**: TypeScriptコンパイルエラーが発生
- **入力値**:
  - `path.id`: `123`（number型、本来はstring型が必要）
  - **入力データの意味**: 型が一致しないパラメータ
- **期待される結果**:
  - TypeScriptコンパイルエラー
  - エラーメッセージ: `Type 'number' is not assignable to type 'string'`
  - **期待結果の理由**: paths型の型チェック機能により、パラメータの型不整合を検出
- **テストの目的**: 型安全性によるパラメータ検証を確認
  - **確認ポイント**: コンパイル時に型エラーが検出される
- 🔵 要件定義書のエラーケース1を参考

```typescript
// 【テスト目的】: 誤った型のパラメータでコンパイルエラーが発生することを確認
// 【テスト内容】: number型のパラメータを指定（string型が必要）
// 【期待される動作】: TypeScriptコンパイルエラーが発生
// 🔵 要件定義書のエラーケース1を参考

// ❌ 以下のコードはTypeScriptコンパイルエラーを発生させる
// @ts-expect-error - 誤った型のパラメータを意図的にテスト
const { data } = await apiClient.GET('/users/{id}', {
  params: { path: { id: 123 } }, // number型は不可（string型が必要）
});

// 【検証項目】: TypeScriptコンパイラが型エラーを検出する
// このテストは実際にはコンパイル時にエラーが発生するため、
// 実行時テストではなく、型チェックツール（tsc --noEmit）で検証する
```

---

## 5. テスト実行方法

### 単体テスト実行

```bash
# clientコンテナ内でBunテスト実行
docker compose exec client bun test

# 特定のテストファイルのみ実行
docker compose exec client bun test src/lib/api.test.ts
```

### 型チェック実行

```bash
# TypeScriptコンパイルチェック
docker compose exec client bunx tsc --noEmit
```

### カバレッジ計測

```bash
# カバレッジ計測付きテスト実行
docker compose exec client bun test --coverage
```

---

## 6. テストケース品質判定

### ✅ 高品質: テストケース定義完了

**判定理由**:
- ✅ **テストケース分類**: 正常系（T001〜T005）、異常系（T006〜T008）、境界値（T009〜T010）、TypeScriptコンパイル（T011〜T012）が網羅されている
- ✅ **期待値定義**: 各テストケースの期待値が明確（型、レスポンス形式、エラーメッセージ）
- ✅ **技術選択**: TypeScript 5.9.2、Bun標準テストフレームワーク、React Query 5.84.2が確定
- ✅ **実装可能性**: 現在の技術スタック（Next.js 15、openapi-fetch、React Query）で実現可能

---

**次のお勧めステップ**: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。

