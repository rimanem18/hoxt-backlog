import { describe, expect, test } from 'bun:test';
import type { ZodIssue } from 'zod';
import { formatZodError } from '../zodErrorFormatter';

describe('formatZodError', () => {
  test('invalid_type エラーで期待値・実際の値を含む日本語メッセージが生成される', () => {
    // Given: 型エラーのZodIssue
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['userId'],
        message: 'Expected string, received number',
      } as any,
    ];

    // When: フォーマット処理を実行
    const result = formatZodError(issues);

    // Then: 日本語エラーメッセージが生成される
    expect(result).toEqual({
      userId: 'userIdは文字列型である必要がありますが、数値型が入力されました',
    });
  });

  test('invalid_string (UUID) エラーで詳細な日本語メッセージが生成される', () => {
    // Given: UUID検証エラー
    const issues: ZodIssue[] = [
      {
        code: 'invalid_string',
        validation: 'uuid',
        path: ['id'],
        message: 'Invalid uuid',
      } as any,
    ];

    // When & Then
    const result = formatZodError(issues);
    expect(result.id).toContain('UUID');
    expect(result.id).toContain('有効');
  });

  test('invalid_string (email) エラーで詳細な日本語メッセージが生成される', () => {
    // Given: email検証エラー
    const issues: ZodIssue[] = [
      {
        code: 'invalid_string',
        validation: 'email',
        path: ['email'],
        message: 'Invalid email',
      } as any,
    ];

    // When & Then
    const result = formatZodError(issues);
    expect(result.email).toContain('メールアドレス');
    expect(result.email).toContain('有効');
  });

  test('too_small エラーで最小値を含む日本語メッセージが生成される', () => {
    // Given: 最小値違反エラー
    const issues: ZodIssue[] = [
      {
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
        exact: false,
        path: ['name'],
        message: 'String must contain at least 1 character(s)',
      } as any,
    ];

    // When & Then
    const result = formatZodError(issues);
    expect(result.name).toContain('1');
    expect(result.name).toContain('以上');
  });

  test('too_big エラーで最大値を含む日本語メッセージが生成される', () => {
    // Given: 最大値違反エラー
    const issues: ZodIssue[] = [
      {
        code: 'too_big',
        maximum: 100,
        type: 'string',
        inclusive: true,
        exact: false,
        path: ['description'],
        message: 'String must contain at most 100 character(s)',
      } as any,
    ];

    // When & Then
    const result = formatZodError(issues);
    expect(result.description).toContain('100');
    expect(result.description).toContain('以下');
  });

  test('ネストされたフィールドパスが正しく結合される', () => {
    // Given: ネストされたパスを持つエラー
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['user', 'profile', 'name'],
        message: 'Required',
      } as any,
    ];

    // When & Then
    const result = formatZodError(issues);
    expect(result['user.profile.name']).toBeDefined();
    expect(result['user.profile.name']).toContain('user.profile.name');
  });

  test('複数のエラーが正しく変換される', () => {
    // Given: 複数のバリデーションエラー
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['userId'],
        message: 'Expected string, received number',
      } as any,
      {
        code: 'invalid_string',
        validation: 'email',
        path: ['email'],
        message: 'Invalid email',
      } as any,
    ];

    // When & Then
    const result = formatZodError(issues);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result.userId).toBeDefined();
    expect(result.email).toBeDefined();
  });

  test('想定外のエラーコードでfallbackメッセージが生成される', () => {
    // Given: 想定外のエラーコード
    const issues: ZodIssue[] = [
      {
        code: 'custom' as any,
        path: ['customField'],
        message: 'Custom validation failed',
      },
    ];

    // When & Then
    const result = formatZodError(issues);
    expect(result.customField).toBeDefined();
    expect(result.customField).toContain('Custom validation failed');
  });

  test('空のパスでルートレベルのエラーが処理される', () => {
    // Given: パスが空のエラー
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'object',
        received: 'null',
        path: [],
        message: 'Expected object, received null',
      } as any,
    ];

    // When & Then
    const result = formatZodError(issues);
    expect(result._root).toBeDefined();
  });
});
