#!/usr/bin/env bash
#
# PostToolUse (Write|Edit) hook: 保存されたファイルを対応する docker compose
# サービス内で自動フォーマットする。
#
# 成功時は完全に無音（stdout/stderr 出力なし、exit 0）。
# 失敗時のみ短いエラーを stderr に出し exit 2 で Claude にフィードバックする。

set -euo pipefail

INPUT="$(cat)"

# jq に依存せず、リポジトリが前提とする Node.js で JSON を解析する
HOST_FILE_PATH="$(
  printf '%s' "$INPUT" | node -e '
    let data = "";
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => {
      try {
        const input = JSON.parse(data);
        process.stdout.write(input.tool_input?.file_path ?? "");
      } catch {
        process.stdout.write("");
      }
    });
  '
)"

if [[ -z "$HOST_FILE_PATH" || ! -f "$HOST_FILE_PATH" ]]; then
  exit 0
fi

# Claude Code から渡される絶対パスを、リポジトリルート基準の相対パスに変換する
HOST_RELATIVE_PATH="$(
  realpath --relative-to="$CLAUDE_PROJECT_DIR" "$HOST_FILE_PATH"
)"

# プロジェクト外のファイルは対象外
if [[ "$HOST_RELATIVE_PATH" == ../* || "$HOST_RELATIVE_PATH" == ".." ]]; then
  exit 0
fi

case "$HOST_RELATIVE_PATH" in
  app/server/src/*)
    SERVICE="server"
    CONTAINER_WORKDIR="/home/bun/app/server"
    RELATIVE_IN_SERVICE="${HOST_RELATIVE_PATH#app/server/}"
    ;;
  app/client/src/*)
    SERVICE="client"
    CONTAINER_WORKDIR="/home/bun/app/client"
    RELATIVE_IN_SERVICE="${HOST_RELATIVE_PATH#app/client/}"
    ;;
  *)
    # biome.json の files.includes が src/**/* に限定されているため、
    # shared-schemas・e2e・docs などそれ以外は対象外
    exit 0
    ;;
esac

# Biome は単一ファイルパスを明示指定すると files.includes (src/**) と
# 正しく突き合わせられず何も処理しないため、親ディレクトリ単位でチェックする
TARGET_DIR="$(dirname "$RELATIVE_IN_SERVICE")"

cd "$CLAUDE_PROJECT_DIR"

# 成功時は完全に無音にするため、出力を一旦キャプチャする
if ! FORMAT_OUTPUT="$(
  docker compose exec -T --workdir "$CONTAINER_WORKDIR" "$SERVICE" \
    bunx biome check --write "$TARGET_DIR" 2>&1
)"; then
  {
    echo "format-on-write: ${HOST_RELATIVE_PATH} のフォーマットに失敗しました"
    echo "$FORMAT_OUTPUT" | tail -n 20
  } >&2
  exit 2
fi

exit 0
