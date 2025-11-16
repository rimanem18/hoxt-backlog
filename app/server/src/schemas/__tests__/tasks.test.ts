/**
 * tasks.ts スキーマのバリデーションテスト
 *
 * 生成されたZodスキーマが正しく動作することを確認する
 */

import { describe, expect, test } from 'bun:test';
import {
  type CreateTask,
  createTaskSchema,
  type InsertTask,
  insertTaskSchema,
  type SelectTask,
  selectTaskSchema,
  type TaskPriority,
  type TaskStatus,
  taskPrioritySchema,
  taskStatusSchema,
} from '../tasks';

describe('taskPrioritySchema', () => {
  test('有効な優先度を受け入れる', () => {
    expect(taskPrioritySchema.parse('high')).toBe('high');
    expect(taskPrioritySchema.parse('medium')).toBe('medium');
    expect(taskPrioritySchema.parse('low')).toBe('low');
  });

  test('無効な優先度を拒否する', () => {
    expect(() => taskPrioritySchema.parse('invalid')).toThrow();
    expect(() => taskPrioritySchema.parse('')).toThrow();
    expect(() => taskPrioritySchema.parse(null)).toThrow();
  });
});

describe('taskStatusSchema', () => {
  test('有効なステータスを受け入れる', () => {
    expect(taskStatusSchema.parse('not_started')).toBe('not_started');
    expect(taskStatusSchema.parse('in_progress')).toBe('in_progress');
    expect(taskStatusSchema.parse('in_review')).toBe('in_review');
    expect(taskStatusSchema.parse('completed')).toBe('completed');
  });

  test('無効なステータスを拒否する', () => {
    expect(() => taskStatusSchema.parse('invalid')).toThrow();
    expect(() => taskStatusSchema.parse('')).toThrow();
    expect(() => taskStatusSchema.parse(null)).toThrow();
  });
});

describe('createTaskSchema', () => {
  test('有効なタイトルを受け入れる', () => {
    const validData = { title: '有効なタスクタイトル' };
    const result = createTaskSchema.parse(validData);
    expect(result.title).toBe('有効なタスクタイトル');
  });

  test('最小文字数（1文字）のタイトルを受け入れる', () => {
    const validData = { title: 'A' };
    const result = createTaskSchema.parse(validData);
    expect(result.title).toBe('A');
  });

  test('最大文字数（100文字）のタイトルを受け入れる', () => {
    const validData = { title: 'A'.repeat(100) };
    const result = createTaskSchema.parse(validData);
    expect(result.title).toBe('A'.repeat(100));
  });

  test('空文字列トークンが適切に拒否される', () => {
    const invalidData = { title: '' };
    expect(() => createTaskSchema.parse(invalidData)).toThrow();
  });

  test('101文字以上のタイトルを拒否する', () => {
    const invalidData = { title: 'A'.repeat(101) };
    expect(() => createTaskSchema.parse(invalidData)).toThrow();
  });

  test('エラーメッセージが正しく設定される（最小文字数）', () => {
    const invalidData = { title: '' };
    try {
      createTaskSchema.parse(invalidData);
    } catch (error) {
      const zodError = error as { issues: Array<{ message: string }> };
      expect(zodError.issues[0]?.message).toBe('タイトルを入力してください');
    }
  });

  test('エラーメッセージが正しく設定される（最大文字数）', () => {
    const invalidData = { title: 'A'.repeat(101) };
    try {
      createTaskSchema.parse(invalidData);
    } catch (error) {
      const zodError = error as { issues: Array<{ message: string }> };
      expect(zodError.issues[0]?.message).toBe(
        'タイトルは100文字以内で入力してください',
      );
    }
  });
});

describe('selectTaskSchema', () => {
  test('有効なタスクデータを受け入れる', () => {
    const validData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'テストタスク',
      description: 'テスト説明',
      priority: 'high',
      status: 'not_started',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = selectTaskSchema.parse(validData);
    expect(result.title).toBe('テストタスク');
  });

  test('description が null を受け入れる', () => {
    const validData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'テストタスク',
      description: null,
      priority: 'medium',
      status: 'in_progress',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = selectTaskSchema.parse(validData);
    expect(result.description).toBeNull();
  });
});

describe('insertTaskSchema', () => {
  test('有効な挿入データを受け入れる', () => {
    const validData = {
      userId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'テストタスク',
      priority: 'high',
      status: 'not_started',
    };
    const result = insertTaskSchema.parse(validData);
    expect(result.title).toBe('テストタスク');
  });

  test('オプショナルフィールドなしでも受け入れる', () => {
    const validData = {
      userId: '123e4567-e89b-12d3-a456-426614174001',
      title: '最小限のタスク',
    };
    const result = insertTaskSchema.parse(validData);
    expect(result.title).toBe('最小限のタスク');
  });
});

describe('型定義のエクスポート', () => {
  test('TaskPriority型が正しくエクスポートされる', () => {
    const priority: TaskPriority = 'high';
    expect(priority).toBe('high');
  });

  test('TaskStatus型が正しくエクスポートされる', () => {
    const status: TaskStatus = 'in_progress';
    expect(status).toBe('in_progress');
  });

  test('CreateTask型が正しくエクスポートされる', () => {
    const createTask: CreateTask = {
      title: 'テストタスク',
    };
    expect(createTask.title).toBe('テストタスク');
  });

  test('SelectTask型が正しくエクスポートされる', () => {
    const selectTask: SelectTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'テストタスク',
      description: null,
      priority: 'medium',
      status: 'not_started',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(selectTask.title).toBe('テストタスク');
  });

  test('InsertTask型が正しくエクスポートされる', () => {
    const insertTask: InsertTask = {
      userId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'テストタスク',
    };
    expect(insertTask.title).toBe('テストタスク');
  });
});
