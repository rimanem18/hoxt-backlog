import { describe, expect, test } from 'bun:test';
import { formatJapaneseDate } from '../lib/formatJapaneseDate';

describe('formatJapaneseDate', () => {
  test('ISO日時文字列が「2026年9月15日」形式に変換される', () => {
    // Given: ISO 8601形式の日時文字列
    const isoDateTime = '2026-09-15T00:00:00.000Z';

    // When: 日本語の年月日表記に変換
    const result = formatJapaneseDate(isoDateTime);

    // Then: 「2026年9月15日」形式になる
    expect(result).toBe('2026年9月15日');
  });

  test('日本時間で日付が変わる直前の時刻でも同じ日の日付が返る', () => {
    // Given: UTC・日本時間ともに9月15日だが、日本時間では23:59と日付境界の直前になる時刻
    const isoDateTime = '2026-09-15T14:59:59.000Z';

    // When: 日本語の年月日表記に変換
    const result = formatJapaneseDate(isoDateTime);

    // Then: 日本時間基準の「2026年9月15日」になる
    expect(result).toBe('2026年9月15日');
  });

  test('UTC深夜が日本時間で翌日になる場合は翌日の日付が返る', () => {
    // Given: UTCでは9月14日15:00だが日本時間では9月15日0:00になる時刻
    const isoDateTime = '2026-09-14T15:00:00.000Z';

    // When: 日本語の年月日表記に変換
    const result = formatJapaneseDate(isoDateTime);

    // Then: 日本時間基準の「2026年9月15日」になる
    expect(result).toBe('2026年9月15日');
  });
});
