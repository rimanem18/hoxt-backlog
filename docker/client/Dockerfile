# ベースイメージ
FROM oven/bun:1.2.20-alpine

# Node.jsをインストール（wrangler用）
USER root
RUN apk add --no-cache nodejs npm
USER bun

# 作業ディレクトリを設定
WORKDIR /home/bun/app/client

CMD ["ash", "-c", "bun run dev"]
