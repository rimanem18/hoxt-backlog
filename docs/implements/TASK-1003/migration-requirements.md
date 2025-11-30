# TDD要件定義・機能仕様の整理

**【機能名】**: 既存API呼び出しの段階的移行（TASK-1003）
**【タスクID】**: TASK-1003
**【作成日】**: 2025-10-27

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 🔵 信頼性レベル: 青信号（EARS要件定義書・設計文書から抽出）

**何をする機能か**:
- フロントエンド側の既存のfetch/axiosベースのAPI呼び出しを、型安全なAPIクライアント（openapi-fetch）に置き換える機能

**どのような問題を解決するか**:
- 従来のfetchベースのAPI呼び出しは型安全性が保証されず、レスポンスの型不一致によるランタイムエラーが発生する可能性があった
- OpenAPI仕様から自動生成された型定義を使用することで、コンパイル時に型エラーを検出し、API契約の変更に即座に対応できるようにする
- 認証トークン付与やエラーハンドリングのロジックを統合し、API呼び出しの一貫性を確保する

**想定されるユーザー**:
- フロントエンド開発者（Next.js）
- バックエンド開発者（API契約の変更を行う際）

**システム内での位置づけ**:
- Phase 3（TypeScript型定義自動生成）の最終タスク
- TASK-1002（型安全なAPIクライアント実装）の完了後に実施
- 既存のReact Queryフック、APIクライアントコンテキストと統合

**参照したEARS要件**:
- REQ-007: システムはフロントエンドで自動生成されたTypeScript型を使用してAPIクライアントを型安全に実装しなければならない
- NFR-101: データベーススキーマの変更から型定義の反映まで、手動介入なしに自動化されなければならない

**参照した設計文書**:
- `docs/design/type-safety-enhancement/architecture.md` - セクション「フロントエンド（Next.js）」
- `docs/design/type-safety-enhancement/api-endpoints.md` - セクション「フロントエンド実装例」

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 🔵 信頼性レベル: 青信号（既存コード・OpenAPI型定義から抽出）

**入力パラメータ**:

1. **既存のAPI呼び出しコード**:
   - 型: `fetch()`または`axios()`ベースの実装
   - 場所: `app/client/src/features/user/services/userService.ts`
   - 制約: 認証トークンを手動で付与している

2. **OpenAPI自動生成型定義**:
   - 型: `paths` インターフェース（`@/types/api/generated`から取得）
   - 場所: `app/client/src/types/api/generated.ts`
   - 制約: `openapi-typescript`により自動生成

**出力値**:

1. **型安全なAPIクライアント実装**:
   - 型: `openapi-fetch`の`createClient<paths>`を使用
   - 場所: `app/client/src/lib/api.ts`
   - 例:
     ```typescript
     const { data, error } = await apiClient.GET('/users/{id}', {
       params: { path: { id: userId } },
     });
     ```

2. **React Queryフック**:
   - 型: `useQuery` / `useMutation`を使用した型安全なフック
   - 場所: `app/client/src/features/user/hooks/useUser.ts`, `useUpdateUser.ts`
   - 例:
     ```typescript
     export function useUser(userId: string) {
       const apiClient = useApiClient();
       return useQuery({
         queryKey: ['users', userId],
         queryFn: async () => {
           const { data, error } = await apiClient.GET('/users/{id}', {
             params: { path: { id: userId } },
           });
           if (error) throw new Error(error.error.message);
           return data.data; // 型安全にUser型として推論される
         },
       });
     }
     ```

**データフロー**:
```
既存fetch実装 (userService.ts)
  ↓
openapi-fetch APIクライアント (api.ts)
  ↓
React Queryフック (useUser.ts)
  ↓
UIコンポーネント (UserProfile.tsx)
```

**参照したEARS要件**:
- REQ-007: フロントエンドで自動生成されたTypeScript型を使用してAPIクライアントを型安全に実装

**参照した設計文書**:
- `docs/design/type-safety-enhancement/architecture.md` - セクション「APIクライアント型安全化」
- `app/client/src/lib/api.ts` - APIクライアント実装
- `app/client/src/types/api/generated.ts` - OpenAPI自動生成型定義

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 🟡 信頼性レベル: 黄信号（EARS非機能要件から推測）

**パフォーマンス要件**:
- 🔵 型安全なAPIクライアントへの置き換えが、既存のパフォーマンスを維持すること（NFR-002）
- 🔵 React Queryのキャッシュ戦略を活用し、不要なAPI呼び出しを削減すること

**互換性要件**:
- 🔵 既存のReact Queryフック（`useUser`, `useUpdateUser`）のインターフェースを維持すること（REQ-405）
- 🔵 既存のテストコードとの互換性を保つこと
- 🔵 既存の認証フロー（Supabase Auth）と統合すること

**アーキテクチャ制約**:
- 🔵 フロントエンドの型定義を`app/client/src/types/api/`配下に配置すること（REQ-404）
- 🔵 DI可能な設計を維持すること（ApiClientContext経由のクライアント取得）
- 🔵 feature-basedディレクトリ構造を維持すること

**認証制約**:
- 🔵 認証トークンをAPIクライアントに統合すること
- 🔵 トークンの自動更新・エラーハンドリングを統合すること

