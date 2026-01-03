ここよりも下に記載

---

## 技術的負債・改善タスク

### Provider テストの mock.module を DI パターンに移行

**優先度**: ⭐⭐⭐⭐（対応推奨）
**カテゴリ**: テスト品質改善
**対象ファイル**: `app/client/src/app/__tests__/provider.test.tsx`, `app/client/src/app/provider.tsx`

**問題点**:
- `mock.module('@/store', ...)` などをファイルトップで実行しており、フロントエンドガイドライン違反
  - ガイドライン: `mock.module()` は原則禁止、Context DI を使う
- Bun の `mock.module` は `mock.restore()` でも元に戻らず、他テストファイルが実モジュールを import できなくなるリスクがある
- テスト間汚染が発生し、セッション失効テストの信頼性が低下

**提案内容**:
DI パターンに移行し、Provider に `services` を渡せるようにする

**対応例**:
```tsx
// provider.tsx
type ProviderProps = {
  children: React.ReactNode;
  services?: {
    store: typeof store;
    setAuthErrorCallback: typeof setAuthErrorCallback;
    setAuthToken: typeof setAuthToken;
  };
};

export default function Provider({ children, services }: ProviderProps) {
  const authServices = services ?? {
    store,
    setAuthErrorCallback,
    setAuthToken,
  };
  // ... use authServices.store.dispatch 等
}
```

```tsx
// provider.test.tsx
const testStore = { dispatch: mock(() => {}), /* ... */ };

render(
  <Provider services={{ store: testStore, setAuthErrorCallback: mockFn, setAuthToken: mockToken }}>
    <div>Test</div>
  </Provider>,
);
```

**影響範囲**:
- `app/client/src/app/provider.tsx` の修正（services props 追加）
- `app/client/src/app/__tests__/provider.test.tsx` の全面的な書き直し

**メリット**:
- フロントエンドガイドライン遵守
- テスト間汚染の排除
- テストの信頼性向上

**備考**:
- 現在のテストは全て通過しているため、緊急性は低い
- 時間のあるときに対応する形で問題ない
- 関連 Issue: Codex レビュー（2026-01-03）での指摘事項

---
