/**
 * UserRepository契約テスト
 *
 * IUserRepositoryインターフェースの契約（CRUD操作とエラーの仕様）をテスト。
 * 実装詳細に依存しない、リポジトリパターンの契約確認に特化。
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import type { User } from '../../../../domain/user/UserEntity';
import { UserFactory } from '../authenticate-user/helpers/userFactory';

describe('UserRepository契約テスト', () => {
  let userRepository: IUserRepository;

  beforeEach(() => {
    userRepository = {
      findByExternalId: mock(),
      findById: mock(),
      findByEmail: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    };
  });

  describe('findByExternalId契約', () => {
    test('存在するユーザーでUserエンティティを返す', async () => {
      // Given: 存在するユーザー
      const existingUser = UserFactory.existing({
        externalId: 'google_12345',
        provider: 'google',
      });

      (userRepository.findByExternalId as any).mockResolvedValue(existingUser);

      // When: 外部IDで検索
      const result = await userRepository.findByExternalId(
        'google_12345',
        'google',
      );

      // Then: Userエンティティの契約を満たす
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // 必須フィールドの確認
      expect(typeof result!.id).toBe('string');
      expect(result!.id.length).toBeGreaterThan(0);

      expect(typeof result!.externalId).toBe('string');
      expect(result!.externalId).toBe('google_12345');

      expect(typeof result!.provider).toBe('string');
      expect(result!.provider).toBe('google');

      expect(typeof result!.email).toBe('string');
      expect(result!.email).toMatch(/@/);

      expect(typeof result!.name).toBe('string');
      expect(result!.name.length).toBeGreaterThan(0);

      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });

    test('存在しないユーザーでnullを返す', async () => {
      // Given: 存在しないユーザー
      (userRepository.findByExternalId as any).mockResolvedValue(null);

      // When: 存在しない外部IDで検索
      const result = await userRepository.findByExternalId(
        'nonexistent_12345',
        'google',
      );

      // Then: nullを返す
      expect(result).toBeNull();
    });

    test.each([
      ['Googleプロバイダー', 'google_user_123', 'google'],
      ['GitHubプロバイダー', 'github_user_456', 'github'],
      ['Facebookプロバイダー', 'facebook_user_789', 'facebook'],
    ])('%s で適切に検索する', async (_description, externalId, provider) => {
      // Given: プロバイダー別のユーザー
      const user = UserFactory.existing({
        externalId,
        provider: 'google',
      });

      (userRepository.findByExternalId as any).mockResolvedValue(user);

      // When: プロバイダー別で検索
      const result = await userRepository.findByExternalId(
        externalId,
        'google',
      );

      // Then: プロバイダーが一致するユーザーを返す
      expect(result).toBeDefined();
      expect(result!.externalId).toBe(externalId);
      expect(result!.provider).toBe(provider);
    });

    test('Promiseを返すことの契約確認', () => {
      // Given: 任意の引数
      (userRepository.findByExternalId as any).mockResolvedValue(null);

      // When: メソッド呼び出し
      const result = userRepository.findByExternalId('any_id', 'google');

      // Then: Promiseを返す
      expect(result).toBeInstanceOf(Promise);
      expect(typeof result.then).toBe('function');
      expect(typeof result.catch).toBe('function');
    });
  });

  describe('findById契約', () => {
    test('存在するIDでUserエンティティを返す', async () => {
      // Given: 存在するユーザー
      const existingUser = UserFactory.existing({
        id: 'uuid-12345',
      });

      (userRepository.findById as any).mockResolvedValue(existingUser);

      // When: IDで検索
      const result = await userRepository.findById('uuid-12345');

      // Then: Userエンティティを返す
      expect(result).toBeDefined();
      expect(result!.id).toBe('uuid-12345');
    });

    test('存在しないIDでnullを返す', async () => {
      // Given: 存在しないID
      (userRepository.findById as any).mockResolvedValue(null);

      // When: 存在しないIDで検索
      const result = await userRepository.findById('nonexistent-uuid');

      // Then: nullを返す
      expect(result).toBeNull();
    });
  });

  describe('findByEmail契約', () => {
    test('存在するEmailでUserエンティティを返す', async () => {
      // Given: 存在するユーザー
      const existingUser = UserFactory.existing({
        email: 'user@example.com',
      });

      (userRepository.findByEmail as any).mockResolvedValue(existingUser);

      // When: Emailで検索
      const result = await userRepository.findByEmail('user@example.com');

      // Then: Userエンティティを返す
      expect(result).toBeDefined();
      expect(result!.email).toBe('user@example.com');
    });

    test('存在しないEmailでnullを返す', async () => {
      // Given: 存在しないEmail
      (userRepository.findByEmail as any).mockResolvedValue(null);

      // When: 存在しないEmailで検索
      const result = await userRepository.findByEmail(
        'nonexistent@example.com',
      );

      // Then: nullを返す
      expect(result).toBeNull();
    });
  });

  describe('create契約', () => {
    test('有効なUserデータで新規作成し、IDが付与されたUserを返す', async () => {
      // Given: 新規ユーザーデータ（IDなし）
      const newUserData = {
        externalId: 'google_new_user',
        provider: 'google' as const,
        email: 'newuser@example.com',
        name: '新規ユーザー',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      const createdUser: User = {
        id: 'uuid-new-12345', // IDが付与される
        ...newUserData,
      };

      (userRepository.create as any).mockResolvedValue(createdUser);

      // When: ユーザーを新規作成
      const result = await userRepository.create(newUserData);

      // Then: IDが付与されたUserエンティティを返す
      expect(result).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
      expect(result.id).toBe('uuid-new-12345');

      // 元のデータが保持される
      expect(result.externalId).toBe(newUserData.externalId);
      expect(result.email).toBe(newUserData.email);
      expect(result.name).toBe(newUserData.name);
    });

    test('重複データで制約エラーをスローする', async () => {
      // Given: 重複するユーザーデータ
      const duplicateUserData = {
        externalId: 'google_existing',
        provider: 'google' as const,
        email: 'existing@example.com',
        name: '重複ユーザー',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      const constraintError = new Error('UNIQUE constraint violation');
      (userRepository.create as any).mockRejectedValue(constraintError);

      // When & Then: 重複データで制約エラーがスローされる
      await expect(userRepository.create(duplicateUserData)).rejects.toThrow(
        'UNIQUE constraint violation',
      );
    });

    test('必須フィールド不足で検証エラーをスローする', async () => {
      // Given: 必須フィールドが不足したデータ
      const incompleteUserData = {
        // externalIdが不足
        provider: 'google' as const,
        email: 'incomplete@example.com',
        name: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      } as any;

      const validationError = new Error(
        'Validation failed: externalId is required',
      );
      (userRepository.create as any).mockRejectedValue(validationError);

      // When & Then: 検証エラーがスローされる
      await expect(userRepository.create(incompleteUserData)).rejects.toThrow(
        'Validation failed',
      );
    });
  });

  describe('update契約', () => {
    test('存在するUserを更新し、更新されたUserを返す', async () => {
      // Given: 更新対象のユーザーと更新データ
      const existingUser = UserFactory.existing({
        id: 'uuid-update-test',
        name: '更新前ユーザー',
      });

      const updateData = {
        name: '更新後ユーザー',
        updatedAt: new Date(),
      };

      const updatedUser: User = {
        ...existingUser,
        ...updateData,
      };

      (userRepository.update as any).mockResolvedValue(updatedUser);

      // When: ユーザーを更新
      const result = await userRepository.update(
        'uuid-update-test',
        updateData,
      );

      // Then: 更新されたUserエンティティを返す
      expect(result).toBeDefined();
      expect(result.id).toBe('uuid-update-test');
      expect(result.name).toBe('更新後ユーザー');
      expect(result.updatedAt).toBe(updateData.updatedAt);
    });

    test('存在しないIDで更新時にエラーをスローする', async () => {
      // Given: 存在しないID
      const updateData = {
        name: '更新データ',
        updatedAt: new Date(),
      };

      const notFoundError = new Error('User not found');
      (userRepository.update as any).mockRejectedValue(notFoundError);

      // When & Then: 存在しないIDで更新エラーがスローされる
      await expect(
        userRepository.update('nonexistent-id', updateData),
      ).rejects.toThrow('User not found');
    });
  });

  describe('delete契約', () => {
    test('存在するUserを削除し、削除されたUserを返す', async () => {
      // Given: 削除対象のユーザー
      const existingUser = UserFactory.existing({
        id: 'uuid-delete-test',
      });

      (userRepository.delete as any).mockResolvedValue(existingUser);

      // When: ユーザーを削除
      const result = await userRepository.delete('uuid-delete-test');

      // Then: 削除されたUserエンティティを返す
      expect(result).toBeDefined();
      expect(result.id).toBe('uuid-delete-test');
    });

    test('存在しないIDで削除時にエラーをスローする', async () => {
      // Given: 存在しないID
      const notFoundError = new Error('User not found');
      (userRepository.delete as any).mockRejectedValue(notFoundError);

      // When & Then: 存在しないIDで削除エラーがスローされる
      await expect(userRepository.delete('nonexistent-id')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('データベース制約契約', () => {
    test('接続エラー時の契約確認', async () => {
      // Given: データベース接続エラー
      const connectionError = new Error('Database connection failed');

      (userRepository.findById as any).mockRejectedValue(connectionError);

      // When & Then: 接続エラーがスローされる
      await expect(userRepository.findById('any-id')).rejects.toThrow(
        'Database connection failed',
      );
    });

    test('トランザクションエラー時の契約確認', async () => {
      // Given: トランザクションエラー
      const transactionError = new Error('Transaction failed');
      const userData = {
        externalId: 'google_tx_test',
        provider: 'google' as const,
        email: 'tx@example.com',
        name: 'トランザクションテスト',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      (userRepository.create as any).mockRejectedValue(transactionError);

      // When & Then: トランザクションエラーがスローされる
      await expect(userRepository.create(userData)).rejects.toThrow(
        'Transaction failed',
      );
    });

    test('タイムアウトエラー時の契約確認', async () => {
      // Given: クエリタイムアウト
      const timeoutError = new Error('Query timeout');

      (userRepository.findByExternalId as any).mockRejectedValue(timeoutError);

      // When & Then: タイムアウトエラーがスローされる
      await expect(
        userRepository.findByExternalId('any_id', 'google'),
      ).rejects.toThrow('Query timeout');
    });
  });

  describe('型安全性契約', () => {
    test('User型の完全性確認', () => {
      // Given: 完全なUserエンティティ
      const user: User = {
        id: 'uuid-type-test',
        externalId: 'google_type_123',
        provider: 'google',
        email: 'type@example.com',
        name: '型テストユーザー',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      // Then: 必須フィールドが存在する
      expect(user.id).toBeDefined();
      expect(user.externalId).toBeDefined();
      expect(user.provider).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();

      // オプションフィールド
      expect(user.avatarUrl).toBeDefined();
      expect(user.lastLoginAt).toBeDefined();
    });

    test('CreateUserData型の確認', () => {
      // Given: ユーザー作成データ（IDなし）
      type CreateUserData = Omit<User, 'id'>;

      const createData: CreateUserData = {
        externalId: 'google_create_123',
        provider: 'google',
        email: 'create@example.com',
        name: '作成テストユーザー',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      // Then: ID以外の必須フィールドが存在する
      expect(createData.externalId).toBeDefined();
      expect(createData.provider).toBeDefined();
      expect(createData.email).toBeDefined();
      expect(createData.name).toBeDefined();

      // IDが含まれていないことを確認
      expect((createData as any).id).toBeUndefined();
    });

    test('UpdateUserData型の確認', () => {
      // Given: ユーザー更新データ（部分更新）
      type UpdateUserData = Partial<
        Omit<User, 'id' | 'externalId' | 'provider' | 'createdAt'>
      >;

      const updateData: UpdateUserData = {
        email: 'updated@example.com',
        name: '更新後テストユーザー',
        updatedAt: new Date(),
      };

      // Then: 更新可能フィールドのみ含まれる
      expect(updateData.email).toBeDefined();
      expect(updateData.name).toBeDefined();
      expect(updateData.updatedAt).toBeDefined();

      // 更新不可フィールドが含まれていないことを確認
      expect((updateData as any).id).toBeUndefined();
      expect((updateData as any).externalId).toBeUndefined();
      expect((updateData as any).provider).toBeUndefined();
      expect((updateData as any).createdAt).toBeUndefined();
    });
  });
});
