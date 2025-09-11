# Playwright E2E テスト用 Dockerfile
# ベースイメージをキャッシュ化し、CI実行時間を短縮

# 1. Playwright公式イメージをベースとして使用
FROM mcr.microsoft.com/playwright:v1.55.0-jammy

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. 依存関係をキャッシュするため先にpackage.jsonをコピー
COPY app/client/package.json app/client/bun.lock ./app/client/
COPY app/server/package.json ./app/server/
COPY app/packages ./app/packages/

# 4. クライアント側の依存関係をインストール（キャッシュレイヤー作成）
WORKDIR /app/client
RUN bun install --frozen-lockfile

# 5. Playwrightブラウザを事前インストール（大幅な時間短縮）
RUN bunx playwright install --with-deps

# 6. 作業ディレクトリをリセット
WORKDIR /app

# 7. 全ソースコードをコピー
COPY . .

# 8. デフォルトのテスト実行コマンド
CMD ["bash", "-c", "cd app/client && bun run test:e2e"]