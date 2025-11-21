import { describe, expect, test } from 'bun:test';
import { TaskTitle } from '../valueobjects/TaskTitle';

describe('TaskTitle', () => {
  describe('create静的ファクトリメソッド', () => {
    describe('正常系: 有効なタイトルでの生成', () => {
      test('有効なタイトル（1文字）で値オブジェクトが作成される', () => {
        // Given: 最小長の有効な文字列 'a'
        const input = 'a';

        // When: TaskTitle.create()を呼び出してインスタンスを生成
        const title = TaskTitle.create(input);

        // Then: TaskTitleインスタンスが生成され、getValue()が'a'を返す
        expect(title).toBeInstanceOf(TaskTitle);
        expect(title.getValue()).toBe('a');
      });

      test('有効なタイトル（50文字）で値オブジェクトが作成される', () => {
        // Given: 50文字の有効な文字列
        const input = 'a'.repeat(50);

        // When: TaskTitle.create()を呼び出してインスタンスを生成
        const title = TaskTitle.create(input);

        // Then: TaskTitleインスタンスが生成され、getValue()が50文字を返す
        expect(title).toBeInstanceOf(TaskTitle);
        expect(title.getValue()).toBe(input);
        expect(title.getValue().length).toBe(50);
      });

      test('有効なタイトル（100文字）で値オブジェクトが作成される', () => {
        // Given: 最大長の有効な文字列（100文字）
        const input = 'a'.repeat(100);

        // When: TaskTitle.create()を呼び出してインスタンスを生成
        const title = TaskTitle.create(input);

        // Then: TaskTitleインスタンスが生成され、getValue()が100文字を返す
        expect(title).toBeInstanceOf(TaskTitle);
        expect(title.getValue()).toBe(input);
        expect(title.getValue().length).toBe(100);
      });

      test('前後の空白がトリミングされる', () => {
        // Given: 前後に空白を含む文字列 '  タスクのタイトル  '
        const input = '  タスクのタイトル  ';

        // When: TaskTitle.create()を呼び出してインスタンスを生成
        const title = TaskTitle.create(input);

        // Then: トリミング後の値'タスクのタイトル'が保存される
        expect(title.getValue()).toBe('タスクのタイトル');
      });
    });

    describe('異常系: 不正なタイトルでのエラー', () => {
      test('空文字列でエラーがスローされる', () => {
        // Given: 空文字列
        const input = '';

        // When: TaskTitle.create()を呼び出す
        // Then: エラーがスローされ、エラーメッセージに「タイトルを入力してください」が含まれる
        expect(() => TaskTitle.create(input)).toThrow(
          'タイトルを入力してください',
        );
      });

      test('空白のみ（スペース）でエラーがスローされる', () => {
        // Given: 空白のみの文字列（スペース）
        const input = '   ';

        // When: TaskTitle.create()を呼び出す
        // Then: エラーがスローされる（トリミング後に空文字列となるため）
        expect(() => TaskTitle.create(input)).toThrow(
          'タイトルを入力してください',
        );
      });

      test('空白のみ（タブ）でエラーがスローされる', () => {
        // Given: 空白のみの文字列（タブ）
        const input = '\t\t\t';

        // When: TaskTitle.create()を呼び出す
        // Then: エラーがスローされる（トリミング後に空文字列となるため）
        expect(() => TaskTitle.create(input)).toThrow(
          'タイトルを入力してください',
        );
      });

      test('101文字以上でエラーがスローされる', () => {
        // Given: 101文字の文字列（最大長超過）
        const input = 'a'.repeat(101);

        // When: TaskTitle.create()を呼び出す
        // Then: エラーがスローされ、エラーメッセージに「タイトルは100文字以内で入力してください」が含まれる
        expect(() => TaskTitle.create(input)).toThrow(
          'タイトルは100文字以内で入力してください',
        );
      });

      test('nullでエラーがスローされる', () => {
        // Given: null値
        const input = null;

        // When: TaskTitle.create()を呼び出す
        // Then: エラーがスローされる
        expect(() => TaskTitle.create(input)).toThrow(
          'タイトルを入力してください',
        );
      });

      test('undefinedでエラーがスローされる', () => {
        // Given: undefined値
        const input = undefined;

        // When: TaskTitle.create()を呼び出す
        // Then: エラーがスローされる
        expect(() => TaskTitle.create(input)).toThrow(
          'タイトルを入力してください',
        );
      });

      test('数値型でエラーがスローされる', () => {
        // Given: 数値型
        const input = 123;

        // When: TaskTitle.create()を呼び出す
        // Then: エラーがスローされる
        expect(() => TaskTitle.create(input)).toThrow(
          'タイトルを入力してください',
        );
      });

      test('オブジェクト型でエラーがスローされる', () => {
        // Given: オブジェクト型
        const input = { title: 'タスク' };

        // When: TaskTitle.create()を呼び出す
        // Then: エラーがスローされる
        expect(() => TaskTitle.create(input)).toThrow(
          'タイトルを入力してください',
        );
      });
    });
  });

  describe('getValueメソッド', () => {
    test('値オブジェクトの値が取得できる', () => {
      // Given: TaskTitleインスタンス（'タスクのタイトル'で生成）
      const input = 'タスクのタイトル';
      const title = TaskTitle.create(input);

      // When: getValue()を呼び出す
      const value = title.getValue();

      // Then: 生成時に指定した値'タスクのタイトル'が返される
      expect(value).toBe('タスクのタイトル');
    });
  });

  describe('equalsメソッド', () => {
    test('値オブジェクトの等価性比較ができる', () => {
      // Given: 3つのTaskTitleインスタンス
      // title1とtitle2は同じ値'タスクA'、title3は異なる値'タスクB'
      const title1 = TaskTitle.create('タスクA');
      const title2 = TaskTitle.create('タスクA');
      const title3 = TaskTitle.create('タスクB');

      // When & Then: equals()を呼び出して等価性を判定
      // 同じ値を持つインスタンス同士はtrueを返す
      expect(title1.equals(title2)).toBe(true);
      // 異なる値を持つインスタンス同士はfalseを返す
      expect(title1.equals(title3)).toBe(false);
      // 同一インスタンス自身との比較はtrueを返す
      expect(title1.equals(title1)).toBe(true);
    });

    test('トリミング後の値で等価性比較される', () => {
      // Given: 空白を含むタイトルと含まないタイトル
      const title1 = TaskTitle.create('  タスクA  ');
      const title2 = TaskTitle.create('タスクA');

      // When & Then: equals()を呼び出して等価性を判定
      // トリミング後の値が同じなのでtrueを返す
      expect(title1.equals(title2)).toBe(true);
    });
  });
});
