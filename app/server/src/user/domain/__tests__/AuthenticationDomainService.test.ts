import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IUserRepository, User } from '@/user/domain';
import { InvalidProviderError } from '@/user/domain';
import { AuthenticationDomainService } from '../services/AuthenticationDomainService';
import type { ExternalUserInfo } from '../services/IAuthProvider';

/**
 * AuthenticationDomainService のテスト
 *
 * ドメインサービスのビジネスロジックを検証。
 * 特にJITプロビジョニングと認証フローのテストに焦点を当てる。
 */
describe('AuthenticationDomainService', () => {
  let authenticationService: AuthenticationDomainService;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    // モックユーザーリポジトリを作成
    mockUserRepository = {
      findByExternalId: mock(async () => null),
      findById: mock(async () => null),
      findByEmail: mock(async () => null),
      create: mock(async () => ({}) as User),
      update: mock(async () => ({}) as User),
      delete: mock(async () => {}),
    };

    authenticationService = new AuthenticationDomainService(mockUserRepository);
  });

  describe('createUserFromExternalInfo', () => {
    test('有効な外部ユーザー情報で新規ユーザーを作成できる', async () => {
      // Arrange
      const externalInfo: ExternalUserInfo = {
        id: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

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

      mockUserRepository.findByExternalId = mock(async () => null);
      mockUserRepository.create = mock(async () => mockUser);

      // Act
      const result =
        await authenticationService.createUserFromExternalInfo(externalInfo);

      // Assert
      expect(result.toObject()).toEqual(mockUser);
      expect(mockUserRepository.findByExternalId).toHaveBeenCalledWith(
        'google-123',
        'google',
      );
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    test('既存ユーザーが存在する場合は既存ユーザーを返却する', async () => {
      // Arrange
      const externalInfo: ExternalUserInfo = {
        id: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
      };

      const existingUser: User = {
        id: 'existing-user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockUserRepository.findByExternalId = mock(async () => existingUser);

      // Act
      const result =
        await authenticationService.createUserFromExternalInfo(externalInfo);

      // Assert
      expect(result.toObject()).toEqual(existingUser);
      expect(mockUserRepository.findByExternalId).toHaveBeenCalledWith(
        'google-123',
        'google',
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    test('不正なプロバイダーの場合はInvalidProviderErrorを投げる', async () => {
      // Arrange
      const externalInfo: ExternalUserInfo = {
        id: 'invalid-123',
        provider: 'invalid-provider',
        email: 'test@example.com',
        name: 'Test User',
      };

      // Act & Assert
      expect(async () => {
        await authenticationService.createUserFromExternalInfo(externalInfo);
      }).toThrow(InvalidProviderError);
    });

    test('外部プロバイダーのメールアドレスが前後空白・大文字混じりでも正規化されて永続化される', async () => {
      // Given: 前後空白と大文字混じりのメールアドレスを含む外部ユーザー情報
      const externalInfo: ExternalUserInfo = {
        id: 'google-789',
        provider: 'google',
        email: '  Mixed.Case@Example.com ',
        name: 'Test User',
      };

      mockUserRepository.findByExternalId = mock(async () => null);
      mockUserRepository.create = mock(async () => ({}) as User);

      // When: JITプロビジョニングを実行
      await authenticationService.createUserFromExternalInfo(externalInfo);

      // Then: 正規化済みのメールアドレスでユーザーが作成される
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'mixed.case@example.com' }),
      );
    });
  });

  describe('authenticateUser', () => {
    test('既存ユーザーの認証が成功する', async () => {
      // Arrange
      const externalInfo: ExternalUserInfo = {
        id: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
      };

      const existingUser: User = {
        id: 'existing-user-uuid',
        externalId: 'google-123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      const updatedUser: User = {
        ...existingUser,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findByExternalId = mock(async () => existingUser);
      mockUserRepository.update = mock(async () => updatedUser);

      // Act
      const result = await authenticationService.authenticateUser(externalInfo);

      // Assert
      expect(result.user.toObject()).toEqual(updatedUser);
      expect(result.isNewUser).toBe(false);
      expect(mockUserRepository.findByExternalId).toHaveBeenCalledWith(
        'google-123',
        'google',
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        existingUser.id,
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      );
    });

    test('新規ユーザーのJITプロビジョニングが成功する', async () => {
      // Arrange
      const externalInfo: ExternalUserInfo = {
        id: 'google-456',
        provider: 'google',
        email: 'newuser@example.com',
        name: 'New User',
      };

      const newUser: User = {
        id: 'new-user-uuid',
        externalId: 'google-456',
        provider: 'google',
        email: 'newuser@example.com',
        name: 'New User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const updatedUser: User = {
        ...newUser,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      };

      // 最初の検索では見つからない
      mockUserRepository.findByExternalId = mock()
        .mockReturnValueOnce(Promise.resolve(null)) // authenticateUser内の検索
        .mockReturnValueOnce(Promise.resolve(null)); // createUserFromExternalInfo内の検索

      mockUserRepository.create = mock(async () => newUser);
      mockUserRepository.update = mock(async () => updatedUser);

      // Act
      const result = await authenticationService.authenticateUser(externalInfo);

      // Assert
      expect(result.user.toObject()).toEqual(updatedUser);
      expect(result.isNewUser).toBe(true);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        newUser.id,
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      );
    });

    test('不正なプロバイダーの場合はInvalidProviderErrorを投げる', async () => {
      // Arrange
      const externalInfo: ExternalUserInfo = {
        id: 'invalid-123',
        provider: 'unknown-provider',
        email: 'test@example.com',
        name: 'Test User',
      };

      // Act & Assert
      expect(async () => {
        await authenticationService.authenticateUser(externalInfo);
      }).toThrow(InvalidProviderError);
    });

    test('findByExternalId で見つからないが findByEmail で同一メールの既存ユーザーが見つかる場合、既存ユーザーを返し isNewUser=false になること', async () => {
      // Given: findByExternalId は null を返すが、findByEmail は既存 Google ユーザーを返す
      const existingGoogleUser: User = {
        id: 'existing-google-user-uuid',
        externalId: 'google-abc',
        provider: 'google',
        email: 'shared@example.com',
        name: 'Google User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      const updatedUser: User = {
        ...existingGoogleUser,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findByExternalId = mock(async () => null);
      mockUserRepository.findByEmail = mock(async () => existingGoogleUser);
      mockUserRepository.update = mock(async () => updatedUser);

      const externalInfo: ExternalUserInfo = {
        id: 'email-user-sub',
        provider: 'email',
        email: 'shared@example.com',
        name: 'Google User',
      };

      // When: email プロバイダーで authenticateUser を呼ぶ
      const result = await authenticationService.authenticateUser(externalInfo);

      // Then: 既存 Google ユーザーが返され、isNewUser は false
      expect(result.user.toObject()).toEqual(updatedUser);
      expect(result.isNewUser).toBe(false);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'shared@example.com',
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('プロバイダー検証', () => {
    test('有効なプロバイダーを正しく判定する', async () => {
      const validProviders = [
        'google',
        'apple',
        'microsoft',
        'github',
        'facebook',
        'line',
        'email',
      ];

      for (const provider of validProviders) {
        const externalInfo: ExternalUserInfo = {
          id: 'test-123',
          provider,
          email: 'test@example.com',
          name: 'Test User',
        };

        mockUserRepository.findByExternalId = mock(async () => null);
        mockUserRepository.create = mock(async () => ({}) as User);

        // プロバイダーが有効なのでエラーが投げられないことを確認
        await expect(
          authenticationService.createUserFromExternalInfo(externalInfo),
        ).resolves.toBeDefined();
      }
    });

    test('無効なプロバイダーを正しく判定する', async () => {
      const invalidProviders = ['twitter', 'discord', 'linkedin', 'unknown'];

      for (const provider of invalidProviders) {
        const externalInfo: ExternalUserInfo = {
          id: 'test-123',
          provider,
          email: 'test@example.com',
          name: 'Test User',
        };

        // プロバイダーが無効なのでエラーが投げられることを確認
        await expect(
          authenticationService.createUserFromExternalInfo(externalInfo),
        ).rejects.toThrow(InvalidProviderError);
      }
    });
  });
});
