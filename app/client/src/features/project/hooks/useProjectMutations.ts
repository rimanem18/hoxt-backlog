/**
 * プロジェクト操作ミューテーションフック
 *
 * React QueryのuseMutationを使用してプロジェクトのCRUD操作を提供する
 * 操作成功時はキャッシュを無効化し、一覧取得フックが自動的に再取得する
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';
import type {
  CreateProjectInput,
  Project,
} from '@/packages/shared-schemas/src/projects';

/**
 * useProjectMutationsの返り値型
 */
export interface UseProjectMutationsResult {
  createProject: ReturnType<
    typeof useMutation<Project, Error, CreateProjectInput>
  >;
}

/**
 * プロジェクトのCRUD操作を提供するReact Queryフック
 *
 * @returns createProject のMutation結果
 */
export function useProjectMutations(): UseProjectMutationsResult {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const createProject = useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data, error } = await apiClient.POST('/projects', {
        body: input,
      });

      // エラーレスポンスの場合はthrow
      if (error) {
        throw new Error(
          error.error?.message || 'プロジェクト作成に失敗しました',
        );
      }

      // dataが存在しない場合（204 No Content等）もthrow
      if (!data) {
        throw new Error('プロジェクトを作成できませんでした');
      }

      return data.data;
    },
    onSuccess: () => {
      // プロジェクト一覧のキャッシュを無効化（exact: false で全フィルタ・ソート組み合わせを対象）
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        exact: false,
      });
    },
  });

  return {
    createProject,
  };
}
