/**
 * viewer招待ミューテーションフック
 *
 * React QueryのuseMutationを使用してprojectへのviewer招待操作を提供する
 * 招待成功時はviewer一覧のキャッシュを無効化し、一覧取得フックが自動的に再取得する
 */

import type { ProjectViewer } from '@hoxt-backlog/shared-schemas/viewers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';
import { handleApiError } from '@/lib/apiErrorHandler';

/**
 * useInviteViewerのmutate引数
 */
export interface InviteViewerVariables {
  projectId: string;
  email: string;
}

/**
 * projectへviewerを招待するReact Queryフック
 *
 * @returns useMutationの返り値（mutate, isPending, error等）
 */
export function useInviteViewer() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<ProjectViewer, Error, InviteViewerVariables>({
    mutationFn: async ({ projectId, email }) => {
      try {
        const { data, error } = await apiClient.POST(
          '/projects/{projectId}/viewers',
          {
            params: { path: { projectId } },
            body: { email },
          },
        );

        if (error) {
          throw new Error(handleApiError(error, 'viewer招待に失敗しました'));
        }

        if (!data) {
          throw new Error('viewerを招待できませんでした');
        }

        return data.data;
      } catch (err) {
        throw new Error(
          handleApiError(err, '通信エラーが発生しました。再試行してください'),
        );
      }
    },
    onSuccess: (_, variables) => {
      // viewer一覧のキャッシュを無効化（exact: false で全フィルタ・ソート組み合わせを対象）
      queryClient.invalidateQueries({
        queryKey: ['project-viewers', variables.projectId],
        exact: false,
      });
    },
  });
}
