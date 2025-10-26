1. まずは以下を把握してください。

- `@docs/spec/type-safety-enhancement-requirements.md`
- `@docs/design/type-safety-enhancement/*`
- `@docs/implements/TASK-1002/type-safe-api-client-testcases.md`
- `@docs/implements/TASK-1002/type-safe-api-client-testcases.md`

2. テスト要件を参考にテストケースを実装してください。テストケースの実装状況をチェックボックスリストにして記録してください。
3. 記載漏れがあれば、テストケースのチェックボックスを追加してください。
4. refactor まで実装とレビューが済んだら、チェックボックスを埋めてユーザーに報告してください。

---- ここから下 ----

## 実装進捗

### Phase 1: 基本機能（T001-T003）

- [x] **T001**: APIクライアント初期化が正しく動作する
  - Red: テスト作成完了 (`src/lib/api.test.ts`)
  - Green: テスト成功（openapi-fetchのデフォルトインポート使用）
  - Refactor: `createApiClient`関数を実装、コメント追加
  - Codexレビュー実施: Majorな指摘に対応
    - モック化してcreateClientへの引数を検証
    - `headers`の型を`HeadersInit`に変更
    - デフォルト`apiClient`のテスト追加
  - 型チェック: ✅ 成功（3テスト全て成功）
  - 実装ファイル: `src/lib/api.ts`
  - テストファイル: `src/lib/api.test.ts`

- [x] **T002**: GETメソッドで型安全にユーザー情報を取得できる
  - Red: テスト作成完了（DI方式でmockFetchを注入）
  - Green: テスト成功（`createApiClient`に`fetch`オプション追加）
  - Refactor: `mock.module()`を完全削除、DI方式に統一
  - Codexレビュー実施: Criticalな指摘に対応
    - `mock.module()`がDI-injected mockFetchをブロックしていた問題を解決
    - アサーションを`expect(data).toEqual()`で強化
    - Given-When-Thenコメント形式で可読性向上
  - 追加改善: リクエスト検証を追加（HTTPメソッド、URL、呼び出し回数）
  - 型チェック: ✅ 成功（3テスト全て成功）
  - 実装ファイル: `src/lib/api.ts` (fetch optionパラメータ追加)
  - テストファイル: `src/lib/api.test.ts`
- [x] **T003**: PUTメソッドで型安全にユーザー情報を更新できる
  - DIRECT実装: openapi-fetchが既にPUTメソッドを提供済みのため、TDDではなく直接テスト作成
  - テスト作成完了（DI方式でmockFetchを注入）
  - Codexレビュー実施: Mediumな指摘に対応
    - mockFetchの呼び出し検証を追加（HTTPメソッド、URL、リクエストボディ、呼び出し回数）
    - リクエストボディの検証により、PUTリクエストが正しく送信されることを保証
  - 型チェック: ✅ 成功（4テスト、27アサーション全て成功）
  - 実装ファイル: `src/lib/api.ts` (既存実装で対応)
  - テストファイル: `src/lib/api.test.ts`

### Phase 2: React Query統合（T004-T005）

- [x] **T004**: React QueryフックuseUserが正しい型を返す
  - Red: テスト作成完了 (`src/features/user/hooks/useUser.test.tsx`)
  - Green: テスト成功（ApiClientContextからuseApiClientで取得）
  - Refactor: エラーハンドリング強化、型安全性確認
  - Codexレビュー実施: Minorな指摘に対応
    - 未使用import削除（`createApiClient`）
    - `UpdateUserBody`型をOpenAPI生成型から推論（手書き型を削除）
  - 型チェック: ✅ 成功（5テスト、28アサーション全て成功）
  - 実装ファイル: `src/features/user/hooks/useUser.ts`
  - テストファイル: `src/features/user/hooks/useUser.test.tsx`

- [x] **T005**: React QueryフックuseUpdateUserがキャッシュを適切に無効化する
  - Red: テスト作成完了（キャッシュ無効化検証を含む）
  - Green: テスト成功（onSuccessでinvalidateQueries実行）
  - Refactor: エラーハンドリング強化、型安全性確認
  - 型チェック: ✅ 成功（5テスト、28アサーション全て成功）
  - 実装ファイル: `src/features/user/hooks/useUpdateUser.ts`
  - テストファイル: `src/features/user/hooks/useUpdateUser.test.tsx`

### Phase 3: エラーハンドリング（T006-T008）

