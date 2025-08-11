# タスク完了時チェックリスト

## コード品質確認（必須）

### 1. 型チェック
```bash
# フロントエンド
docker compose exec client bun run typecheck

# バックエンド  
docker compose exec server bun run typecheck
```

### 2. リント・フォーマット
```bash
# 全体
make fmt

# または個別に
docker compose exec client bun run fix
docker compose exec server bun run fix
```

### 3. テスト実行
```bash
# フロントエンド
docker compose exec client bun test

# バックエンド
docker compose exec server bun test
```

## コード品質チェックポイント

### 必須確認項目
- [ ] TypeScriptエラーなし
- [ ] Biomeリントエラーなし
- [ ] すべてのテストが通過
- [ ] 新機能にはテストコードを追加
- [ ] JSDocコメント（What）を記載
- [ ] 関数内コメント（Why）を記載

### SOLID原則確認
- [ ] 単一責任の原則: 1つのクラス・関数は1つの責任
- [ ] 開放閉鎖の原則: 拡張に開放、修正に閉鎖
- [ ] リスコフ置換の原則: 派生クラスは基底クラスと置換可能
- [ ] インターフェース分離の原則: 不要なメソッドへの依存なし
- [ ] 依存性逆転の原則: 抽象に依存、具象に依存しない

### 禁止事項チェック
- [ ] `any`型を使用していない（特別な理由がある場合はコメント付き）
- [ ] `@ts-ignore`を使用していない（`@ts-expect-error`で代替）
- [ ] `var`を使用していない
- [ ] `JSX.Element`ではなく`React.ReactNode`を使用

## コミット前最終確認
```bash
# 全体チェック
make fmt && \
docker compose exec client bun run typecheck && \
docker compose exec server bun run typecheck && \
docker compose exec client bun test && \
docker compose exec server bun test
```