/**
 * プロジェクト操作ミューテーションフック
 *
 * React QueryのuseMutationを使用してプロジェクトのCRUD操作を提供する
 * 操作成功時はキャッシュを無効化し、一覧取得フックが自動的に再取得する
 */

import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from '@hoxt-backlog/shared-schemas/projects';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';

/**
 * useProjectMutationsの返り値型
 */
export interface UseProjectMutationsResult {
  createProject: ReturnType<
    typeof useMutation<Project, Error, CreateProjectInput>
  >;
  updateProject: ReturnType<
    typeof useMutation<
      Project,
      Error,
      { id: string; input: UpdateProjectInput }
    >
  >;
}

/**
 * プロジェクトのCRUD操作を提供するReact Queryフック
 *
 * @returns createProject、updateProject のMutation結果
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

  const updateProject = useMutation({
    mutationFn: async (variables: {
      id: string;
      input: UpdateProjectInput;
    }) => {
      const { data, error } = await apiClient.PUT('/projects/{id}', {
        params: { path: { id: variables.id } },
        body: variables.input,
      });

      // エラーレスポンスの場合はthrow
      if (error) {
        throw new Error(
          error.error?.message || 'プロジェクト更新に失敗しました',
        );
      }

      // dataが存在しない場合（204 No Content等）もthrow
      if (!data) {
        throw new Error('プロジェクトを更新できませんでした');
      }

      return data.data;
    },
    onSuccess: (_, variables) => {
      // プロジェクト一覧のキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        exact: false,
      });
      // 該当プロジェクト詳細のキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: ['project', variables.id],
        exact: false,
      });
    },
  });

  return {
    createProject,
    updateProject,
  };
}
