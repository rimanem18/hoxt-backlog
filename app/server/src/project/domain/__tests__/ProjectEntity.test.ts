import { describe, expect, test } from 'bun:test';
import { InvalidProjectDataError } from '../errors';
import { ProjectEntity } from '../ProjectEntity';
import { ProjectName } from '../valueobjects/ProjectName';

describe('ProjectEntity', () => {
  // ==========================================================================
  // ファクトリメソッド: create（新規作成）
  // ==========================================================================
  describe('create', () => {
    test('説明文ありでプロジェクトが作成される', () => {
      // Given: 説明文ありのデータ
      const userId = 'user-uuid-123';
      const name = 'プロジェクト名';
      const description = 'プロジェクトの説明';

      // When: 新規プロジェクトを作成
      const project = ProjectEntity.create({ userId, name, description });

      // Then: プロジェクトが正しく作成される
      expect(project.getUserId()).toBe(userId);
      expect(project.getName()).toBe(name);
      expect(project.getDescription()).toBe(description);
    });

    test('説明文なしでプロジェクトが作成される', () => {
      // Given: 説明文なしのデータ
      const userId = 'user-uuid-123';
      const name = 'プロジェクト名';

      // When: 新規プロジェクトを作成
      const project = ProjectEntity.create({ userId, name });

      // Then: descriptionがnullで作成される
      expect(project.getUserId()).toBe(userId);
      expect(project.getName()).toBe(name);
      expect(project.getDescription()).toBeNull();
    });

    test('IDとタイムスタンプが自動生成される', () => {
      // Given: 最小限のデータ
      const userId = 'user-uuid-123';
      const name = 'プロジェクト名';

      // When: 新規プロジェクトを作成
      const project = ProjectEntity.create({ userId, name });

      // Then: IDとタイムスタンプが自動生成される
      expect(project.getId()).toBeDefined();
      expect(project.getId().length).toBeGreaterThan(0);
      expect(project.getCreatedAt()).toBeInstanceOf(Date);
      expect(project.getUpdatedAt()).toBeInstanceOf(Date);
    });

    test('不正な名前の場合、InvalidProjectDataErrorが伝播する', () => {
      // Given: 空文字列の名前
      const userId = 'user-uuid-123';
      const name = '';

      // When & Then: InvalidProjectDataErrorがスローされる
      expect(() => ProjectEntity.create({ userId, name })).toThrow(
        InvalidProjectDataError,
      );
    });
  });

  // ==========================================================================
  // ファクトリメソッド: reconstruct（DB復元）
  // ==========================================================================
  describe('reconstruct', () => {
    test('復元したプロジェクトのすべてのデータが保持される', () => {
      // Given: DBから取得したデータ
      const props = {
        id: 'project-uuid-456',
        userId: 'user-uuid-123',
        name: ProjectName.create('DBから復元されたプロジェクト'),
        description: 'マークダウン説明',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-02T00:00:00Z'),
      };

      // When: DBから復元
      const project = ProjectEntity.reconstruct(props);

      // Then: すべてのデータが保持される
      expect(project.getId()).toBe(props.id);
      expect(project.getUserId()).toBe(props.userId);
      expect(project.getName()).toBe('DBから復元されたプロジェクト');
      expect(project.getDescription()).toBe(props.description);
      expect(project.getCreatedAt()).toEqual(props.createdAt);
      expect(project.getUpdatedAt()).toEqual(props.updatedAt);
    });
  });

  // ==========================================================================
  // ゲッターメソッド
  // ==========================================================================
  describe('getters', () => {
    test('descriptionがnullの場合、nullが返される', () => {
      // Given: descriptionなしでプロジェクトを作成
      const project = ProjectEntity.create({
        userId: 'user-uuid-123',
        name: 'テストプロジェクト',
      });

      // Then: descriptionはnull
      expect(project.getDescription()).toBeNull();
    });
  });
});
