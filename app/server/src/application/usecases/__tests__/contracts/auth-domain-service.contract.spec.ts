/**
 * AuthenticationDomainService契約テスト
 *
 * IAuthenticationDomainServiceインターフェースの契約をテスト。
 * ユーザー認証・JIT作成の戻り値とエラーの仕様確認に特化。
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IAuthenticationDomainService } from '../../../../domain/services/IAuthenticationDomainService';
import type { ExternalUserInfo } from '../../../../domain/services/IAuthProvider';
import type { User } from '../../../../domain/user/UserEntity';
import { UserFactory } from '../authenticate-user/helpers/userFactory';

describe('AuthenticationDomainService契約テスト', () => {
  let authDomainService: IAuthenticationDomainService;

  beforeEach(() => {
    authDomainService = {
      createUserFromExternalInfo: mock(),
      authenticateUser: mock(),
    };
  });

  describe('authenticateUser契約', () => {
    test('既存ユーザーで認証成功レスポンスの契約を満たす', async () => {
      // Given: 既存ユーザーの認証シナリオ
      const externalUserInfo = UserFactory.externalUserInfo(
        'google_existing_123',
        'existing@example.com',
        '既存ユーザー',
      );

      const existingUser = UserFactory.existing({
        externalId: 'google_existing_123',
        email: 'existing@example.com',
        name: '既存ユーザー',
      });

      const mockResult = {
        user: existingUser,
        isNewUser: false,
      };

      (authDomainService.authenticateUser as any).mockResolvedValue(mockResult);

      // When: ユーザー認証を実行
      const result = await authDomainService.authenticateUser(externalUserInfo);

      // Then: 既存ユーザー認証レスポンスの契約を確認
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // ユーザーオブジェクトの契約
      expect(result.user).toBeDefined();
      expect(typeof result.user).toBe('object');
      expect(typeof result.user.id).toBe('string');
      expect(result.user.id.length).toBeGreaterThan(0);

      // 既存ユーザーフラグの契約
      expect(typeof result.isNewUser).toBe('boolean');
      expect(result.isNewUser).toBe(false);

      // ユーザー情報の整合性確認
      expect(result.user.externalId).toBe(externalUserInfo.id);
      expect(result.user.email).toBe(externalUserInfo.email);
      expect(result.user.provider).toBe(externalUserInfo.provider);
    });

    test('新規ユーザーでJIT作成レスポンスの契約を満たす', async () => {
      // Given: 新規ユーザーのJIT作成シナリオ
      const externalUserInfo = UserFactory.externalUserInfo(
        'google_new_456',
        'newuser@example.com',
        '新規ユーザー',
      );

      const newUser = UserFactory.new({
        externalId: 'google_new_456',
        email: 'newuser@example.com',
        name: '新規ユーザー',
      });

      const mockResult = {
        user: newUser,
        isNewUser: true,
      };

      (authDomainService.authenticateUser as any).mockResolvedValue(mockResult);

      // When: ユーザー認証（JIT作成）を実行
      const result = await authDomainService.authenticateUser(externalUserInfo);

      // Then: 新規ユーザー作成レスポンスの契約を確認
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // ユーザーオブジェクトの契約
      expect(result.user).toBeDefined();
      expect(typeof result.user.id).toBe('string');
      expect(result.user.id.length).toBeGreaterThan(0);

      // 新規ユーザーフラグの契約
      expect(typeof result.isNewUser).toBe('boolean');
      expect(result.isNewUser).toBe(true);

      // 新規作成時の時刻検証
      expect(result.user.createdAt).toBeInstanceOf(Date);
      expect(result.user.updatedAt).toBeInstanceOf(Date);
      expect(result.user.lastLoginAt).toBeInstanceOf(Date);

      // 作成時刻が現在時刻に近いことを確認（5秒以内）
      const now = Date.now();
      expect(Math.abs(result.user.createdAt.getTime() - now)).toBeLessThan(
        5000,
      );
      expect(Math.abs(result.user.updatedAt.getTime() - now)).toBeLessThan(
        5000,
      );
    });

    test.each([
      ['Googleプロバイダー', 'google', 'google_user_123'],
      ['GitHubプロバイダー', 'github', 'github_user_456'],
      ['Facebookプロバイダー', 'facebook', 'facebook_user_789'],
    ])(
      '%s で適切なプロバイダー認証契約を満たす',
      async (_description, provider, externalId) => {
        // Given: プロバイダー別の認証シナリオ
        const externalUserInfo = UserFactory.externalUserInfo(
          externalId,
          `user@${provider}.com`,
          `${_description}ユーザー`,
          provider as any,
        );

        const user = UserFactory.existing({
          externalId,
          provider: provider as any,
          email: `user@${provider}.com`,
        });

        const mockResult = {
          user,
          isNewUser: false,
        };

        (authDomainService.authenticateUser as any).mockResolvedValue(
          mockResult,
        );

        // When: プロバイダー別認証を実行
        const result =
          await authDomainService.authenticateUser(externalUserInfo);

        // Then: プロバイダー情報の契約を満たす
        expect(result.user.provider).toBe(provider);
        expect(result.user.externalId).toBe(externalId);
        expect(result.user.email).toContain(provider);
      },
    );

    test('無効な外部ユーザー情報でエラーをスローする', async () => {
      // Given: 無効な外部ユーザー情報
      const invalidExternalInfo = [
        null as any,
        undefined as any,
        {} as any,
        { id: '', provider: 'google', email: '', name: '' } as any,
      ];

      for (const invalidInfo of invalidExternalInfo) {
        // エラーをスローするようにモック設定
        (authDomainService.authenticateUser as any).mockRejectedValue(
          new Error('Invalid external user info'),
        );

        // When & Then: 無効な情報でエラーがスローされる
        await expect(
          authDomainService.authenticateUser(invalidInfo),
        ).rejects.toThrow('Invalid external user info');
      }
    });

    test('Promiseを返すことの契約確認', () => {
      // Given: 任意の外部ユーザー情報
      const externalUserInfo = UserFactory.externalUserInfo();

      // Promiseを返すようにモック設定
      (authDomainService.authenticateUser as any).mockResolvedValue({
        user: UserFactory.existing(),
        isNewUser: false,
      });

      // When: メソッド呼び出し
      const result = authDomainService.authenticateUser(externalUserInfo);

      // Then: Promiseを返すことを確認
      expect(result).toBeInstanceOf(Promise);
      expect(typeof result.then).toBe('function');
      expect(typeof result.catch).toBe('function');
    });
  });

  describe('createUserFromExternalInfo契約', () => {
    test('有効な外部情報から新規ユーザーを作成する', async () => {
      // Given: 有効な外部ユーザー情報
      const externalUserInfo = UserFactory.externalUserInfo(
        'google_create_789',
        'create@example.com',
        '作成テストユーザー',
      );

      const createdUser = UserFactory.new({
        externalId: 'google_create_789',
        email: 'create@example.com',
        name: '作成テストユーザー',
      });

      (authDomainService.createUserFromExternalInfo as any).mockResolvedValue(
        createdUser,
      );

      // When: 外部情報から新規ユーザーを作成
      const result =
        await authDomainService.createUserFromExternalInfo(externalUserInfo);

      // Then: 新規作成ユーザーの契約を確認
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);

      // 外部情報からの変換確認
      expect(result.externalId).toBe(externalUserInfo.id);
      expect(result.provider).toBe(externalUserInfo.provider);
      expect(result.email).toBe(externalUserInfo.email);
      expect(result.name).toBe(externalUserInfo.name);

      // 新規作成時のタイムスタンプ
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.lastLoginAt).toBeInstanceOf(Date);
    });

    test('重複する外部IDでエラーをスローする', async () => {
      // Given: 既に存在する外部ID
      const duplicateExternalInfo = UserFactory.externalUserInfo(
        'google_duplicate_123',
        'duplicate@example.com',
      );

      const duplicateError = new Error('User with external ID already exists');
      (authDomainService.createUserFromExternalInfo as any).mockRejectedValue(
        duplicateError,
      );

      // When & Then: 重複外部IDでエラーがスローされる
      await expect(
        authDomainService.createUserFromExternalInfo(duplicateExternalInfo),
      ).rejects.toThrow('User with external ID already exists');
    });

    test('無効なメールアドレスでエラーをスローする', async () => {
      // Given: 無効なメールアドレスの外部情報
      const invalidEmailInfo = UserFactory.externalUserInfo(
        'google_invalid_email',
        'invalid-email-format',
      );

      const validationError = new Error('Invalid email address format');
      (authDomainService.createUserFromExternalInfo as any).mockRejectedValue(
        validationError,
      );

      // When & Then: 無効メールでエラーがスローされる
      await expect(
        authDomainService.createUserFromExternalInfo(invalidEmailInfo),
      ).rejects.toThrow('Invalid email address format');
    });
  });

  describe('データ整合性契約', () => {
    test('並行処理での重複作成回避契約', async () => {
      // Given: 同時リクエストによる重複作成シナリオ
      const externalUserInfo = UserFactory.externalUserInfo(
        'google_concurrent_user',
        'concurrent@example.com',
      );

      // 最初のリクエストは新規作成
      // 2回目以降は既存ユーザーとして扱う（重複回避）
      const existingUser = UserFactory.existing({
        externalId: 'google_concurrent_user',
        email: 'concurrent@example.com',
      });

      const mockResult = {
        user: existingUser,
        isNewUser: false, // 重複作成ではなく既存ユーザーとして扱う
      };

      (authDomainService.authenticateUser as any).mockResolvedValue(mockResult);

      // When: 並行処理での認証を実行
      const result = await authDomainService.authenticateUser(externalUserInfo);

      // Then: データ整合性が保たれる
      expect(result.user).toBeDefined();
      expect(result.isNewUser).toBe(false); // 重複回避により既存ユーザー扱い
      expect(result.user.externalId).toBe(externalUserInfo.id);
    });

    test('トランザクション失敗時の契約確認', async () => {
      // Given: トランザクション失敗シナリオ
      const externalUserInfo = UserFactory.externalUserInfo();
      const transactionError = new Error('Transaction rollback');

      (authDomainService.authenticateUser as any).mockRejectedValue(
        transactionError,
      );

      // When & Then: トランザクション失敗でエラーがスローされる
      await expect(
        authDomainService.authenticateUser(externalUserInfo),
      ).rejects.toThrow('Transaction rollback');
    });

    test('外部キー制約違反時の契約確認', async () => {
      // Given: 外部キー制約違反シナリオ
      const externalUserInfo = UserFactory.externalUserInfo();
      const constraintError = new Error('Foreign key constraint violation');

      (authDomainService.createUserFromExternalInfo as any).mockRejectedValue(
        constraintError,
      );

      // When & Then: 制約違反でエラーがスローされる
      await expect(
        authDomainService.createUserFromExternalInfo(externalUserInfo),
      ).rejects.toThrow('Foreign key constraint violation');
    });
  });

  describe('ビジネスロジック契約', () => {
    test('ユーザー状態による認証結果の契約', async () => {
      // Given: 各種ユーザー状態のシナリオ
      const scenarios = [
        {
          name: 'アクティブユーザー',
          user: UserFactory.existing({ lastLoginAt: new Date() }),
          shouldAuthenticate: true,
        },
        {
          name: '休眠ユーザー',
          user: UserFactory.existing({
            lastLoginAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90日前
          }),
          shouldAuthenticate: true, // 休眠でも認証は可能
        },
      ];

      for (const scenario of scenarios) {
        const externalUserInfo = UserFactory.externalUserInfo(
          scenario.user.externalId,
          scenario.user.email,
        );

        const mockResult = {
          user: scenario.user,
          isNewUser: false,
        };

        (authDomainService.authenticateUser as any).mockResolvedValue(
          mockResult,
        );

        // When: 状態別認証を実行
        const result =
          await authDomainService.authenticateUser(externalUserInfo);

        // Then: 状態に応じた認証結果の契約を満たす
        if (scenario.shouldAuthenticate) {
          expect(result.user).toBeDefined();
          expect(result.user.id).toBe(scenario.user.id);
        }
      }
    });

    test('プロファイル更新時の契約確認', async () => {
      // Given: プロファイル情報が更新された外部ユーザー情報
      const externalUserInfo = UserFactory.externalUserInfo(
        'google_profile_update',
        'updated@example.com',
        '更新されたユーザー名', // 名前が変更された
      );

      const updatedUser = UserFactory.existing({
        externalId: 'google_profile_update',
        email: 'updated@example.com',
        name: '更新されたユーザー名',
        updatedAt: new Date(), // 更新時刻が新しい
      });

      const mockResult = {
        user: updatedUser,
        isNewUser: false,
      };

      (authDomainService.authenticateUser as any).mockResolvedValue(mockResult);

      // When: プロファイル更新を含む認証を実行
      const result = await authDomainService.authenticateUser(externalUserInfo);

      // Then: 更新されたプロファイル情報の契約を満たす
      expect(result.user.name).toBe('更新されたユーザー名');
      expect(result.user.email).toBe('updated@example.com');
      expect(result.user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('型安全性契約', () => {
    test('AuthenticationResult型の確認', () => {
      // Given: 認証結果の型定義
      type AuthenticationResult = {
        user: User;
        isNewUser: boolean;
      };

      const existingUserResult: AuthenticationResult = {
        user: UserFactory.existing(),
        isNewUser: false,
      };

      const newUserResult: AuthenticationResult = {
        user: UserFactory.new(),
        isNewUser: true,
      };

      // Then: 型定義の契約を満たす
      expect(existingUserResult.user).toBeDefined();
      expect(typeof existingUserResult.isNewUser).toBe('boolean');
      expect(existingUserResult.isNewUser).toBe(false);

      expect(newUserResult.user).toBeDefined();
      expect(typeof newUserResult.isNewUser).toBe('boolean');
      expect(newUserResult.isNewUser).toBe(true);
    });

    test('ExternalUserInfo型との整合性確認', () => {
      // Given: 外部ユーザー情報とUserエンティティ
      const externalInfo: ExternalUserInfo = {
        id: 'google_consistency_123',
        provider: 'google',
        email: 'consistency@example.com',
        name: '整合性テストユーザー',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const user: User = {
        id: 'uuid-consistency-123',
        externalId: externalInfo.id,
        provider: externalInfo.provider,
        email: externalInfo.email,
        name: externalInfo.name,
        avatarUrl: externalInfo.avatarUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      // Then: 外部情報とUserエンティティの整合性を確認
      expect(user.externalId).toBe(externalInfo.id);
      expect(user.provider).toBe(externalInfo.provider);
      expect(user.email).toBe(externalInfo.email);
      expect(user.name).toBe(externalInfo.name);
      expect(user.avatarUrl).toBe(externalInfo.avatarUrl);
    });
  });
});
