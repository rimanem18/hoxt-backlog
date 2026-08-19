import { afterEach, describe, expect, mock, test } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';
import {
  invalidateProjectViewers,
  projectViewersQueryKey,
} from '../lib/viewerQueryCache';

describe('viewerQueryCache', () => {
  afterEach(() => {
    mock.restore();
    mock.clearAllMocks();
  });

  test('projectViewersQueryKeyがprojectIdを含むキャッシュキーを返す', () => {
    // Given & When: projectIdを渡してキャッシュキーを構築
    const queryKey = projectViewersQueryKey('proj-123');

    // Then: useProjectViewersと同一形式のキーが返る
    expect(queryKey).toEqual(['project-viewers', 'proj-123']);
  });

  test('invalidateProjectViewersがprojectIdに紐づくキャッシュを無効化する', () => {
    // Given: invalidateQueriesをモックしたQueryClient
    const queryClient = new QueryClient();
    const invalidateQueries = mock(() => Promise.resolve());
    queryClient.invalidateQueries = invalidateQueries;

    // When: invalidateProjectViewersを呼び出す
    invalidateProjectViewers(queryClient, 'proj-123');

    // Then: 対象projectのviewer一覧クエリが無効化される
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['project-viewers', 'proj-123'],
      exact: false,
    });
  });
});