- [x] **T006**: 404エラー時に適切なエラーレスポンスを返す
  - DIRECT実装: openapi-fetchが既にエラーレスポンスを`{ data, error }`形式で返す
  - テスト作成完了（mockFetchで404レスポンスを返す設定）
  - OpenAPI仕様確認済み: `{ success: false, error: { code, message } }`形式
  - Codexレビュー実施: No Findings（問題なし）
  - 型チェック: ✅ 成功（7テスト、46アサーション全て成功）
  - 実装ファイル: `src/lib/api.ts` (既存実装で対応)
  - テストファイル: `src/lib/api.test.ts`

- [x] **T007**: ネットワークエラー時に適切にエラーハンドリングする
  - DIRECT実装: openapi-fetchは`fetch` rejectを伝播させる（例外を投げる）
  - テスト作成完了（try-catchでエラーをキャッチ）
  - Codex事前指摘対応: `{ data, error }`タプルではなく、例外として処理
  - Codexレビュー実施: No Findings（問題なし）
  - 型チェック: ✅ 成功（7テスト、46アサーション全て成功）
  - 実装ファイル: `src/lib/api.ts` (既存実装で対応)
  - テストファイル: `src/lib/api.test.ts`

- [x] **T008**: 公開エンドポイントは認証トークンなしでアクセスできる（変更）
  - DIRECT実装: 認証トークン強制チェック実装見送り
  - 変更理由: 公開エンドポイント（`/auth/callback`）が存在するため、柔軟性を保つ
  - テスト作成完了（POST /auth/callbackを認証なしで実行）
  - Codexレビュー実施: Residual Riskに対応
    - `request.headers.get('Authorization')`がnullであることを明示的に検証
  - 型チェック: ✅ 成功（7テスト、46アサーション全て成功）
  - 実装ファイル: `src/lib/api.ts` (既存実装で対応)
  - テストファイル: `src/lib/api.test.ts`

### Phase 4: 境界値テスト（T009-T010）

- [ ] **T009**: 空のレスポンスボディを正しく処理する **SKIP（将来拡張）**
  - SKIP理由: API仕様書では全レスポンスが `{ success: true/false, data/error: ... }` 形式
  - 「空のレスポンスボディ `{}`」というシナリオが現状存在しない
  - 削除API（204 No Content）などが必要になった時点で実装予定
  - 実装ファイル: N/A
  - テストファイル: N/A

- [x] **T010**: nullフィールドを含むレスポンスを正しく処理する
  - T002で満たされている: T002のGETテストで既に `avatarUrl: null`, `lastLoginAt: null` をテスト済み
  - T002テストに「T010: nullフィールド境界値テスト」コメントを追加
  - null値検証のアサーション追加: `expect(data?.data.avatarUrl).toBeNull()`
  - 型チェック: ✅ 成功（7テスト、48アサーション全て成功）
  - 実装ファイル: `src/lib/api.ts` (既存実装で対応)
  - テストファイル: `src/lib/api.test.ts` (T002テスト)

### Phase 5: 型チェック（T011-T012）

- [ ] **T011**: 存在しないエンドポイントへのアクセスでコンパイルエラーが発生する
- [ ] **T012**: 誤った型のパラメータでコンパイルエラーが発生する

---

## 実装メモ

### T001の学び
- `openapi-fetch`はデフォルトエクスポートとして`createClient`を提供
- `createApiClient`ラッパー関数を作成し、型安全性と再利用性を向上
- Bunテストフレームワークで正常に動作確認
- **Codexレビューの価値**:
  - メソッドの存在確認だけでは不十分、引数の検証が重要
  - モック化により内部実装の正確性を保証
  - `HeadersInit`型により柔軟性向上（Record, Headers, 配列に対応）

### T002の学び
- **DI (Dependency Injection) の重要性**:
  - `mock.module()`はグローバルなモック化のためDI-injected mockFetchをブロックする
  - テストでは`createApiClient(..., { fetch: mockFetch })`で明示的に注入する方が安全
  - Bun標準テストでは DI > mock() > spyOn() > mock.module() の優先順位
- **アサーションの強化**:
  - `expect(data).toBeDefined()`は`null`でもパスするため不十分
  - `expect(data).toEqual({ success: true, data: mockUser })`で完全なオブジェクト比較を実施
- **Given-When-Thenパターン**:
  - テストコメントを構造化し、可読性と保守性が向上
  - 各フェーズを明確に区別することでテストの意図が伝わりやすくなる

### T003の学び
- **DIRECT実装の判断基準**:
  - openapi-fetchが既にPUTメソッドを提供している場合、TDDのRed phaseが発生しない
  - Codex指摘「Test-first drift」を回避するため、DIRECT実装に切り替え
  - 新規実装が不要な場合は、テストを書いて即座にGreenになることを確認する方式が適切
