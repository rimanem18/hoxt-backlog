1. まずは以下を把握してください。

- `@docs/spec/type-safety-enhancement-requirements.md`
- `@docs/design/type-safety-enhancement/*`
- `@docs/implements/TASK-1003/migration-requirements.md`
- `@docs/implements/TASK-1003/migration-testcases.md`

2. テスト要件を参考にテストケースを実装してください。テストケースの実装状況をチェックボックスリストにして記録してください。
3. 記載漏れがあれば、テストケースのチェックボックスを追加してください。
4. refactor まで実装とレビューが済んだら、チェックボックスを埋めてユーザーに報告してください。

---- ここから下にチェックボックスリストを作成 ----

## テストケース実装状況

### 正常系テストケース (4件)
- [x] **T001**: useUserフックが型安全にユーザー情報を取得できる
  - 実装場所: `app/client/src/features/user/hooks/useUser.test.tsx`
  - 理由: 既存実装済み、OpenAPI型定義に基づく型推論を検証
- [x] **T002**: useUpdateUserフックが型安全にユーザー情報を更新できる
  - 実装場所: `app/client/src/features/user/hooks/useUpdateUser.test.tsx`
  - 理由: 既存実装済み、useMutationによる更新処理とキャッシュ無効化を検証
- [x] **T003**: APIクライアントが環境変数から正しく初期化される
  - 実装場所: `app/client/src/lib/api.test.ts`
  - 理由: 既存実装済み、createApiClient関数の初期化を検証
- [x] **T004**: 認証トークンが正しくAPIクライアントに統合される
  - 実装場所: `app/client/src/lib/api.test.ts`
  - 理由: 今回追加実装、Authorizationヘッダーの付与を検証

### 異常系テストケース (4件)
- [x] **T005**: ユーザーが存在しない場合に適切なエラーを返す
  - 実装場所: `app/client/src/features/user/hooks/useUser.test.tsx`, `app/client/src/lib/api.test.ts`
  - 理由: 既存実装済み、404エラーの適切なハンドリングを検証
- [x] **T006**: ネットワークエラー時に適切にエラーハンドリングする
  - 実装場所: `app/client/src/features/user/hooks/useUser.test.tsx`, `app/client/src/lib/api.test.ts`
  - 理由: 既存実装済み、ネットワーク障害時のエラー処理を検証
- [x] **T007**: バリデーションエラー時に詳細なエラーメッセージを返す
  - 実装場所: `app/client/src/features/user/hooks/useUpdateUser.test.tsx`
  - 理由: 今回詳細化実装、バリデーションエラーの詳細メッセージ検証を追加
- [x] **T008**: 認証トークンが不正な場合に401エラーを返す
  - 実装場所: `app/client/src/lib/api.test.ts`
  - 理由: 今回追加実装、401 Unauthorizedエラーの検証

### 境界値テストケース (3件)
- [x] **T009**: nullableフィールド（avatarUrl, lastLoginAt）がnullの場合に正しく処理される
  - 実装場所: `app/client/src/lib/api.test.ts`
  - 理由: 既存実装済み、nullable型の正しい推論を検証
- [x] **T010**: 空のクエリパラメータ（limit, offset）がデフォルト値で処理される
  - 実装場所: `app/client/src/lib/api.test.ts`
  - 理由: 今回追加実装、将来のページネーション対応を見据えた境界値テスト
- [x] **T011**: UUID形式の境界値テスト（有効な最小・最大UUID）
  - 実装場所: `app/client/src/lib/api.test.ts`
  - 理由: 今回追加実装、UUID v4形式の境界値検証

## 実装完了サマリー

- **テスト総数**: 17件 (すべてパス)
- **新規追加テストケース**: 5件 (T004, T007詳細化, T008, T010, T011)
- **削除ファイル**: 9件 (fetchベースの旧実装とそのテスト)
  - `userService.ts`, `tokenService.ts`, `errorService.ts`
  - `UserServiceContext.tsx`, `useUserProfile.ts`
  - `UserProfile.tsx`
  - 対応するテストファイル3件

## 品質チェック結果

- ✅ **型チェック**: エラーなし (`bunx tsc --noEmit`)
- ✅ **テスト**: 17 pass, 0 fail, 104 expect() calls
- ✅ **Lint**: エラー・警告なし (`bun run fix`)
- ✅ **Semgrep**: セキュリティ問題なし (0 findings)
- ✅ **Codex MCP レビュー**: 指摘事項すべて修正完了

## 完了基準の達成状況

1. ✅ 全11件のテストケースが実装され、テストがパス
2. ✅ 旧実装ファイル (userService.ts等) がすべて削除
3. ✅ 型チェック、テスト、Lint、Semgrepがすべてパス
4. ✅ Codex MCPレビューで機能・品質・セキュリティに問題なし
5. ✅ migration-memo.mdのチェックボックスがすべて埋まる

---

**実装完了日**: 2025-10-27
**実装者**: Claude (Sonnet 4.5)
**レビュー**: Codex MCP
