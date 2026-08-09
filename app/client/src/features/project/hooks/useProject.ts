/**
 * プロジェクト詳細取得フック
 *
 * 指定されたproject IDのプロジェクト詳細を取得する
 * TanStack React Queryで型安全にサーバー状態を管理する
 */
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';
import { handleApiError } from '@/lib/apiErrorHandler';

/**
 * プロジェクト詳細を取得するフック
 *
 * @param projectId - 取得するプロジェクトのID
 * @returns useQueryの返り値（data, isLoading, error, isSuccess等）
 *
 * @example
 * ```tsx
 * function ProjectDetail({ projectId }: { projectId: string }) {
 *   const { data: project, isLoading, error } = useProject(projectId);
 * }
 * ```
 */
export function useProject(projectId: string) {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      try {
        const { data, error } = await apiClient.GET('/projects/{id}', {
          params: { path: { id: projectId } },
        });

        if (error) {
          // PROJECT_NOT_FOUND の場合は統一メッセージに正規化
          if (error.error?.code === 'PROJECT_NOT_FOUND') {
            throw new Error('プロジェクトが見つかりません');
          }
          throw new Error(
            handleApiError(error, 'プロジェクト詳細の取得に失敗しました'),
          );
        }

        if (!data) {
          throw new Error('プロジェクト詳細を取得できませんでした');
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
