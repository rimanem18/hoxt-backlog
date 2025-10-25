テストケースの実装状況をチェックボックスリストにして記録してください。
記載漏れがあれば、テストケースのチェックボックスを追加してください。
refactor まで実装とレビューが済んだら、チェックボックスを埋めてユーザーに報告してください。

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

- [ ] **T004**: React QueryフックuseUserが正しい型を返す
- [ ] **T005**: React QueryフックuseUpdateUserがキャッシュを適切に無効化する

### Phase 3: エラーハンドリング（T006-T008）

- [ ] **T006**: 404エラー時に適切なエラーレスポンスを返す
- [ ] **T007**: ネットワークエラー時に適切にエラーハンドリングする
- [ ] **T008**: 認証トークン未設定時にエラーを投げる

### Phase 4: 境界値テスト（T009-T010）

- [ ] **T009**: 空のレスポンスボディを正しく処理する
- [ ] **T010**: nullフィールドを含むレスポンスを正しく処理する

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

