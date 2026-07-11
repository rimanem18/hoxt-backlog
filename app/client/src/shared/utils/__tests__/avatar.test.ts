import { describe, expect, test } from 'bun:test';
import { extractInitial, nameToAvatarColor } from '../avatar';

describe('nameToAvatarColor', () => {
  test('同じ名前からは常に同じHEXカラーが生成される', () => {
    // Given: 同一の名前
    const name = '山田太郎';

    // When: 2回色を生成
    const first = nameToAvatarColor(name);
    const second = nameToAvatarColor(name);

    // Then: 常に同じ色になる
    expect(first).toBe(second);
  });

  test('異なる名前からは異なるHEXカラーが生成される', () => {
    // Given: 異なる2つの名前
    const nameA = '山田太郎';
    const nameB = 'John Smith';

    // When: それぞれの色を生成
    const colorA = nameToAvatarColor(nameA);
    const colorB = nameToAvatarColor(nameB);

    // Then: 異なる色になる
    expect(colorA).not.toBe(colorB);
  });

  test('生成されるカラーが#RRGGBB形式である', () => {
    // Given: 任意の名前
    const name = 'テストユーザー';

    // When: 色を生成
    const color = nameToAvatarColor(name);

    // Then: #RRGGBB形式の文字列になる
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('extractInitial', () => {
  test('英語名の先頭文字は大文字のイニシャルになる', () => {
    // Given: 小文字始まりの英語名
    const name = 'taro';

    // When: イニシャルを抽出
    const initial = extractInitial(name);

    // Then: 大文字1文字になる
    expect(initial).toBe('T');
  });

  test('日本語名の先頭文字がそのままイニシャルになる', () => {
    // Given: 日本語の名前
    const name = '山田太郎';

    // When: イニシャルを抽出
    const initial = extractInitial(name);

    // Then: 先頭の漢字1文字になる
    expect(initial).toBe('山');
  });

  test('前後に空白を含む名前でも先頭文字が正しく抽出される', () => {
    // Given: 前後に空白を含む名前
    const name = '  Taro Yamada  ';

    // When: イニシャルを抽出
    const initial = extractInitial(name);

    // Then: 空白を除いた先頭文字になる
    expect(initial).toBe('T');
  });

  test('サロゲートペア（絵文字）を含む名前でも先頭1文字が壊れない', () => {
    // Given: 絵文字から始まる名前
    const name = '😀たろう';

    // When: イニシャルを抽出
    const initial = extractInitial(name);

    // Then: 絵文字が壊れずに1文字として抽出される
    expect(initial).toBe('😀');
  });

  test('空文字や空白のみの名前では?を返す', () => {
    // Given: 空白のみの名前
    const name = '   ';

    // When: イニシャルを抽出
    const initial = extractInitial(name);

    // Then: フォールバック文字が返る
    expect(initial).toBe('?');
  });

  test('大文字化で複数文字に展開される文字でも1文字に絞られる', () => {
    // Given: toUpperCase()で'SS'に展開される'ß'始まりの名前
    const name = 'ßeethoven';

    // When: イニシャルを抽出
    const initial = extractInitial(name);

    // Then: 1文字のみが返る
    expect(initial).toBe('S');
    expect(Array.from(initial)).toHaveLength(1);
  });
});