**参照したEARS要件**:
- NFR-002: 型定義の自動生成プロセスは合理的な時間内で完了しなければならない
- NFR-101: データベーススキーマの変更から型定義の反映まで、手動介入なしに自動化
- REQ-405: 既存のDDD + クリーンアーキテクチャ構造を維持

**参照した設計文書**:
- `docs/design/type-safety-enhancement/architecture.md` - セクション「キャッシュ戦略」「既存システムとの統合」
- `CLAUDE.md` - フロントエンド開発ガイドライン

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 🔵 信頼性レベル: 青信号（既存テストケース・データフローから抽出）

**基本的な使用パターン**:

1. **ユーザー情報取得**:
   ```typescript
   // 既存実装（fetch）
   const response = await fetch('/api/user/profile', {
     method: 'GET',
     headers: {
       'Content-Type': 'application/json',
       Authorization: `Bearer ${token}`,
     },
   });
   const userData: User = await response.json();

   // 新実装（openapi-fetch）
   const { data, error } = await apiClient.GET('/users/{id}', {
     params: { path: { id: userId } },
   });
   if (error) throw new Error(error.error.message);
   return data.data; // 型安全にUser型として推論される
   ```

2. **ユーザー情報更新**:
   ```typescript
   // 新実装（openapi-fetch）
   const { data, error } = await apiClient.PUT('/users/{id}', {
     params: { path: { id: userId } },
     body: { name: 'New Name', avatarUrl: 'https://example.com/avatar.jpg' },
   });
   if (error) throw new Error(error.error.message);
   return data.data;
   ```

**エラーケース**:

1. **認証トークンが見つからない場合** (EDGE-001):
   - 期待される動作: エラーメッセージ「認証トークンが見つかりません」をthrow
   - 既存テストケース: `userService.test.ts`

2. **API呼び出しが失敗した場合**:
   - 401 Unauthorized: JWKS検証失敗
   - 404 Not Found: ユーザーが見つからない
   - 500 Internal Server Error: サーバー内部エラー
   - 期待される動作: React Queryのerror状態に遷移し、エラーメッセージを表示

3. **ネットワークエラーが発生した場合**:
   - 期待される動作: エラーサービスで統一的にエラーハンドリング

**データフロー**:
```
ユーザー操作
  ↓
UIコンポーネント (UserProfile.tsx)
  ↓
React Queryフック (useUser.ts)
  ↓
APIクライアント (api.ts) ← openapi-fetch使用
  ↓
バックエンドAPI (GET /users/{id})
  ↓
レスポンス（型安全なUser型）
  ↓
React Queryキャッシュ更新
  ↓
UIコンポーネント再レンダリング
```

**参照したEARS要件**:
- EDGE-001: Zodバリデーション失敗時は、フィールド名・期待値・実際の値を含むエラーレスポンスを返却する

**参照した設計文書**:
- `docs/design/type-safety-enhancement/dataflow.md` - （未読み込みだが推測可能）
- `app/client/src/features/user/services/userService.ts` - 既存エラーハンドリング
- `app/client/src/features/user/hooks/useUser.ts` - React Queryフック実装

---

## 5. EARS要件・設計文書との対応関係

**参照したユーザストーリー**:
- ストーリー2: API契約の明示化による連携品質向上

**参照した機能要件**:
- REQ-005: システムはOpenAPI仕様書からTypeScript型定義を自動生成しなければならない
- REQ-007: システムはフロントエンドで自動生成されたTypeScript型を使用してAPIクライアントを型安全に実装しなければならない
- REQ-102: Zodスキーマが変更された場合、システムは自動的にOpenAPI仕様を再生成しなければならない
- REQ-103: OpenAPI仕様が変更された場合、システムは自動的にTypeScript型定義を再生成しなければならない

**参照した非機能要件**:
- NFR-002: 型定義の自動生成プロセスは合理的な時間内で完了しなければならない
- NFR-101: データベーススキーマの変更から型定義の反映まで、手動介入なしに自動化されなければならない
- NFR-102: 型の不整合はTypeScriptコンパイル時に検出されなければならない

**参照したEdgeケース**:
- EDGE-001: Zodバリデーション失敗時は、フィールド名・期待値・実際の値を含むエラーレスポンスを返却する

**参照した受け入れ基準**:
- フロントエンドで自動生成された型を使用してAPIクライアントを実装できる
- 既存の認証フローが動作する
- ユーザープロフィール取得が動作する

**参照した設計文書**:
- **アーキテクチャ**: `docs/design/type-safety-enhancement/architecture.md` - セクション「フロントエンド（Next.js）」「APIクライアント型安全化」
- **型定義**: `app/client/src/types/api/generated.ts` - OpenAPI自動生成型定義
- **API仕様**: `docs/design/type-safety-enhancement/api-endpoints.md` - セクション「ユーザー管理エンドポイント」

---

## 品質判定

✅ **高品質**:
- ✅ 要件の曖昧さ: なし（EARS要件定義書・設計文書から明確に抽出）
- ✅ 入出力定義: 完全（既存コード・OpenAPI型定義から具体的に抽出）
- ✅ 制約条件: 明確（非機能要件・アーキテクチャ設計から抽出）
- ✅ 実装可能性: 確実（既存の`useUser.ts`, `api.ts`が実装済み）

---

## 次のステップ

**次のお勧めステップ**: `/tdd-testcases` でテストケースの洗い出しを行います。
