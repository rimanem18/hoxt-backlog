# ベースイメージ
# clientと同一ベースに揃えることでイメージレイヤーを共有しディスク使用量を抑える
FROM oven/bun:1.3.14-slim

# 作業ディレクトリを設定
WORKDIR /home/bun/app/server
USER bun

CMD ["bash", "-c", "bun run dev"]
