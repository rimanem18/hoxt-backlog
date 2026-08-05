# ベースイメージ
# workerd（wrangler経由でCloudflareデプロイ時に実行）はglibc向けビルドしか配布されないため、
# musl libcのAlpineではなくglibc系のDebianベースを使用する
FROM oven/bun:1.3.14-slim

# Node.jsをインストール（wrangler用）
# wranglerがNode.js 22以上を要求するため、Debian標準リポジトリ(v20系)ではなく
# NodeSourceのリポジトリから取得する
# 注: パッケージマネージャ(apt-get)による依存インストールのため一時的にrootに切り替え
# インストール後は即座に非rootユーザー(bun)に戻す
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*
USER bun

# 作業ディレクトリを設定
WORKDIR /home/bun/app/client

CMD ["bash", "-c", "bun run dev"]
