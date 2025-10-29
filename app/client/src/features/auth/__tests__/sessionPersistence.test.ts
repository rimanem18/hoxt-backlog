import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { sessionPersistence } from '@/features/auth/services/sessionPersistence';
import type { User } from '@/features/auth/types/auth';

describe('sessionPersistence', () => {
  const mockUser: User = {
    id: 'test-user-id',
    externalId: 'test-external-id',
    provider: 'google',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: '2025-01-27T00:00:00Z',
    updatedAt: '2025-01-27T00:00:00Z',
    lastLoginAt: '2025-01-27T00:00:00Z',
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    mock.restore();
  });

  describe('save', () => {
    it('ユーザー情報をLocalStorageに保存できる', () => {
      // When: ユーザー情報を保存
      sessionPersistence.save(mockUser);

      // Then: LocalStorageに保存されている
      const stored = localStorage.getItem('auth_user');
      expect(stored).toBeDefined();
      if (stored) {
        expect(JSON.parse(stored)).toEqual(mockUser);
      }
    });

    it('LocalStorageエラー時に例外を握りつぶす', () => {
      // Given: LocalStorageが使用不可
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = mock(() => {
        throw new Error('Storage quota exceeded');
      });

      // When & Then: 例外が発生しない
      expect(() => sessionPersistence.save(mockUser)).not.toThrow();

      // Cleanup
      localStorage.setItem = originalSetItem;
    });
  });

  describe('load', () => {
    it('LocalStorageからユーザー情報を読み込める', () => {
      // Given: ユーザー情報が保存済み
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // When: ユーザー情報を読み込み
      const loaded = sessionPersistence.load();

      // Then: 保存したユーザー情報が取得できる
      expect(loaded).toEqual(mockUser);
    });

    it('LocalStorageが空の場合はnullを返す', () => {
      // Given: LocalStorageが空

      // When: ユーザー情報を読み込み
      const loaded = sessionPersistence.load();

      // Then: nullが返される
      expect(loaded).toBeNull();
    });

    it('不正なJSONの場合はnullを返す', () => {
      // Given: 不正なJSON
      localStorage.setItem('auth_user', 'invalid-json');

      // When: ユーザー情報を読み込み
      const loaded = sessionPersistence.load();

      // Then: nullが返される
      expect(loaded).toBeNull();
    });
  });

  describe('clear', () => {
    it('LocalStorageからユーザー情報を削除できる', () => {
      // Given: ユーザー情報が保存済み
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // When: ユーザー情報を削除
      sessionPersistence.clear();

      // Then: LocalStorageが空になる
      const stored = localStorage.getItem('auth_user');
      expect(stored).toBeNull();
    });
  });
});
