/**
 * viewer招待取り消しミューテーションフック
 *
 * React QueryのuseMutationを使用してviewer招待の取り消し操作を提供する
 * 取り消し成功時はviewer一覧のキャッシュを無効化し、一覧取得フックが自動的に再取得する
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';
import { handleApiError } from '@/lib/apiErrorHandler';
import { invalidateProjectViewers } from '../lib/viewerQueryCache';

/**
 * useRevokeViewerのmutate引数
 */
export interface RevokeViewerVariables {
  projectId: string;
  viewerId: string;
}

/**
 * viewer招待を取り消すReact Queryフック
 *
 * @returns useMutationの返り値（mutate, isPending, error等）
 */
export function useRevokeViewer() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, Error, RevokeViewerVariables>({
    mutationFn: async ({ projectId, viewerId }) => {
      try {
        const { error } = await apiClient.DELETE(
          '/projects/{projectId}/viewers/{viewerId}',
          {
            params: { path: { projectId, viewerId } },
          },
        );

        if (error) {
          throw new Error(
            handleApiError(error, 'viewer取り消しに失敗しました'),
          );
        }
      } catch (err) {
        throw new Error(
          handleApiError(err, '通信エラーが発生しました。再試行してください'),
        );
      }
    },
    onSuccess: (_, variables) => {
      invalidateProjectViewers(queryClient, variables.projectId);
    },
  });
}
