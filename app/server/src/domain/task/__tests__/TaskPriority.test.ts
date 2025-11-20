import { describe, expect, test } from 'bun:test';
import { TaskPriority } from '../valueobjects/TaskPriority';

describe('TaskPriority', () => {
  describe('create静的ファクトリメソッド', () => {
    describe('正常系: 有効な優先度での生成', () => {
      test('有効な優先度（high）で値オブジェクトが作成される', () => {
        // Given: 高優先度を表す有効な文字列 'high'
        const input = 'high';

        // When: TaskPriority.create()を呼び出してインスタンスを生成
        const priority = TaskPriority.create(input);

        // Then: TaskPriorityインスタンスが生成され、getValue()が'high'を返す
        expect(priority).toBeInstanceOf(TaskPriority);
        expect(priority.getValue()).toBe('high');
      });

      test('有効な優先度（medium）で値オブジェクトが作成される', () => {
        // Given: 中優先度を表す有効な文字列 'medium'（デフォルト値）
        const input = 'medium';

        // When: TaskPriority.create()を呼び出してインスタンスを生成
        const priority = TaskPriority.create(input);

        // Then: TaskPriorityインスタンスが生成され、getValue()が'medium'を返す
        expect(priority).toBeInstanceOf(TaskPriority);
        expect(priority.getValue()).toBe('medium');
      });

      test('有効な優先度（low）で値オブジェクトが作成される', () => {
        // Given: 低優先度を表す有効な文字列 'low'
        const input = 'low';

        // When: TaskPriority.create()を呼び出してインスタンスを生成
        const priority = TaskPriority.create(input);

        // Then: TaskPriorityインスタンスが生成され、getValue()が'low'を返す
        expect(priority).toBeInstanceOf(TaskPriority);
        expect(priority.getValue()).toBe('low');
      });
    });

    describe('異常系: 不正な優先度でのエラー', () => {
      test('不正な優先度（invalid）でエラーがスローされる', () => {
        // Given: 有効値以外の文字列 'invalid'
        const input = 'invalid';

        // When: TaskPriority.create()を呼び出す
        // Then: エラーがスローされ、不正な値と許容値が示される
        expect(() => TaskPriority.create(input)).toThrow(
          '不正な優先度です: invalid (許容値: high, medium, low)',
        );
      });

      test('空文字列でエラーがスローされる', () => {
        // Given: 空文字列
        const input = '';

        // When: TaskPriority.create()を呼び出す
        // Then: エラーがスローされ、許容値が示される
        expect(() => TaskPriority.create(input)).toThrow(
          '不正な優先度です:  (許容値: high, medium, low)',
        );
      });

      test('nullでエラーがスローされる', () => {
        // Given: null値
        const input = null;

        // When: TaskPriority.create()を呼び出す
        // Then: エラーがスローされ、許容値が示される
        expect(() => TaskPriority.create(input)).toThrow(
          '不正な優先度です: null (許容値: high, medium, low)',
        );
      });

      test('undefinedでエラーがスローされる', () => {
        // Given: undefined値
        const input = undefined;

        // When: TaskPriority.create()を呼び出す
        // Then: エラーがスローされ、許容値が示される
        expect(() => TaskPriority.create(input)).toThrow(
          '不正な優先度です: undefined (許容値: high, medium, low)',
        );
      });
    });
  });

  describe('getValueメソッド', () => {
    test('値オブジェクトの値が取得できる', () => {
      // Given: TaskPriorityインスタンス（'high'で生成）
      const input = 'high';
      const priority = TaskPriority.create(input);

      // When: getValue()を呼び出す
      const value = priority.getValue();

      // Then: 生成時に指定した値'high'が返される
      expect(value).toBe('high');
    });
  });

  describe('equalsメソッド', () => {
    test('値オブジェクトの等価性比較ができる', () => {
      // Given: 3つのTaskPriorityインスタンス
      // priority1とpriority2は同じ値'high'、priority3は異なる値'medium'
      const priority1 = TaskPriority.create('high');
      const priority2 = TaskPriority.create('high');
      const priority3 = TaskPriority.create('medium');

      // When & Then: equals()を呼び出して等価性を判定
      // 同じ値を持つインスタンス同士はtrueを返す
      expect(priority1.equals(priority2)).toBe(true);
      // 異なる値を持つインスタンス同士はfalseを返す
      expect(priority1.equals(priority3)).toBe(false);
      // 同一インスタンス自身との比較はtrueを返す
      expect(priority1.equals(priority1)).toBe(true);
    });
  });
});
