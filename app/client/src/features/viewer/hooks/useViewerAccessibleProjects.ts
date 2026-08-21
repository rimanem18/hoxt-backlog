/**
 * viewer横断project一覧取得フック
 *
 * viewerアクセストークンで、招待されている全projectのtask一覧を
 * projectごとにグルーピングして取得する
 * TanStack React Queryで型安全にサーバー状態を管理する
 */
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';
import { handleApiError } from '@/lib/apiErrorHandler';

/**
 * viewerが閲覧できるproject・task一覧を取得するフック
 *
 * @returns useQueryの返り値（data, isLoading, error, isSuccess等）
 */
export function useViewerAccessibleProjects() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ['viewer-accessible-projects'],
    queryFn: async () => {
      try {
        const { data, error } = await apiClient.GET('/viewer/tasks');

        if (error) {
          throw new Error(
            handleApiError(error, 'project一覧の取得に失敗しました'),
          );
        }

        if (!data) {
          throw new Error('project一覧を取得できませんでした');
        }

        return data.data.projects;
      } catch (err) {
        throw new Error(
          handleApiError(err, '通信エラーが発生しました。再試行してください'),
        );
      }
    },
  });
}
