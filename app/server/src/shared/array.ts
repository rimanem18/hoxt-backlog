
// カンマ区切りの文字列を配列に変換するヘルパー関数
export const parseCommaSeparated = (value: string | undefined): string[] => {
  return value ? value.split(',').map((item) => item.trim()) : [];
};

export default { parseCommaSeparated };
