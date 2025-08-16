import { beforeEach, describe, expect, test } from 'bun:test';
import { AuthProviders } from '../AuthProvider';
import { InvalidProviderError } from '../errors/InvalidProviderError';
import type { CreateUserInput, UpdateUserInput } from '../index';
import { UserEntity } from '../UserEntity';

describe('UserEntity', () => {
  let validCreateInput: CreateUserInput;

  beforeEach(() => {
    validCreateInput = {
      externalId: 'google-123456789',
      provider: AuthProviders.GOOGLE,
      email: 'test@example.com',
      name: 'テストユーザー',
      avatarUrl: 'https://example.com/avatar.jpg',
    };
  });

  describe('create静的ファクトリメソッド', () => {
    test('正常な入力でユーザーエンティティを作成できる', () => {
      const user = UserEntity.create(validCreateInput);

      expect(user).toBeInstanceOf(UserEntity);
      expect(user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ); // UUID v4 format
      expect(user.externalId).toBe(validCreateInput.externalId);
      expect(user.provider).toBe(validCreateInput.provider);
      expect(user.email).toBe(validCreateInput.email);
      expect(user.name).toBe(validCreateInput.name);
      expect(user.avatarUrl).toBe(validCreateInput.avatarUrl);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.lastLoginAt).toBeNull();
    });

    test('アバターURLが未指定の場合nullになる', () => {
      const input = { ...validCreateInput };
      delete input.avatarUrl;

      const user = UserEntity.create(input);

      expect(user.avatarUrl).toBeNull();
    });

    test('不正なメールアドレスでエラーになる', () => {
      const input = { ...validCreateInput, email: 'invalid-email' };

      expect(() => UserEntity.create(input)).toThrow(
        'メールアドレスの形式が正しくありません',
      );
    });

    test('空文字列のメールアドレスでエラーになる', () => {
      const input = { ...validCreateInput, email: '' };

      expect(() => UserEntity.create(input)).toThrow(
        'メールアドレスは必須です',
      );
    });

    test('空文字列の表示名でエラーになる', () => {
      const input = { ...validCreateInput, name: '' };

      expect(() => UserEntity.create(input)).toThrow('表示名は必須です');
    });

    test('空文字列の外部IDでエラーになる', () => {
      const input = { ...validCreateInput, externalId: '' };

      expect(() => UserEntity.create(input)).toThrow('外部IDは必須です');
    });

    test('不正なプロバイダーでInvalidProviderErrorになる', () => {
      const input = { ...validCreateInput, provider: 'invalid' as never };

      expect(() => UserEntity.create(input)).toThrow(InvalidProviderError);
    });

    test('文字数制限を超える表示名でエラーになる', () => {
      const longName = 'あ'.repeat(101); // 100文字を超える
      const input = { ...validCreateInput, name: longName };

      expect(() => UserEntity.create(input)).toThrow(
        '表示名は100文字以内で入力してください',
      );
    });

    test('文字数制限を超えるメールアドレスでエラーになる', () => {
      const longEmail = `${'a'.repeat(250)}@example.com`; // 255文字を超える
      const input = { ...validCreateInput, email: longEmail };

      expect(() => UserEntity.create(input)).toThrow(
        'メールアドレスは255文字以内で入力してください',
      );
    });
  });

  describe('restore静的ファクトリメソッド', () => {
    test('既存データからユーザーエンティティを復元できる', () => {
      const restoreData = {
        id: 'existing-user-id',
        externalId: 'google-123',
        provider: AuthProviders.GOOGLE,
        email: 'existing@example.com',
        name: '既存ユーザー',
        avatarUrl: 'https://example.com/existing.jpg',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-06-01'),
        lastLoginAt: new Date('2023-07-01'),
      };

      const user = UserEntity.restore(restoreData);

      expect(user.id).toBe(restoreData.id);
      expect(user.externalId).toBe(restoreData.externalId);
      expect(user.provider).toBe(restoreData.provider);
      expect(user.email).toBe(restoreData.email);
      expect(user.name).toBe(restoreData.name);
      expect(user.avatarUrl).toBe(restoreData.avatarUrl);
      expect(user.createdAt).toEqual(restoreData.createdAt);
      expect(user.updatedAt).toEqual(restoreData.updatedAt);
      expect(user.lastLoginAt).toEqual(restoreData.lastLoginAt);
    });

    test('nullableフィールドがnullで復元できる', () => {
      const restoreData = {
        id: 'existing-user-id',
        externalId: 'google-123',
        provider: AuthProviders.GOOGLE,
        email: 'existing@example.com',
        name: '既存ユーザー',
        avatarUrl: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-06-01'),
        lastLoginAt: null,
      };

      const user = UserEntity.restore(restoreData);

      expect(user.avatarUrl).toBeNull();
      expect(user.lastLoginAt).toBeNull();
    });
  });

  describe('updateメソッド', () => {
    let user: UserEntity;

    beforeEach(() => {
      user = UserEntity.create(validCreateInput);
    });

    test('表示名を更新できる', () => {
      const updateInput: UpdateUserInput = {
        name: '更新された名前',
      };

      const originalUpdatedAt = user.updatedAt;

      // 時間差を作るために少し待つ
      setTimeout(() => {
        user.update(updateInput);

        expect(user.name).toBe('更新された名前');
        expect(user.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime(),
        );
      }, 10);
    });

    test('アバターURLを更新できる', () => {
      const updateInput: UpdateUserInput = {
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      user.update(updateInput);

      expect(user.avatarUrl).toBe('https://example.com/new-avatar.jpg');
    });

    test('アバターURLを空文字列にするとnullになる', () => {
      const updateInput: UpdateUserInput = {
        avatarUrl: '',
      };

      user.update(updateInput);

      expect(user.avatarUrl).toBeNull();
    });

    test('最終ログイン日時を更新できる', () => {
      const loginTime = new Date('2023-08-01T10:00:00Z');
      const updateInput: UpdateUserInput = {
        lastLoginAt: loginTime,
      };

      user.update(updateInput);

      expect(user.lastLoginAt).toEqual(loginTime);
    });

    test('複数のフィールドを同時に更新できる', () => {
      const updateInput: UpdateUserInput = {
        name: '複数更新名前',
        avatarUrl: 'https://example.com/multi-update.jpg',
      };

      user.update(updateInput);

      expect(user.name).toBe('複数更新名前');
      expect(user.avatarUrl).toBe('https://example.com/multi-update.jpg');
    });

    test('空文字列の表示名でエラーになる', () => {
      const updateInput: UpdateUserInput = {
        name: '',
      };

      expect(() => user.update(updateInput)).toThrow(
        '表示名は空文字列にできません',
      );
    });

    test('不正なアバターURLでエラーになる', () => {
      const updateInput: UpdateUserInput = {
        avatarUrl: 'invalid-url',
      };

      expect(() => user.update(updateInput)).toThrow(
        'アバターURLの形式が正しくありません',
      );
    });

    test('未来の最終ログイン日時でエラーになる', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後
      const updateInput: UpdateUserInput = {
        lastLoginAt: futureDate,
      };

      expect(() => user.update(updateInput)).toThrow(
        '最終ログイン日時は未来の日時にできません',
      );
    });
  });

  describe('recordLoginメソッド', () => {
    test('最終ログイン日時と更新日時が現在時刻に設定される', () => {
      const user = UserEntity.create(validCreateInput);
      const beforeLogin = new Date();

      user.recordLogin();

      const afterLogin = new Date();

      expect(user.lastLoginAt).not.toBeNull();
      expect(user.lastLoginAt?.getTime()).toBeGreaterThanOrEqual(
        beforeLogin.getTime(),
      );
      expect(user.lastLoginAt?.getTime()).toBeLessThanOrEqual(
        afterLogin.getTime(),
      );
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeLogin.getTime(),
      );
      expect(user.updatedAt.getTime()).toBeLessThanOrEqual(
        afterLogin.getTime(),
      );
    });
  });

  describe('isNewUserメソッド', () => {
    test('作成直後のユーザーはnewUserとして判定される', () => {
      const user = UserEntity.create(validCreateInput);

      expect(user.isNewUser()).toBe(true);
    });

    test('1分以前に作成されたユーザーはnewUserではない', () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 1000); // 2分前
      const user = UserEntity.restore({
        id: 'old-user',
        externalId: 'google-old',
        provider: AuthProviders.GOOGLE,
        email: 'old@example.com',
        name: '古いユーザー',
        createdAt: oldDate,
        updatedAt: oldDate,
      });

      expect(user.isNewUser()).toBe(false);
    });
  });

  describe('toObjectメソッド', () => {
    test('ユーザー情報をオブジェクト形式で取得できる', () => {
      const user = UserEntity.create(validCreateInput);
      const userObject = user.toObject();

      expect(userObject).toEqual({
        id: user.id,
        externalId: user.externalId,
        provider: user.provider,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      });
    });
  });
});
