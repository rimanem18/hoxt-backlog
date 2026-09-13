import { describe, expect, test } from 'bun:test';
import { urlBase64ToUint8Array } from '../lib/vapidKey';

describe('urlBase64ToUint8Array', () => {
  test('URL-safeなBase64文字列がバイト列に変換される', () => {
    // Given: '-'と'_'を含むパディングなしのURL-safe Base64文字列
    const input = 'PDw_Pz8-Pg';

    // When: Uint8Arrayへ変換
    const result = urlBase64ToUint8Array(input);

    // Then: 元の文字列「<<???>>」に対応するバイト列が得られる
    expect(Array.from(result)).toEqual([60, 60, 63, 63, 63, 62, 62]);
  });

  test('パディングが必要な長さの文字列でも正しく変換される', () => {
    // Given: 4の倍数でない長さのURL-safe Base64文字列
    const input = 'YQ';

    // When: Uint8Arrayへ変換
    const result = urlBase64ToUint8Array(input);

    // Then: 'a'のバイト値（97）が得られる
    expect(Array.from(result)).toEqual([97]);
  });
});
