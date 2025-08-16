import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { PostgreSQLUserRepository } from '../database/PostgreSQLUserRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';
import type { CreateUserInput, UpdateUserInput, AuthProvider } from '@/domain/user';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';

// テストデータ生成ヘルパー
function createTestUserInput(): CreateUserInput {
  return {
    externalId: `test_${Date.now()}_${Math.random()}`,
    provider: 'google' as AuthProvider,
    email: `test${Date.now()}${Math.random()}@example.com`,
    name: 'テストユーザー',
    avatarUrl: 'https://example.com/avatar.jpg'
  };
}

describe('PostgreSQLUserRepository統合テスト', () => {
  let repository: PostgreSQLUserRepository;

  beforeAll(async () => {
    // テストデータベース接続設定
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'test_db';
    process.env.DB_USER = 'test_user';
    process.env.DB_PASSWORD = 'test_password';
    process.env.DB_TABLE_PREFIX = 'test_';
    process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_db';

    repository = new PostgreSQLUserRepository();
  });

  afterAll(async () => {
    await DatabaseConnection.close();
  });

  beforeEach(async () => {
    // 各テスト前にデータクリーンアップ
    await cleanupTestData();
  });

  describe('findByExternalId', () => {
    test('存在する外部IDでユーザーが取得できること', async () => {
      // Given: データベースにテストユーザーを作成
      const testInput = createTestUserInput();
      const createdUser = await repository.create(testInput);

      // When: 外部IDで検索
      const foundUser = await repository.findByExternalId(
        testInput.externalId,
        testInput.provider
      );

      // Then: ユーザーが正しく取得される
      expect(foundUser).not.toBeNull();
      expect(foundUser!.externalId).toBe(testInput.externalId);
      expect(foundUser!.provider).toBe(testInput.provider);
      expect(foundUser!.email).toBe(testInput.email);
      expect(foundUser!.name).toBe(testInput.name);
    });

    test('存在しない外部IDでnullが返されること', async () => {
      // When: 存在しない外部IDで検索
      const foundUser = await repository.findByExternalId(
        'non_existent_id',
        'google'
      );

      // Then: nullが返される
      expect(foundUser).toBeNull();
    });

    test('異なるプロバイダーでは検索できないこと', async () => {
      // Given: Googleプロバイダーでユーザー作成
      const testInput = createTestUserInput();
      testInput.provider = 'google';
      await repository.create(testInput);

      // When: 同じ外部IDでAppleプロバイダーで検索
      const foundUser = await repository.findByExternalId(
        testInput.externalId,
        'apple' as AuthProvider
      );

      // Then: nullが返される
      expect(foundUser).toBeNull();
    });
  });

  describe('findById', () => {
    test('存在するIDでユーザーが取得できること', async () => {
      // Given: データベースにテストユーザーを作成
      const testInput = createTestUserInput();
      const createdUser = await repository.create(testInput);

      // When: IDで検索
      const foundUser = await repository.findById(createdUser.id);

      // Then: ユーザーが正しく取得される
      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(createdUser.email);
    });

    test('存在しないIDでnullが返されること', async () => {
      // Given: 存在しないUUID
      const nonExistentId = crypto.randomUUID();

      // When: 存在しないIDで検索
      const foundUser = await repository.findById(nonExistentId);

      // Then: nullが返される
      expect(foundUser).toBeNull();
    });

    test('不正なID形式でエラーが発生すること', async () => {
      // Given: 不正なID形式
      const invalidId = 'invalid-uuid-format';

      // When & Then: エラーが発生
      await expect(repository.findById(invalidId))
        .rejects.toThrow('無効なUUID形式です');
    });
  });

  describe('findByEmail', () => {
    test('存在するメールアドレスでユーザーが取得できること', async () => {
      // Given: データベースにテストユーザーを作成
      const testInput = createTestUserInput();
      const createdUser = await repository.create(testInput);

      // When: メールアドレスで検索
      const foundUser = await repository.findByEmail(testInput.email);

      // Then: ユーザーが正しく取得される
      expect(foundUser).not.toBeNull();
      expect(foundUser!.email).toBe(testInput.email);
      expect(foundUser!.id).toBe(createdUser.id);
    });

    test('存在しないメールアドレスでnullが返されること', async () => {
      // When: 存在しないメールアドレスで検索
      const foundUser = await repository.findByEmail('nonexistent@example.com');

      // Then: nullが返される
      expect(foundUser).toBeNull();
    });

    test('メールアドレスの大文字小文字が正しく処理されること', async () => {
      // Given: 小文字のメールアドレスでユーザー作成
      const testInput = createTestUserInput();
      testInput.email = 'test@example.com';
      await repository.create(testInput);

      // When: 大文字のメールアドレスで検索
      const foundUser = await repository.findByEmail('TEST@EXAMPLE.COM');

      // Then: 大文字小文字を区別せずに検索される
      expect(foundUser).not.toBeNull();
      expect(foundUser!.email).toBe('test@example.com');
    });
  });

  describe('create', () => {
    test('有効な入力でユーザーが正常に作成されること', async () => {
      // Given: 有効なユーザー作成入力
      const testInput = createTestUserInput();

      // When: ユーザーを作成
      const createdUser = await repository.create(testInput);

      // Then: ユーザーが正しく作成される
      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.externalId).toBe(testInput.externalId);
      expect(createdUser.provider).toBe(testInput.provider);
      expect(createdUser.email).toBe(testInput.email);
      expect(createdUser.name).toBe(testInput.name);
      expect(createdUser.avatarUrl).toBe(testInput.avatarUrl);
      expect(createdUser.createdAt).toBeInstanceOf(Date);
      expect(createdUser.updatedAt).toBeInstanceOf(Date);
      expect(createdUser.lastLoginAt).toBeNull();
    });

    test('重複する外部ID・プロバイダーでエラーが発生すること', async () => {
      // Given: 既存ユーザーと同じ外部ID・プロバイダー
      const testInput = createTestUserInput();

      // 最初のユーザーを作成
      await repository.create(testInput);

      // When & Then: 同じ外部ID・プロバイダーで再作成するとエラー
      const duplicateInput = { ...testInput, email: 'another@example.com' };
      await expect(repository.create(duplicateInput))
        .rejects.toThrow('外部IDとプロバイダーの組み合わせが既に存在します');
    });

    test('avatarUrlがnullでもユーザーが正常に作成されること', async () => {
      // Given: avatarUrlがnullの入力
      const testInput = createTestUserInput();
      delete testInput.avatarUrl;

      // When: ユーザーを作成
      const createdUser = await repository.create(testInput);

      // Then: avatarUrlがnullで作成される
      expect(createdUser.avatarUrl).toBeNull();
    });
  });

  describe('update', () => {
    test('存在するユーザーが正常に更新されること', async () => {
      // Given: 既存ユーザー
      const testInput = createTestUserInput();
      const createdUser = await repository.create(testInput);

      const updateInput: UpdateUserInput = {
        name: '更新されたユーザー名',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        lastLoginAt: new Date()
      };

      // When: ユーザーを更新
      const updatedUser = await repository.update(createdUser.id, updateInput);

      // Then: ユーザーが正しく更新される
      expect(updatedUser.id).toBe(createdUser.id);
      expect(updatedUser.name).toBe(updateInput.name);
      expect(updatedUser.avatarUrl).toBe(updateInput.avatarUrl);
      expect(updatedUser.lastLoginAt).toEqual(updateInput.lastLoginAt);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(createdUser.updatedAt.getTime());

      // 更新されない項目の確認
      expect(updatedUser.email).toBe(createdUser.email);
      expect(updatedUser.externalId).toBe(createdUser.externalId);
      expect(updatedUser.provider).toBe(createdUser.provider);
    });

    test('存在しないユーザーの更新でUserNotFoundErrorが発生すること', async () => {
      // Given: 存在しないユーザーID
      const nonExistentId = crypto.randomUUID();
      const updateInput: UpdateUserInput = { name: '更新名' };

      // When & Then: UserNotFoundErrorが発生
      await expect(repository.update(nonExistentId, updateInput))
        .rejects.toThrow(UserNotFoundError);
    });

    test('部分的な更新が正しく動作すること', async () => {
      // Given: 既存ユーザー
      const testInput = createTestUserInput();
      const createdUser = await repository.create(testInput);

      const updateInput: UpdateUserInput = {
        name: '更新されたユーザー名'
        // avatarUrl と lastLoginAt は更新しない
      };

      // When: 部分更新
      const updatedUser = await repository.update(createdUser.id, updateInput);

      // Then: 指定したフィールドのみ更新される
      expect(updatedUser.name).toBe(updateInput.name);
      expect(updatedUser.avatarUrl).toBe(createdUser.avatarUrl);
      expect(updatedUser.lastLoginAt).toBe(createdUser.lastLoginAt);
    });
  });

  describe('delete', () => {
    test('存在するユーザーが正常に削除されること', async () => {
      // Given: 既存ユーザー
      const testInput = createTestUserInput();
      const createdUser = await repository.create(testInput);

      // When: ユーザーを削除
      await repository.delete(createdUser.id);

      // Then: ユーザーが削除される
      const deletedUser = await repository.findById(createdUser.id);
      expect(deletedUser).toBeNull();
    });

    test('存在しないユーザーの削除でUserNotFoundErrorが発生すること', async () => {
      // Given: 存在しないユーザーID
      const nonExistentId = crypto.randomUUID();

      // When & Then: UserNotFoundErrorが発生
      await expect(repository.delete(nonExistentId))
        .rejects.toThrow(UserNotFoundError);
    });
  });
});

// テストデータクリーンアップ関数
async function cleanupTestData() {
  const client = await DatabaseConnection.getConnection();
  try {
    await client.query('DELETE FROM test_users WHERE email LIKE \'%@example.com\'');
  } catch (error) {
    // テーブルが存在しない場合などのエラーは無視
  }
  client.release();
}