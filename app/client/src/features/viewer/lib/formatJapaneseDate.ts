// ブラウザのローカルタイムゾーンに依存すると同じUTC時刻でも日付表示が
// 閲覧者ごとにずれるため、日本時間で固定する
const formatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'Asia/Tokyo',
});

// Intl.DateTimeFormat#formatの区切り文字はロケールデータの実装依存で
// 完全一致が保証されないため、formatToPartsから年月日を取り出して
// 「年」「月」「日」を明示的に組み立てる
export function formatJapaneseDate(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const parts = formatter.formatToParts(date);
  const get = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value;

  return `${get('year')}年${get('month')}月${get('day')}日`;
}
