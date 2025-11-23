import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type {
  CreateUserInput,
  IUserRepository,
  UpdateUserInput,
  User,
} from '@/domain/user';
import { UserEntity, UserNotFoundError } from '@/domain/user';
import { UserAggregate } from '../UserAggregate';

/**
 * UserAggregate のテスト
 *
 * アグリゲートの整合性管理とビジネスルール適用を検証。
 * エンティティとリポジトリの協調動作をテストする。
 */
describe('UserAggregate', () => {
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    mockUserRepository = {
      findByExternalId: mock(async () => null),
      findById: mock(async () => null),
      findByEmail: mock(async () => null),
      create: mock(async () => ({}) as User),
      update: mock(async () => ({}) as User),
      delete: mock(async () => {}),
    };
  });

  describe('fromEntity', () => {
    test('既存のエンティティからアグリゲートを作成できる', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const userEntity = UserEntity.restore(mockUser);

      // Act
      const aggregate = UserAggregate.fromEntity(
        userEntity,
        mockUserRepository,
      );

      // Assert
      expect(aggregate).toBeInstanceOf(UserAggregate);
      expect(aggregate.getUser()).toBe(userEntity);
    });
  });

  describe('createNew', () => {
    test('新規ユーザーでアグリゲートを作成できる', async () => {
      // Arrange
      const createInput: CreateUserInput = {
        externalId: 'google-456',
        provider: 'google',
        email: 'newuser@example.com',
        name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const mockUser: User = {
        id: 'new-user-uuid',
        externalId: 'google-456',
        provider: 'google',
        email: 'newuser@example.com',
        name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      mockUserRepository.findByExternalId = mock(async () => null);
      mockUserRepository.create = mock(async () => mockUser);

      // Act
      const aggregate = await UserAggregate.createNew(
        createInput,
        mockUserRepository,
      );

      // Assert
      expect(aggregate).toBeInstanceOf(UserAggregate);
      expect(mockUserRepository.findByExternalId).toHaveBeenCalledWith(
        'google-456',
        'google',
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith(createInput);
    });

    test('同じ外部ID+プロバイダーのユーザーが存在する場合は既存ユーザーでアグリゲートを作成する', async () => {
      // Arrange
      const createInput: CreateUserInput = {
        externalId: 'google-123',
        provider: 'google',
        email: 'existing@example.com',
        name: 'Existing User',
      };

      const existingUser: User = {
        id: 'existing-user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'existing@example.com',
        name: 'Existing User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockUserRepository.findByExternalId = mock(async () => existingUser);

      // Act
      const aggregate = await UserAggregate.createNew(
        createInput,
        mockUserRepository,
      );

      // Assert
      expect(aggregate).toBeInstanceOf(UserAggregate);
      expect(mockUserRepository.findByExternalId).toHaveBeenCalledWith(
        'google-123',
        'google',
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    test('存在するユーザーIDでアグリゲートを取得できる', async () => {
      // Arrange
      const userId = 'existing-user-uuid';
      const mockUser: User = {
        id: userId,
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      mockUserRepository.findById = mock(async () => mockUser);

      // Act
      const aggregate = await UserAggregate.findById(
        userId,
        mockUserRepository,
      );

      // Assert
      expect(aggregate).toBeInstanceOf(UserAggregate);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    test('存在しないユーザーIDの場合はUserNotFoundErrorを投げる', async () => {
      // Arrange
      const userId = 'non-existent-user-uuid';
      mockUserRepository.findById = mock(async () => null);

      // Act & Assert
      expect(async () => {
        await UserAggregate.findById(userId, mockUserRepository);
      }).toThrow(UserNotFoundError);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('findByExternalId', () => {
    test('存在する外部IDでアグリゲートを取得できる', async () => {
      // Arrange
      const externalId = 'google-123';
      const provider = 'google';
      const mockUser: User = {
        id: 'user-uuid',
        externalId,
        provider,
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      mockUserRepository.findByExternalId = mock(async () => mockUser);

      // Act
      const aggregate = await UserAggregate.findByExternalId(
        externalId,
        provider,
        mockUserRepository,
      );

      // Assert
      expect(aggregate).toBeInstanceOf(UserAggregate);
      expect(mockUserRepository.findByExternalId).toHaveBeenCalledWith(
        externalId,
        provider,
      );
    });

    test('存在しない外部IDの場合はnullを返却する', async () => {
      // Arrange
      const externalId = 'non-existent-google-123';
      const provider = 'google';
      mockUserRepository.findByExternalId = mock(async () => null);

      // Act
      const result = await UserAggregate.findByExternalId(
        externalId,
        provider,
        mockUserRepository,
      );

      // Assert
      expect(result).toBeNull();
      expect(mockUserRepository.findByExternalId).toHaveBeenCalledWith(
        externalId,
        provider,
      );
    });
  });

  describe('updateUser', () => {
    test('ユーザー情報を更新できる', async () => {
      // Arrange
      const mockUser: User = {
        id: 'user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const userEntity = UserEntity.restore(mockUser);
      const aggregate = UserAggregate.fromEntity(
        userEntity,
        mockUserRepository,
      );

      const updateInput: UpdateUserInput = {
        name: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const updatedUser: User = {
        ...mockUser,
        name: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        updatedAt: new Date(),
      };

      mockUserRepository.update = mock(async () => updatedUser);

      // Act
      const result = await aggregate.updateUser(updateInput);

      // Assert
      expect(result.toObject()).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user-uuid',
        updateInput,
      );
    });
  });

  describe('recordLogin', () => {
    test('ログイン記録を更新できる', async () => {
      // Arrange
      const mockUser: User = {
        id: 'user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const userEntity = UserEntity.restore(mockUser);
      const aggregate = UserAggregate.fromEntity(
        userEntity,
        mockUserRepository,
      );

      const updatedUser: User = {
        ...mockUser,
        avatarUrl: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.update = mock(async () => updatedUser);

      // Act
      const result = await aggregate.recordLogin();

      // Assert
      expect(result.toObject()).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user-uuid',
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      );
    });
  });

  describe('deleteUser', () => {
    test('ユーザーを削除できる', async () => {
      // Arrange
      const mockUser: User = {
        id: 'user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const userEntity = UserEntity.restore(mockUser);
      const aggregate = UserAggregate.fromEntity(
        userEntity,
        mockUserRepository,
      );

      mockUserRepository.delete = mock(async () => {});

      // Act
      await aggregate.deleteUser();

      // Assert
      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-uuid');
    });
  });

  describe('ヘルパーメソッド', () => {
    test('getUser() でエンティティを取得できる', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const userEntity = UserEntity.restore(mockUser);
      const aggregate = UserAggregate.fromEntity(
        userEntity,
        mockUserRepository,
      );

      // Act
      const result = aggregate.getUser();

      // Assert
      expect(result).toBe(userEntity);
    });

    test('isNewUser() で新規ユーザー判定ができる', () => {
      // Arrange - 新規作成されたユーザー（1分以内）
      const recentDate = new Date(Date.now() - 30 * 1000); // 30秒前
      const mockUser: User = {
        id: 'user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: recentDate,
        updatedAt: recentDate,
        lastLoginAt: null,
      };

      const userEntity = UserEntity.restore(mockUser);
      const aggregate = UserAggregate.fromEntity(
        userEntity,
        mockUserRepository,
      );

      // Act
      const result = aggregate.isNewUser();

      // Assert
      expect(result).toBe(true);
    });

    test('getUserInfo() でユーザー情報オブジェクトを取得できる', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const userEntity = UserEntity.restore(mockUser);
      const aggregate = UserAggregate.fromEntity(
        userEntity,
        mockUserRepository,
      );

      // Act
      const result = aggregate.getUserInfo();

      // Assert
      expect(result).toEqual({
        id: 'user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        lastLoginAt: null,
      });
    });
  });
});
