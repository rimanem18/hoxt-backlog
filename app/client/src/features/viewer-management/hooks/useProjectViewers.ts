/**
 * viewer一覧取得フック
 *
 * 指定projectへ招待済みのviewer一覧を取得する
 * TanStack React Queryで型安全にサーバー状態を管理する
 */
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';
import { handleApiError } from '@/lib/apiErrorHandler';

/**
 * useProjectViewersのオプション
 */
export interface UseProjectViewersOptions {
  /** falseの場合はクエリを実行しない */
  enabled?: boolean;
}

/**
 * projectへ招待済みのviewer一覧を取得するフック
 *
 * @param projectId - 対象projectのID
 * @param options - `enabled`でクエリの実行有無を制御できる（省略時は常に実行）
 * @returns useQueryの返り値（data, isLoading, error, isSuccess等）
 */
export function useProjectViewers(
  projectId: string,
  options?: UseProjectViewersOptions,
) {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ['project-viewers', projectId],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      try {
        const { data, error } = await apiClient.GET(
          '/projects/{projectId}/viewers',
          {
            params: { path: { projectId } },
          },
        );

        if (error) {
          throw new Error(
            handleApiError(error, 'viewer一覧の取得に失敗しました'),
          );
        }

        if (!data) {
          throw new Error('viewer一覧を取得できませんでした');
        }

        return data.data;
      } catch (err) {
        throw new Error(
          handleApiError(err, '通信エラーが発生しました。再試行してください'),
        );
      }
    },
  });
}
