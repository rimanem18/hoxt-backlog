import { describe, expect, test } from 'bun:test';
import { InvalidProjectDataError } from '../errors';
import { ProjectName } from '../valueobjects/ProjectName';

describe('ProjectName', () => {
  describe('create静的ファクトリメソッド', () => {
    describe('正常系: 有効な名前での生成', () => {
      test('有効な名前（1文字）で値オブジェクトが作成される', () => {
        // Given: 最小長の有効な文字列 'a'
        const input = 'a';

        // When: ProjectName.create()を呼び出してインスタンスを生成
        const name = ProjectName.create(input);

        // Then: ProjectNameインスタンスが生成され、getValue()が'a'を返す
        expect(name).toBeInstanceOf(ProjectName);
        expect(name.getValue()).toBe('a');
      });

      test('有効な名前（100文字）で値オブジェクトが作成される', () => {
        // Given: 最大長の有効な文字列（100文字）
        const input = 'a'.repeat(100);

        // When: ProjectName.create()を呼び出してインスタンスを生成
        const name = ProjectName.create(input);

        // Then: ProjectNameインスタンスが生成され、getValue()が100文字を返す
        expect(name).toBeInstanceOf(ProjectName);
        expect(name.getValue()).toBe(input);
        expect(name.getValue().length).toBe(100);
      });

      test('前後の空白がトリミングされる', () => {
        // Given: 前後に空白を含む文字列 '  プロジェクト名  '
        const input = '  プロジェクト名  ';

        // When: ProjectName.create()を呼び出してインスタンスを生成
        const name = ProjectName.create(input);

        // Then: トリミング後の値'プロジェクト名'が保存される
        expect(name.getValue()).toBe('プロジェクト名');
      });
    });

    describe('異常系: 不正な名前でのエラー', () => {
      test('空文字列でInvalidProjectDataErrorがスローされる', () => {
        // Given: 空文字列
        const input = '';

        // When & Then: InvalidProjectDataErrorがスローされる
        expect(() => ProjectName.create(input)).toThrow(
          InvalidProjectDataError,
        );
      });

      test('空白のみ（スペース）でInvalidProjectDataErrorがスローされる', () => {
        // Given: 空白のみの文字列（スペース）
        const input = '   ';

        // When & Then: InvalidProjectDataErrorがスローされる（トリミング後に空文字列となるため）
        expect(() => ProjectName.create(input)).toThrow(
          InvalidProjectDataError,
        );
      });

      test('101文字以上でInvalidProjectDataErrorがスローされる', () => {
        // Given: 101文字の文字列（最大長超過）
        const input = 'a'.repeat(101);

        // When & Then: InvalidProjectDataErrorがスローされる
        expect(() => ProjectName.create(input)).toThrow(
          InvalidProjectDataError,
        );
      });

      test('nullでInvalidProjectDataErrorがスローされる', () => {
        // Given: null値
        const input = null;

        // When & Then: InvalidProjectDataErrorがスローされる
        expect(() => ProjectName.create(input)).toThrow(
          InvalidProjectDataError,
        );
      });

      test('undefinedでInvalidProjectDataErrorがスローされる', () => {
        // Given: undefined値
        const input = undefined;

        // When & Then: InvalidProjectDataErrorがスローされる
        expect(() => ProjectName.create(input)).toThrow(
          InvalidProjectDataError,
        );
      });
    });

    describe('境界値', () => {
      test('100文字ちょうどは正常に生成できる', () => {
        // Given: 100文字の文字列
        const input = 'a'.repeat(100);

        // When & Then: エラーがスローされない
        expect(() => ProjectName.create(input)).not.toThrow();
      });

      test('101文字はエラーになる', () => {
        // Given: 101文字の文字列
        const input = 'a'.repeat(101);

        // When & Then: エラーがスローされる
        expect(() => ProjectName.create(input)).toThrow();
      });
    });
  });

  describe('getValueメソッド', () => {
    test('値オブジェクトの値が取得できる', () => {
      // Given: ProjectNameインスタンス（'プロジェクト名'で生成）
      const input = 'プロジェクト名';
      const name = ProjectName.create(input);

      // When: getValue()を呼び出す
      const value = name.getValue();

      // Then: 生成時に指定した値'プロジェクト名'が返される
      expect(value).toBe('プロジェクト名');
    });
  });

  describe('equalsメソッド', () => {
    test('値オブジェクトの等価性比較ができる', () => {
      // Given: 3つのProjectNameインスタンス
      // name1とname2は同じ値'プロジェクトA'、name3は異なる値'プロジェクトB'
      const name1 = ProjectName.create('プロジェクトA');
      const name2 = ProjectName.create('プロジェクトA');
      const name3 = ProjectName.create('プロジェクトB');

      // When & Then: equals()を呼び出して等価性を判定
      expect(name1.equals(name2)).toBe(true);
      expect(name1.equals(name3)).toBe(false);
      expect(name1.equals(name1)).toBe(true);
    });
  });
});
