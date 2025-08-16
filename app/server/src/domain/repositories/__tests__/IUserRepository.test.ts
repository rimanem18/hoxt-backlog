import { describe, expect, test } from 'bun:test';
import type {
  AuthProvider,
  CreateUserInput,
  UpdateUserInput,
  User,
} from '../../user';
import type { IUserRepository } from '../IUserRepository';

/**
 * IUserRepositoryインターフェースのテスト
 *
 * このテストは、インターフェースの仕様を検証し、
 * 将来の実装クラスが満たすべき契約を明確にする。
 * 実際の実装テストは Infrastructure 層で行う。
 */
describe('IUserRepository インターフェース仕様', () => {
  test('インターフェースの型定義が正しいことを確認', () => {
    // TypeScriptの型チェックで検証されるため、
    // コンパイルが通ることを確認するダミーテスト
    const dummyRepository: IUserRepository = {
      findByExternalId: async () => null,
      findById: async () => null,
      findByEmail: async () => null,
      create: async () => ({}) as User,
      update: async () => ({}) as User,
      delete: async () => {},
    };

    expect(dummyRepository).toBeDefined();
  });

  test('findByExternalId メソッドのシグネチャが正しい', () => {
    const mockRepository: IUserRepository = {
      findByExternalId: async (
        externalId: string,
        provider: AuthProvider,
      ): Promise<User | null> => {
        expect(typeof externalId).toBe('string');
        expect([
          'google',
          'apple',
          'microsoft',
          'github',
          'facebook',
          'line',
        ]).toContain(provider);
        return null;
      },
      findById: async () => null,
      findByEmail: async () => null,
      create: async () => ({}) as User,
      update: async () => ({}) as User,
      delete: async () => {},
    };

    expect(mockRepository.findByExternalId).toBeFunction();
  });

  test('findById メソッドのシグネチャが正しい', () => {
    const mockRepository: IUserRepository = {
      findByExternalId: async () => null,
      findById: async (id: string): Promise<User | null> => {
        expect(typeof id).toBe('string');
        return null;
      },
      findByEmail: async () => null,
      create: async () => ({}) as User,
      update: async () => ({}) as User,
      delete: async () => {},
    };

    expect(mockRepository.findById).toBeFunction();
  });

  test('findByEmail メソッドのシグネチャが正しい', () => {
    const mockRepository: IUserRepository = {
      findByExternalId: async () => null,
      findById: async () => null,
      findByEmail: async (email: string): Promise<User | null> => {
        expect(typeof email).toBe('string');
        return null;
      },
      create: async () => ({}) as User,
      update: async () => ({}) as User,
      delete: async () => {},
    };

    expect(mockRepository.findByEmail).toBeFunction();
  });

  test('create メソッドのシグネチャが正しい', () => {
    const mockRepository: IUserRepository = {
      findByExternalId: async () => null,
      findById: async () => null,
      findByEmail: async () => null,
      create: async (input: CreateUserInput): Promise<User> => {
        expect(input).toHaveProperty('externalId');
        expect(input).toHaveProperty('provider');
        expect(input).toHaveProperty('email');
        expect(input).toHaveProperty('name');
        return {} as User;
      },
      update: async () => ({}) as User,
      delete: async () => {},
    };

    expect(mockRepository.create).toBeFunction();
  });

  test('update メソッドのシグネチャが正しい', () => {
    const mockRepository: IUserRepository = {
      findByExternalId: async () => null,
      findById: async () => null,
      findByEmail: async () => null,
      create: async () => ({}) as User,
      update: async (id: string, input: UpdateUserInput): Promise<User> => {
        expect(typeof id).toBe('string');
        expect(typeof input).toBe('object');
        return {} as User;
      },
      delete: async () => {},
    };

    expect(mockRepository.update).toBeFunction();
  });

  test('delete メソッドのシグネチャが正しい', () => {
    const mockRepository: IUserRepository = {
      findByExternalId: async () => null,
      findById: async () => null,
      findByEmail: async () => null,
      create: async () => ({}) as User,
      update: async () => ({}) as User,
      delete: async (id: string): Promise<void> => {
        expect(typeof id).toBe('string');
      },
    };

    expect(mockRepository.delete).toBeFunction();
  });
});
