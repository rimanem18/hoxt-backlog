/**
 * プロジェクト一覧取得フック
 *
 * ログインユーザーが自分のprojectのみを取得する
 * TanStack React Queryで型安全にサーバー状態を管理する
 */
import { useQuery } from '@tanstack/react-query';
import { handleApiError } from '@/features/todo/hooks/apiErrorHandler';
import { useApiClient } from '@/lib/apiClientContext';

/**
 * 自分のproject一覧を取得するフック
 *
 * @returns useQueryの返り値（data, isLoading, error, isSuccess等）
 *
 * @example
 * ```tsx
 * function ProjectSelect() {
 *   const { data: projects, isLoading, error } = useProjects();
 * }
 * ```
 */
export function useProjects() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const { data, error } = await apiClient.GET('/projects');

        if (error) {
          throw new Error(
            handleApiError(error, 'プロジェクト一覧の取得に失敗しました'),
          );
        }

        if (!data) {
          throw new Error('プロジェクト一覧を取得できませんでした');
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
