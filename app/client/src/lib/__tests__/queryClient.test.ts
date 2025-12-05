import { describe, expect, test } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '../queryClient';

describe('createQueryClient', () => {
  test('新しいQueryClientインスタンスを返す', () => {
    const client = createQueryClient();

    expect(client).toBeInstanceOf(QueryClient);
  });

  test('各呼び出しで異なるインスタンスを返す', () => {
    const client1 = createQueryClient();
    const client2 = createQueryClient();

    expect(client1).not.toBe(client2);
  });

  test('デフォルトオプションが正しく設定される', () => {
    const client = createQueryClient();
    const defaultOptions = client.getDefaultOptions();

    expect(defaultOptions.queries?.staleTime).toBe(30 * 1000);
    expect(defaultOptions.queries?.gcTime).toBe(5 * 60 * 1000);
    expect(defaultOptions.queries?.retry).toBe(1);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaultOptions.mutations?.retry).toBe(0);
  });
});
