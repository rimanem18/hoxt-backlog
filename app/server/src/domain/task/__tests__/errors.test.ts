import { describe, expect, test } from 'bun:test';
import {
  InvalidTaskDataError,
  TaskAccessDeniedError,
  TaskDomainError,
  TaskNotFoundError,
} from '../errors';

describe('TaskDomainError', () => {
  test('TaskDomainErrorを継承したエラーはinstanceofチェックが正しく動作する', () => {
    // Given: TaskNotFoundErrorのインスタンス
    const error = new TaskNotFoundError('test-task-id');

    // Then: TaskDomainErrorのinstanceofがtrue
    expect(error instanceof TaskDomainError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('TaskNotFoundError', () => {
  test('nameプロパティが"TaskNotFoundError"である', () => {
    // Given: タスクIDを指定してエラーを生成
    const error = new TaskNotFoundError('test-task-id');

    // Then: nameが正しい
    expect(error.name).toBe('TaskNotFoundError');
  });

  test('codeプロパティが"TASK_NOT_FOUND"である', () => {
    // Given: タスクIDを指定してエラーを生成
    const error = new TaskNotFoundError('test-task-id');

    // Then: codeが正しい
    expect(error.code).toBe('TASK_NOT_FOUND');
  });

  test('コンストラクタで正しいメッセージが設定される', () => {
    // Given: タスクID
    const taskId = 'abc-123-def';

    // When: エラーを生成
    const error = new TaskNotFoundError(taskId);

    // Then: メッセージが正しいフォーマット
    expect(error.message).toBe(`タスクが見つかりません: ${taskId}`);
  });

  test('forTaskIdファクトリメソッドが正しく動作する', () => {
    // Given: タスクID
    const taskId = 'factory-task-id';

    // When: ファクトリメソッドでエラーを生成
    const error = TaskNotFoundError.forTaskId(taskId);

    // Then: 正しいインスタンスが生成される
    expect(error).toBeInstanceOf(TaskNotFoundError);
    expect(error.message).toBe(`タスクが見つかりません: ${taskId}`);
  });
});

describe('InvalidTaskDataError', () => {
  test('nameプロパティが"InvalidTaskDataError"である', () => {
    // Given: メッセージを指定してエラーを生成
    const error = new InvalidTaskDataError('テストエラーメッセージ');

    // Then: nameが正しい
    expect(error.name).toBe('InvalidTaskDataError');
  });

  test('codeプロパティが"INVALID_TASK_DATA"である', () => {
    // Given: メッセージを指定してエラーを生成
    const error = new InvalidTaskDataError('テストエラーメッセージ');

    // Then: codeが正しい
    expect(error.code).toBe('INVALID_TASK_DATA');
  });

  test('コンストラクタで任意のメッセージを設定できる', () => {
    // Given: カスタムメッセージ
    const customMessage = 'タイトルを入力してください';

    // When: エラーを生成
    const error = new InvalidTaskDataError(customMessage);

    // Then: メッセージが設定される
    expect(error.message).toBe(customMessage);
  });

  test('TaskDomainErrorのinstanceofチェックが正しい', () => {
    // Given: InvalidTaskDataErrorのインスタンス
    const error = new InvalidTaskDataError('テスト');

    // Then: TaskDomainErrorのinstanceofがtrue
    expect(error instanceof TaskDomainError).toBe(true);
  });
});

describe('TaskAccessDeniedError', () => {
  test('nameプロパティが"TaskAccessDeniedError"である', () => {
    // Given: タスクIDを指定してエラーを生成
    const error = new TaskAccessDeniedError('test-task-id');

    // Then: nameが正しい
    expect(error.name).toBe('TaskAccessDeniedError');
  });

  test('codeプロパティが"TASK_ACCESS_DENIED"である', () => {
    // Given: タスクIDを指定してエラーを生成
    const error = new TaskAccessDeniedError('test-task-id');

    // Then: codeが正しい
    expect(error.code).toBe('TASK_ACCESS_DENIED');
  });

  test('コンストラクタで正しいメッセージが設定される', () => {
    // Given: タスクID
    const taskId = 'denied-task-id';

    // When: エラーを生成
    const error = new TaskAccessDeniedError(taskId);

    // Then: メッセージが正しいフォーマット
    expect(error.message).toBe(
      `このタスクにアクセスする権限がありません: ${taskId}`,
    );
  });

  test('forTaskIdファクトリメソッドが正しく動作する', () => {
    // Given: タスクID
    const taskId = 'factory-denied-id';

    // When: ファクトリメソッドでエラーを生成
    const error = TaskAccessDeniedError.forTaskId(taskId);

    // Then: 正しいインスタンスが生成される
    expect(error).toBeInstanceOf(TaskAccessDeniedError);
    expect(error.message).toBe(
      `このタスクにアクセスする権限がありません: ${taskId}`,
    );
  });

  test('TaskDomainErrorのinstanceofチェックが正しい', () => {
    // Given: TaskAccessDeniedErrorのインスタンス
    const error = new TaskAccessDeniedError('test-id');

    // Then: TaskDomainErrorのinstanceofがtrue
    expect(error instanceof TaskDomainError).toBe(true);
  });
});
