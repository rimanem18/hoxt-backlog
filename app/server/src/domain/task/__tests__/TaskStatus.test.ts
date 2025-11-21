import { describe, expect, test } from 'bun:test';
import { TaskStatus } from '../valueobjects/TaskStatus';

describe('TaskStatus', () => {
  describe('create静的ファクトリメソッド', () => {
    describe('正常系: 有効なステータスでの生成', () => {
      test.each([
        'not_started',
        'in_progress',
        'in_review',
        'completed',
      ] as const)(
        '有効なステータス（%s）で値オブジェクトが作成される',
        (status) => {
          // Given: 有効なステータス値
          const input = status;

          // When: TaskStatus.create()を呼び出してインスタンスを生成
          const taskStatus = TaskStatus.create(input);

          // Then: TaskStatusインスタンスが生成され、getValue()が正しい値を返す
          expect(taskStatus).toBeInstanceOf(TaskStatus);
          expect(taskStatus.getValue()).toBe(status);
        },
      );
    });

    describe('異常系: 不正なステータスでのエラー', () => {
      test.each([
        'invalid',
        '',
        null,
        undefined,
        123,
        { status: 'in_progress' },
      ])('不正な値（%s）でエラーがスローされる', (input) => {
        // Given: 不正な値
        // When: TaskStatus.create()を呼び出す
        // Then: エラーがスローされ、エラーメッセージに「不正なステータスです」が含まれる
        expect(() => TaskStatus.create(input)).toThrow(/不正なステータスです:/);
      });
    });
  });

  describe('getValueメソッド', () => {
    test('値オブジェクトの値が取得できる', () => {
      // Given: TaskStatusインスタンス（'in_progress'で生成）
      const input = 'in_progress';
      const status = TaskStatus.create(input);

      // When: getValue()を呼び出す
      const value = status.getValue();

      // Then: 生成時に指定した値'in_progress'が返される
      expect(value).toBe('in_progress');
    });
  });

  describe('equalsメソッド', () => {
    test('値オブジェクトの等価性比較ができる', () => {
      // Given: 3つのTaskStatusインスタンス
      // status1とstatus2は同じ値'in_progress'、status3は異なる値'completed'
      const status1 = TaskStatus.create('in_progress');
      const status2 = TaskStatus.create('in_progress');
      const status3 = TaskStatus.create('completed');

      // When & Then: equals()を呼び出して等価性を判定
      // 同じ値を持つインスタンス同士はtrueを返す
      expect(status1.equals(status2)).toBe(true);
      // 異なる値を持つインスタンス同士はfalseを返す
      expect(status1.equals(status3)).toBe(false);
      // 同一インスタンス自身との比較はtrueを返す
      expect(status1.equals(status1)).toBe(true);
    });
  });

  describe('isCompletedメソッド', () => {
    test.each([
      { status: 'completed', expected: true },
      { status: 'not_started', expected: false },
      { status: 'in_progress', expected: false },
      { status: 'in_review', expected: false },
    ] as const)(
      'isCompleted()メソッドが$statusステータスで$expectedを返す',
      ({ status, expected }) => {
        // Given: 指定されたステータスのTaskStatusインスタンス
        const taskStatus = TaskStatus.create(status);

        // When: isCompleted()を呼び出す
        const result = taskStatus.isCompleted();

        // Then: 期待される結果が返される
        expect(result).toBe(expected);
      },
    );
  });
});
