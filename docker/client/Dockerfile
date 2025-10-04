# ベースイメージ
FROM oven/bun:1.2.20-alpine

# Node.jsをインストール（wrangler用）
# 注: パッケージマネージャ(apk)による依存インストールのため一時的にrootに切り替え
# インストール後は即座に非rootユーザー(bun)に戻す
USER root
RUN apk add --no-cache nodejs npm
USER bun

# 作業ディレクトリを設定
WORKDIR /home/bun/app/client

CMD ["ash", "-c", "bun run dev"]