- **リクエスト検証の重要性**:
  - レスポンスだけでなく、リクエスト内容（HTTPメソッド、URL、ボディ）も検証すべき
  - `mockFetch.mock.calls[0][0]`でリクエストオブジェクトを取得し検証
  - `request.clone().json()`でリクエストボディを取得（非破壊的読み取り）
- **T002への波及改善**:
  - T003のレビューで得た知見をT002にも適用（リクエスト検証追加）
  - 一貫性のあるテスト構造により、保守性が向上

### T004-T005の学び
- **Context ProviderパターンによるDI**:
  - APIクライアントをシングルトンで使うと、テストでmockFetchを注入できない
  - `ApiClientProvider`を作成し、テスト時に`client`プロパティでモッククライアントを注入
  - `useApiClient()`フックでContextからクライアントを取得し、本番とテストを統一
- **React Queryのキャッシュ無効化検証**:
  - `invalidateQueries()`をspyOnするとグローバル影響が発生
  - `queryClient.getQueryState(['users', userId]).isInvalidated`で検証する方が安全
  - 各テストで新しい`QueryClient`を作成し、キャッシュを分離することが重要
- **OpenAPI生成型からの型推論**:
  - 手書き型（例: `type UpdateUserBody = { name?: string; avatarUrl?: string }`）は、OpenAPI仕様と乖離するリスクがある
  - `NonNullable<paths['/api/users/{id}']['put']['requestBody']>['content']['application/json']`で自動推論
  - スキーマ変更時に自動的に型が追従し、保守性が向上
- **エラーハンドリングの明示化**:
  - `error`と`!data`の両方をチェックし、明確なエラーメッセージを返す
  - React Queryの`error`状態にするため、`throw new Error()`を使用
  - テストでは`result.current.error?.message`でエラーメッセージを検証

### T006-T008の学び（Phase 3: エラーハンドリング）

- **openapi-fetchのエラー動作の理解**:
  - HTTPエラー（404等）: `{ data: undefined, error: { success: false, error: { code, message } } }`形式で返却
  - ネットワークエラー: `fetch` rejectを伝播させ、例外を投げる（`{ data, error }`タプルではない）
  - 404エラーでは`error?.success === false`で型安全にエラーを判定できる
- **Codex事前レビューの価値**:
  - 実装前にCodexに相談することで、重要な動作仕様の見落としを防げた
  - T007のネットワークエラー動作（例外を投げる）をCodexが事前に指摘
  - OpenAPI仕様の確認を促され、エラースキーマの正確性を保証できた
- **認証トークンチェックの設計判断**:
  - 公開エンドポイント（`/auth/callback`）の存在により、`createApiClient`での強制チェックは不適切
  - 柔軟性を保つため、認証チェックは各エンドポイントレベルで実施
  - T008を「公開エンドポイントテスト」に変更し、認証なしアクセスを保証
- **テストアサーションの厳密化**:
  - Codex Residual Risk指摘により、`request.headers.get('Authorization')`がnullであることを明示的に検証
  - 将来的に`createApiClient`がデフォルトトークンを注入しても、テストが誤って成功しないようにする
  - アサーション数46個により、エラーハンドリングの網羅性を確保

### T009-T010の学び（Phase 4: 境界値テスト）

- **T009のSKIP判断**:
  - API仕様書を確認した結果、全レスポンスが `{ success: true/false, data/error: ... }` 形式であることが判明
  - 「空のレスポンスボディ `{}`」というシナリオが現状存在しないため、SKIP判断
  - 削除API（204 No Content）などが必要になった時点で実装予定として記録
- **T010の重複解消戦略**:
  - T002のGETテストで既に `avatarUrl: null`, `lastLoginAt: null` をテスト済みであることを確認
  - 重複実装を避けるため、T002テストに「T010: nullフィールド境界値テスト」コメントを追加
  - トレーサビリティを確保しつつ、テストの保守性を向上
- **Codexの助言活用**:
  - Codexに事前相談し、重複を避けつつ境界値テストの意図を明確にする設計を推奨された
  - T002を拡張してT010のタグを付与する方式により、実装効率とトレーサビリティを両立
- **API仕様の理解の重要性**:
  - テストケース定義時にAPI仕様書を詳細に確認することで、実装不要なテストを事前に特定
  - 「空のレスポンス」が仕様上存在しないことを把握し、不要な実装を回避
  - スキーマ駆動開発のメリットを活用した効率的なテスト戦略

