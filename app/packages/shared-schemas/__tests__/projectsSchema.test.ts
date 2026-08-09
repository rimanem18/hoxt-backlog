import { describe, expect, test } from 'bun:test';
import { createProjectSchema, projectSchema } from '../src/projects';

describe('createProjectSchema', () => {
  describe('正常系', () => {
    test('1文字の名前でバリデーションが成功する', () => {
      // Given: 1文字の名前
      const input = { name: 'A' };

      // When: バリデーションを実行
      const result = createProjectSchema.safeParse(input);

      // Then: 成功する
      expect(result.success).toBe(true);
    });

    test('100文字の名前でバリデーションが成功する', () => {
      // Given: 100文字の名前
      const input = { name: 'a'.repeat(100) };

      // When: バリデーションを実行
      const result = createProjectSchema.safeParse(input);

      // Then: 成功する
      expect(result.success).toBe(true);
    });

    test('説明文ありでバリデーションが成功する', () => {
      // Given: 名前と説明文
      const input = { name: 'プロジェクトA', description: '説明文です' };

      // When: バリデーションを実行
      const result = createProjectSchema.safeParse(input);

      // Then: 成功する
      expect(result.success).toBe(true);
    });

    test('説明文なしでバリデーションが成功する', () => {
      // Given: 名前のみ
      const input = { name: 'プロジェクトA' };

      // When: バリデーションを実行
      const result = createProjectSchema.safeParse(input);

      // Then: 成功する
      expect(result.success).toBe(true);
    });
  });

  describe('異常系', () => {
    test('名前未入力でバリデーションが失敗する', () => {
      // Given: nameフィールドがない入力
      const input = { description: '説明文のみ' };

      // When: バリデーションを実行
      const result = createProjectSchema.safeParse(input);

      // Then: 失敗する
      expect(result.success).toBe(false);
    });

    test('空文字列の名前でバリデーションが失敗する', () => {
      // Given: 空文字列の名前
      const input = { name: '' };

      // When: バリデーションを実行
      const result = createProjectSchema.safeParse(input);

      // Then: 失敗する
      expect(result.success).toBe(false);
    });

    test('101文字の名前でバリデーションが失敗する', () => {
      // Given: 101文字の名前
      const input = { name: 'a'.repeat(101) };

      // When: バリデーションを実行
      const result = createProjectSchema.safeParse(input);

      // Then: 失敗する
      expect(result.success).toBe(false);
    });
  });
});

describe('projectSchema', () => {
  test('正しいプロジェクトDTOでバリデーションが成功する', () => {
    // Given: 正しい形式のプロジェクトDTO
    const input = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'プロジェクトA',
      description: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    };

    // When: バリデーションを実行
    const result = projectSchema.safeParse(input);

    // Then: 成功する
    expect(result.success).toBe(true);
  });

  test('idが不正なUUID形式の場合バリデーションが失敗する', () => {
    // Given: 不正なUUID形式のid
    const input = {
      id: 'not-a-uuid',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'プロジェクトA',
      description: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    };

    // When: バリデーションを実行
    const result = projectSchema.safeParse(input);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });
});
