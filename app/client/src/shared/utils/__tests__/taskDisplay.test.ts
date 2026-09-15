import { describe, expect, test } from 'bun:test';
import { getTaskPriorityDisplay, getTaskStatusDisplay } from '../taskDisplay';

describe('getTaskPriorityDisplay', () => {
  test('優先度highのラベルとクラス名を返す', () => {
    // Given: 優先度high
    // When: 表示情報を取得
    const result = getTaskPriorityDisplay('high');

    // Then: ラベル「高」と強調色クラスを返す
    expect(result.label).toBe('高');
    expect(result.className).toBe('text-accent font-bold');
  });

  test('優先度mediumのラベルとクラス名を返す', () => {
    // Given & When: 優先度mediumで表示情報を取得
    const result = getTaskPriorityDisplay('medium');

    // Then: ラベル「中」と標準色クラスを返す
    expect(result.label).toBe('中');
    expect(result.className).toBe('text-gray-700');
  });

  test('優先度lowのラベルとクラス名を返す', () => {
    // Given & When: 優先度lowで表示情報を取得
    const result = getTaskPriorityDisplay('low');

    // Then: ラベル「低」と淡色クラスを返す
    expect(result.label).toBe('低');
    expect(result.className).toBe('text-gray-400');
  });

  test('未知の優先度は入力値をそのままラベルにしデフォルトクラス名を返す', () => {
    // Given: スキーマ外の優先度文字列
    // When: 表示情報を取得
    const result = getTaskPriorityDisplay('urgent');

    // Then: 生値をラベルとして表示し、既定の色クラスにフォールバックする
    expect(result.label).toBe('urgent');
    expect(result.className).toBe('text-gray-700');
  });
});

describe('getTaskStatusDisplay', () => {
  test('ステータスnot_startedのラベルとクラス名を返す', () => {
    // Given & When: ステータスnot_startedで表示情報を取得
    const result = getTaskStatusDisplay('not_started');

    // Then: ラベル「未着手」と対応するバッジ色クラスを返す
    expect(result.label).toBe('未着手');
    expect(result.className).toBe('bg-gray-200 text-gray-700');
  });

  test('ステータスin_progressのラベルとクラス名を返す', () => {
    // Given & When: ステータスin_progressで表示情報を取得
    const result = getTaskStatusDisplay('in_progress');

    // Then: ラベル「進行中」と対応するバッジ色クラスを返す
    expect(result.label).toBe('進行中');
    expect(result.className).toBe('bg-blue-200 text-blue-700');
  });

  test('ステータスin_reviewのラベルとクラス名を返す', () => {
    // Given & When: ステータスin_reviewで表示情報を取得
    const result = getTaskStatusDisplay('in_review');

    // Then: ラベル「レビュー中」と対応するバッジ色クラスを返す
    expect(result.label).toBe('レビュー中');
    expect(result.className).toBe('bg-yellow-200 text-yellow-700');
  });

  test('ステータスcompletedのラベルとクラス名を返す', () => {
    // Given & When: ステータスcompletedで表示情報を取得
    const result = getTaskStatusDisplay('completed');

    // Then: ラベル「完了」と対応するバッジ色クラスを返す
    expect(result.label).toBe('完了');
    expect(result.className).toBe('bg-green-200 text-green-700');
  });

  test('未知のステータスは入力値をそのままラベルにしデフォルトクラス名を返す', () => {
    // Given: スキーマ外のステータス文字列
    // When: 表示情報を取得
    const result = getTaskStatusDisplay('archived');

    // Then: 生値をラベルとして表示し、既定のバッジ色クラスにフォールバックする
    expect(result.label).toBe('archived');
    expect(result.className).toBe('bg-gray-200 text-gray-700');
  });
});
