import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { InvalidTaskDataError, TaskNotFoundError } from '@/domain/task/errors';
import { errorMiddleware } from '../errorMiddleware';
import { createMockContext } from './helpers';

describe('errorMiddleware', () => {
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  test('エラーなしの場合、next()が正常に実行される', async () => {
    // Given: エラーが発生しない正常なリクエスト
    const mockContext = createMockContext();
    const mockNext = mock(async () => {});

    // When: errorMiddlewareを実行
    const result = await errorMiddleware(mockContext, mockNext);

    // Then: next()が呼ばれ、undefinedが返却される
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  test('TaskNotFoundErrorが発生した場合、404レスポンスを返す', async () => {
    // Given: TaskNotFoundErrorがスローされる
    const mockContext = createMockContext();
    const mockNext = mock(async () => {
      throw new TaskNotFoundError('task-id-123');
    });
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});

    // When: errorMiddlewareを実行
    await errorMiddleware(mockContext, mockNext);

    // Then: 404レスポンスが返却される
    expect(mockContext.json).toHaveBeenCalledTimes(1);
    const jsonCall = (mockContext.json as ReturnType<typeof mock>).mock
      .calls[0];
    if (!jsonCall) throw new Error('jsonCall is undefined');
    expect(jsonCall[0]).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'タスクが見つかりません: task-id-123',
      },
    });
    expect(jsonCall[1]).toBe(404);

    // console.errorが呼ばれる
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  test('InvalidTaskDataErrorが発生した場合、400レスポンスを返す', async () => {
    // Given: InvalidTaskDataErrorがスローされる
    const mockContext = createMockContext();
    const mockNext = mock(async () => {
      throw new InvalidTaskDataError('タイトルを入力してください');
    });
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});

    // When: errorMiddlewareを実行
    await errorMiddleware(mockContext, mockNext);

    // Then: 400レスポンスが返却される
    expect(mockContext.json).toHaveBeenCalledTimes(1);
    const jsonCall = (mockContext.json as ReturnType<typeof mock>).mock
      .calls[0];
    if (!jsonCall) throw new Error('jsonCall is undefined');
    expect(jsonCall[0]).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'タイトルを入力してください',
      },
    });
    expect(jsonCall[1]).toBe(400);

    // console.errorが呼ばれる
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  test('予期しないエラーが発生した場合、500レスポンスを返す', async () => {
    // Given: 予期しないエラーがスローされる
    const mockContext = createMockContext();
    const mockNext = mock(async () => {
      throw new Error('Unexpected database error');
    });
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});

    // When: errorMiddlewareを実行
    await errorMiddleware(mockContext, mockNext);

    // Then: 500レスポンスが返却される
    expect(mockContext.json).toHaveBeenCalledTimes(1);
    const jsonCall = (mockContext.json as ReturnType<typeof mock>).mock
      .calls[0];
    if (!jsonCall) throw new Error('jsonCall is undefined');
    expect(jsonCall[0]).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました',
      },
    });
    expect(jsonCall[1]).toBe(500);

    // console.errorが呼ばれる
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
