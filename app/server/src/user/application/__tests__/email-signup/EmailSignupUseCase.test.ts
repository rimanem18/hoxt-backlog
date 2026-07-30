import { afterEach, describe, expect, mock, test } from 'bun:test';
import { EmailSignupUseCase } from '@/user/application/EmailSignupUseCase';
import type { IEmailSignupGateway } from '@/user/application/IEmailSignupGateway';
import type {
  CreateUserInput,
  IUserRepository,
  UpdateUserInput,
  User,
} from '@/user/domain';
import { EmailAlreadyRegisteredError } from '@/user/domain/errors/EmailAlreadyRegisteredError';
import { EmailAlreadyRegisteredGoogleError } from '@/user/domain/errors/EmailAlreadyRegisteredGoogleError';
import { SignupFailedError } from '@/user/domain/errors/SignupFailedError';

// ─── テスト用ヘルパー ───────────────────────────────────────────────────────

function makeUser(provider: 'google' | 'email'): User {
  return {
    id: 'user-id-1',
    externalId: 'external-id-1',
    provider,
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };
}

function makeUserRepository(
  findByEmailResult: User | null = null,
): IUserRepository {
  return {
    findByExternalId: mock((_externalId: string, _provider: string) =>
      Promise.resolve(null),
    ),
    findById: mock((_id: string) => Promise.resolve(null)),
    findByEmail: mock((_email: string) => Promise.resolve(findByEmailResult)),
    create: mock((_input: CreateUserInput) => Promise.resolve({} as User)),
    update: mock((_id: string, _input: UpdateUserInput) =>
      Promise.resolve({} as User),
    ),
    delete: mock((_id: string) => Promise.resolve()),
  } satisfies IUserRepository;
}

function makeSignupGateway(
  result: { userId: string | null; error: Error | null } = {
    userId: 'new-user-id',
    error: null,
  },
): IEmailSignupGateway {
  return {
    signUp: mock((_email: string, _password: string) =>
      Promise.resolve(result),
    ),
  } satisfies IEmailSignupGateway;
}

function makeSUT(
  userRepository: IUserRepository,
  signupGateway: IEmailSignupGateway,
): EmailSignupUseCase {
  return new EmailSignupUseCase(userRepository, signupGateway);
}

// ─── テストスイート ────────────────────────────────────────────────────────

describe('EmailSignupUseCase', () => {
  afterEach(() => {
    mock.restore();
  });

  describe('正常系', () => {
    test('既存ユーザーが存在しない場合、signUp が呼ばれ pendingEmailConfirmation:true を返す', async () => {
      // Given: app DB にユーザーが存在しない
      const userRepository = makeUserRepository(null);
      const signupGateway = makeSignupGateway({
        userId: 'new-user-id',
        error: null,
      });
      const sut = makeSUT(userRepository, signupGateway);

      // When: サインアップを実行
      const result = await sut.execute({
        email: 'newuser@example.com',
        password: 'Password1!',
      });

      // Then: pendingEmailConfirmation: true を返す
      expect(result).toEqual({ pendingEmailConfirmation: true });
      expect(signupGateway.signUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('異常系', () => {
    test('既存 Google ユーザーが存在する場合、EmailAlreadyRegisteredGoogleError を throw し signUp は呼ばれない', async () => {
      // Given: app DB に google プロバイダーのユーザーが存在する
      const userRepository = makeUserRepository(makeUser('google'));
      const signupGateway = makeSignupGateway();
      const sut = makeSUT(userRepository, signupGateway);

      // When & Then: 実行すると EmailAlreadyRegisteredGoogleError が throw される
      await expect(
        sut.execute({ email: 'existing@example.com', password: 'Password1!' }),
      ).rejects.toThrow(EmailAlreadyRegisteredGoogleError);
      expect(signupGateway.signUp).not.toHaveBeenCalled();
    });

    test('既存 email ユーザーが存在する場合、EmailAlreadyRegisteredError を throw し signUp は呼ばれない', async () => {
      // Given: app DB に email プロバイダーのユーザーが存在する
      const userRepository = makeUserRepository(makeUser('email'));
      const signupGateway = makeSignupGateway();
      const sut = makeSUT(userRepository, signupGateway);

      // When & Then: 実行すると EmailAlreadyRegisteredError が throw される
      await expect(
        sut.execute({ email: 'existing@example.com', password: 'Password1!' }),
      ).rejects.toThrow(EmailAlreadyRegisteredError);
      expect(signupGateway.signUp).not.toHaveBeenCalled();
    });

    test('Supabase signUp が失敗した場合、SignupFailedError を throw する', async () => {
      // Given: app DB にユーザーが存在しないが Supabase がエラーを返す
      const userRepository = makeUserRepository(null);
      const signupGateway = makeSignupGateway({
        userId: null,
        error: new Error('Supabase error'),
      });
      const sut = makeSUT(userRepository, signupGateway);

      // When & Then: 実行すると SignupFailedError が throw される
      await expect(
        sut.execute({ email: 'user@example.com', password: 'Password1!' }),
      ).rejects.toThrow(SignupFailedError);
    });
  });

  describe('境界値', () => {
    test('大文字混じりメールアドレスが正規化されて findByEmail と signUp に渡される', async () => {
      // Given: 大文字混じりのメールアドレス
      const userRepository = makeUserRepository(null);
      const signupGateway = makeSignupGateway();
      const sut = makeSUT(userRepository, signupGateway);

      // When: 大文字混じりのメールでサインアップ実行
      await sut.execute({ email: 'User@EXAMPLE.com', password: 'Password1!' });

      // Then: 正規化済みのメールアドレスで findByEmail と signUp が呼ばれる
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'user@example.com',
      );
      expect(signupGateway.signUp).toHaveBeenCalledWith(
        'user@example.com',
        'Password1!',
      );
    });

    test('前後空白ありのメールアドレスが正規化されて重複チェックに使われる', async () => {
      // Given: 前後空白があるメールアドレス
      const userRepository = makeUserRepository(null);
      const signupGateway = makeSignupGateway();
      const sut = makeSUT(userRepository, signupGateway);

      // When: 前後空白ありのメールでサインアップ実行
      await sut.execute({
        email: '  spaceduser@example.com  ',
        password: 'Password1!',
      });

      // Then: trim 済みのメールアドレスで findByEmail が呼ばれる
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'spaceduser@example.com',
      );
    });
  });
});
