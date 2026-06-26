import { describe, expect, test } from 'bun:test';
import { InvalidProviderError } from '../errors/InvalidProviderError';
import { UserDomainError } from '../errors/UserDomainError';
import { UserNotFoundError } from '../errors/UserNotFoundError';

describe('UserDomainError', () => {
  test('基底エラークラスとして正しく動作する', () => {
    // UserDomainErrorは抽象クラスなので具象クラスを作成
    class TestDomainError extends UserDomainError {
      readonly code = 'TEST_ERROR';
    }

    const error = new TestDomainError('テストエラー');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UserDomainError);
    expect(error.message).toBe('テストエラー');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.name).toBe('TestDomainError');
  });
});

describe('UserNotFoundError', () => {
  test('デフォルトメッセージでエラーを作成できる', () => {
    const error = new UserNotFoundError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UserDomainError);
    expect(error).toBeInstanceOf(UserNotFoundError);
    expect(error.message).toBe('ユーザーが見つかりません');
    expect(error.code).toBe('USER_NOT_FOUND');
    expect(error.name).toBe('UserNotFoundError');
  });

  test('カスタムメッセージでエラーを作成できる', () => {
    const customMessage = 'カスタムエラーメッセージ';
    const error = new UserNotFoundError(customMessage);

    expect(error.message).toBe(customMessage);
    expect(error.code).toBe('USER_NOT_FOUND');
  });

  test('ユーザーID指定でエラーを作成できる', () => {
    const userId = 'user-123';
    const error = UserNotFoundError.forUserId(userId);

    expect(error).toBeInstanceOf(UserNotFoundError);
    expect(error.message).toBe(`ユーザーID '${userId}' が見つかりません`);
    expect(error.code).toBe('USER_NOT_FOUND');
  });

  test('外部ID指定でエラーを作成できる', () => {
    const externalId = 'google-123';
    const provider = 'google';
    const error = UserNotFoundError.forExternalId(externalId, provider);

    expect(error).toBeInstanceOf(UserNotFoundError);
    expect(error.message).toBe(
      `外部ID '${externalId}' (プロバイダー: ${provider}) のユーザーが見つかりません`,
    );
    expect(error.code).toBe('USER_NOT_FOUND');
  });
});

describe('InvalidProviderError', () => {
  test('デフォルトメッセージでエラーを作成できる', () => {
    const error = new InvalidProviderError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UserDomainError);
    expect(error).toBeInstanceOf(InvalidProviderError);
    expect(error.message).toBe('不正な認証プロバイダーです');
    expect(error.code).toBe('INVALID_PROVIDER');
    expect(error.name).toBe('InvalidProviderError');
  });

  test('カスタムメッセージでエラーを作成できる', () => {
    const customMessage = 'カスタムプロバイダーエラー';
    const error = new InvalidProviderError(customMessage);

    expect(error.message).toBe(customMessage);
    expect(error.code).toBe('INVALID_PROVIDER');
  });

  test('プロバイダー名指定でエラーを作成できる', () => {
    const provider = 'invalid-provider';
    const error = InvalidProviderError.forProvider(provider);

    expect(error).toBeInstanceOf(InvalidProviderError);
    expect(error.message).toBe(
      `認証プロバイダー '${provider}' はサポートされていません`,
    );
    expect(error.code).toBe('INVALID_PROVIDER');
  });

  test('有効プロバイダー一覧付きでエラーを作成できる', () => {
    const provider = 'invalid-provider';
    const validProviders = ['google', 'apple', 'microsoft'];
    const error = InvalidProviderError.withValidProviders(
      provider,
      validProviders,
    );

    expect(error).toBeInstanceOf(InvalidProviderError);
    expect(error.message).toBe(
      `認証プロバイダー '${provider}' はサポートされていません。有効なプロバイダー: ${validProviders.join(', ')}`,
    );
    expect(error.code).toBe('INVALID_PROVIDER');
  });
});
