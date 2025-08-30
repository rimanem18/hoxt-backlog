/**
 * カンマ区切りの文字列を配列に変換する
 *
 * 環境変数などのカンマ区切り文字列を文字列配列に分割し、
 * 各要素の前後の空白文字を除去する。未定義の場合は空配列を返す。
 *
 * @param value - カンマ区切りの文字列（undefined可）
 * @returns トリムされた文字列の配列
 */
export const parseCommaSeparated = (value: string | undefined): string[] => {
  // undefined の場合は空配列、そうでなければ分割してトリム
  return value ? value.split(',').map((item) => item.trim()) : [];
};

export default { parseCommaSeparated };
