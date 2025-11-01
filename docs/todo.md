ここよりも下に記載

---

## E2Eテスト改善タスク（2025-01-31）

### Issue 1: E2EテストのstorageKeyロジック共通化 ✅ 実装予定（2025-10-31）

**背景**:
- 現在、T006テストでlocalStorageキーを生成するロジックがインラインで記述されている
- `getSupabaseStorageKey()`関数と同じロジックが重複しており、メンテナンス性が低い
- 将来的に実装が変更された場合、テストコードも同期して修正する必要がある

**採用した実装方針**: DIRECT（TDD不要）
- 理由: 単純なユーティリティ抽出で既存E2Eリグレッションが担保される（Codexレビュー承認済み）

**タスク**:
- [x] テストヘルパー（`e2e/helpers/test-setup.ts`）にstorageKey生成関数を追加
- [x] T006テストのインラインロジックをヘルパー関数で置き換え
- [x] 他のテスト（T004, T005, T007）およびsetMockAuthSessionでも同様に修正

**優先度**: 低
**見積もり**: 1-2時間
**関連ファイル**:
- `app/client/e2e/auth.spec.ts` (189-192行目)
- `app/client/src/shared/utils/authValidation.ts` (13-38行目)
- `app/client/e2e/helpers/test-setup.ts`

---

### Issue 2: JWT期限切れ時のエラーメッセージ表示UX改善 ✅ 実装予定（2025-10-31）

**背景**:
- 現在、期限切れJWTでアクセスした場合、リダイレクトは正常に動作するがエラーメッセージが表示されない
- `provider.tsx`のuseEffectは初回マウント時のみ実行されるため、ページ遷移後は期限切れ検証が再実行されない
- ユーザーに期限切れの理由が伝わらず、UXが低下している

**現在のテスト状態**:
- T006テストでは、エラーメッセージ表示の検証を削除し、リダイレクトのみを検証している（選択肢A採用）

**採用した実装方針**: Option B-2（カスタムフック）
- 理由:
  - 各ページでの手動呼び出し不要（B-1の欠点解消）
  - パフォーマンス影響が最小（B-3のポーリングより効率的）
  - 保護されたページでのみ実行（必要最小限の検証）
  - React慣用的なパターン
  - Codexレビュー承認済み

**セキュリティ考慮事項**（Codex指摘）:
- ✅ トースト文言に敏感情報を含めない（例: "セッションが切れました。再度ログインしてください"）
- ✅ `validateStoredAuth()`内でのリダイレクト制御が二重実行されないよう防ぐ
- ✅ フックが公開ページで走らない構造（AuthGuard限定）の維持

**タスク**:
- [x] `app/client/src/features/auth/hooks/useAuthValidation.ts`を作成
  - [x] `validateStoredAuth()`を呼び出し
  - [x] 無効トークン検出時に`clearStoredAuth()`を呼び出し（Codex指摘対応）
  - [x] リダイレクト処理（二重実行防止を考慮）
  - [ ] 期限切れ時に一般的なエラーメッセージをトースト表示（トーストライブラリ未導入のため保留）
- [x] `AuthGuard.tsx`でカスタムフックを統合
- [x] T006テストを更新（リダイレクト検証は既存で実施済み）
- [ ] （オプション）`useAuthValidation`のユニットテスト追加（回帰リスク対策、Codex推奨）

**優先度**: 中
**見積もり**: 4-6時間
**関連ファイル**:
- `app/client/src/app/provider.tsx` (40-71行目)
- `app/client/src/features/auth/components/AuthGuard.tsx` (17-29行目)
- `app/client/src/features/auth/hooks/useAuthValidation.ts`（新規作成）
- `app/client/e2e/auth.spec.ts` (174-230行目)

**参考情報**:
- Codexレビュー結果: AuthGuardにフックを組み込む設計は一箇所で検証を完結でき、既存ガードパターンとも整合
- JWT期限切れハンドリングは回帰リスクが高いため、ユニットテスト追加を検討

---

