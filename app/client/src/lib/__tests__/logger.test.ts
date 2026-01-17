import { expect, test } from 'bun:test';
import { sanitizeUrl } from '../utils/logger';

test('URLからクエリパラメータを正しく除去する', () => {
  // Given: クエリパラメータを含むURL
  const url = 'https://api.example.com/users/123?token=secret&key=value';

  // When: URLをサニタイズ
  const result = sanitizeUrl(url);

  // Then: クエリパラメータが除去されたパスのみが返される
  expect(result).toBe('https://api.example.com/users/123');
});

test('URLからハッシュフラグメントを正しく除去する', () => {
  // Given: ハッシュフラグメントを含むURL
  const url = 'https://api.example.com/users/123#fragment';

  // When: URLをサニタイズ
  const result = sanitizeUrl(url);

  // Then: ハッシュフラグメントが除去されたパスのみが返される
  expect(result).toBe('https://api.example.com/users/123');
});

test('クエリパラメータとハッシュの両方を含むURLから両方を除去する', () => {
  // Given: クエリパラメータとハッシュの両方を含むURL
  const url =
    'https://api.example.com/users/123?token=secret&key=value#fragment';

  // When: URLをサニタイズ
  const result = sanitizeUrl(url);

  // Then: クエリパラメータとハッシュが除去されたパスのみが返される
  expect(result).toBe('https://api.example.com/users/123');
});

test('クエリパラメータやハッシュを含まないURLはそのまま返される', () => {
  // Given: クエリパラメータやハッシュを含まないURL
  const url = 'https://api.example.com/users/123';

  // When: URLをサニタイズ
  const result = sanitizeUrl(url);

  // Then: 元のURLがそのまま返される
  expect(result).toBe('https://api.example.com/users/123');
});

test('ルートパスのみのURLは正しく処理される', () => {
  // Given: ルートパスのみのURL
  const url = 'https://api.example.com/';

  // When: URLをサニタイズ
  const result = sanitizeUrl(url);

  // Then: オリジンとルートパスが返される
  expect(result).toBe('https://api.example.com/');
});

test('不正なURLフォーマットの場合はエラーメッセージを返す', () => {
  // Given: 不正なURLフォーマット
  const invalidUrl = 'not-a-valid-url';

  // When: 不正なURLをサニタイズ
  const result = sanitizeUrl(invalidUrl);

  // Then: エラーメッセージが返される
  expect(result).toBe('[Invalid URL]');
});

test('空文字列の場合はエラーメッセージを返す', () => {
  // Given: 空文字列
  const emptyUrl = '';

  // When: 空文字列をサニタイズ
  const result = sanitizeUrl(emptyUrl);

  // Then: エラーメッセージが返される
  expect(result).toBe('[Invalid URL]');
});

test('機密情報を含むクエリパラメータが完全に除去される', () => {
  // Given: 機密情報（トークン、API キー、パスワード等）を含むURL
  const url =
    'https://api.example.com/auth/callback?access_token=eyJhbGc' +
    'iOiJIUzI1NiIsInR5cCI6IkpXVCJ9&api_key=sk_live_123456&password=secret123';

  // When: URLをサニタイズ
  const result = sanitizeUrl(url);

  // Then: 機密情報が完全に除去される
  expect(result).toBe('https://api.example.com/auth/callback');
  expect(result).not.toContain('access_token');
  expect(result).not.toContain('api_key');
  expect(result).not.toContain('password');
});
