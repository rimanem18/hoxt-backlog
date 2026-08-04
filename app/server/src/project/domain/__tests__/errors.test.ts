import { describe, expect, test } from 'bun:test';
import {
  InvalidProjectDataError,
  ProjectDomainError,
  ProjectNotFoundError,
} from '../errors';

describe('ProjectDomainError', () => {
  test('ProjectDomainErrorを継承したエラーはinstanceofチェックが正しく動作する', () => {
    // Given: InvalidProjectDataErrorのインスタンス
    const error = new InvalidProjectDataError('テストエラーメッセージ');

    // Then: ProjectDomainErrorのinstanceofがtrue
    expect(error instanceof ProjectDomainError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('InvalidProjectDataError', () => {
  test('nameプロパティが"InvalidProjectDataError"である', () => {
    // Given: メッセージを指定してエラーを生成
    const error = new InvalidProjectDataError('テストエラーメッセージ');

    // Then: nameが正しい
    expect(error.name).toBe('InvalidProjectDataError');
  });

  test('codeプロパティが"INVALID_PROJECT_DATA"である', () => {
    // Given: メッセージを指定してエラーを生成
    const error = new InvalidProjectDataError('テストエラーメッセージ');

    // Then: codeが正しい
    expect(error.code).toBe('INVALID_PROJECT_DATA');
  });

  test('コンストラクタで任意のメッセージを設定できる', () => {
    // Given: カスタムメッセージ
    const customMessage = '名前を入力してください';

    // When: エラーを生成
    const error = new InvalidProjectDataError(customMessage);

    // Then: メッセージが設定される
    expect(error.message).toBe(customMessage);
  });

  test('ProjectDomainErrorのinstanceofチェックが正しい', () => {
    // Given: InvalidProjectDataErrorのインスタンス
    const error = new InvalidProjectDataError('テスト');

    // Then: ProjectDomainErrorのinstanceofがtrue
    expect(error instanceof ProjectDomainError).toBe(true);
  });
});

describe('ProjectNotFoundError', () => {
  test('nameプロパティが"ProjectNotFoundError"である', () => {
    // Given: プロジェクトIDを指定してエラーを生成
    const error = new ProjectNotFoundError('test-project-id');

    // Then: nameが正しい
    expect(error.name).toBe('ProjectNotFoundError');
  });

  test('codeプロパティが"PROJECT_NOT_FOUND"である', () => {
    // Given: プロジェクトIDを指定してエラーを生成
    const error = new ProjectNotFoundError('test-project-id');

    // Then: codeが正しい
    expect(error.code).toBe('PROJECT_NOT_FOUND');
  });

  test('コンストラクタで正しいメッセージが設定される', () => {
    // Given: プロジェクトID
    const projectId = 'abc-123-def';

    // When: エラーを生成
    const error = new ProjectNotFoundError(projectId);

    // Then: メッセージが正しいフォーマット
    expect(error.message).toBe(`プロジェクトが見つかりません: ${projectId}`);
  });

  test('forProjectIdファクトリメソッドが正しく動作する', () => {
    // Given: プロジェクトID
    const projectId = 'factory-project-id';

    // When: ファクトリメソッドでエラーを生成
    const error = ProjectNotFoundError.forProjectId(projectId);

    // Then: 正しいインスタンスが生成される
    expect(error).toBeInstanceOf(ProjectNotFoundError);
    expect(error.message).toBe(`プロジェクトが見つかりません: ${projectId}`);
  });

  test('ProjectDomainErrorのinstanceofチェックが正しい', () => {
    // Given: ProjectNotFoundErrorのインスタンス
    const error = new ProjectNotFoundError('test-id');

    // Then: ProjectDomainErrorのinstanceofがtrue
    expect(error instanceof ProjectDomainError).toBe(true);
  });
});
