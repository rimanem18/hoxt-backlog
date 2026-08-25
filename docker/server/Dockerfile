# ベースイメージ
# clientと同一ベースに揃えることでイメージレイヤーを共有しディスク使用量を抑える
FROM oven/bun:1.3.14-slim

# 作業ディレクトリを設定
USER bun
RUN mkdir -p /home/bun/app/server
WORKDIR /home/bun/app/server

CMD ["bash", "-c", "bun run dev"]
