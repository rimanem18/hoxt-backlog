/**
 * viewer通知設定変更ミューテーションフック
 *
 * React QueryのuseMutationを使用してproject単位の通知ON/OFF設定を提供する
 * 変更成功時はviewerアクセス可能project一覧のキャッシュを無効化する
 */

import type { ProjectViewerNotificationSetting } from '@hoxt-backlog/shared-schemas/viewers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';
import { handleApiError } from '@/lib/apiErrorHandler';

/**
 * useUpdateNotificationSettingのmutate引数
 */
export interface UpdateNotificationSettingVariables {
  projectId: string;
  enabled: boolean;
}

/**
 * viewerがproject単位の通知ON/OFF設定を変更するReact Queryフック
 *
 * @returns useMutationの返り値（mutate, isPending, error等）
 */
export function useUpdateNotificationSetting() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    ProjectViewerNotificationSetting,
    Error,
    UpdateNotificationSettingVariables
  >({
    mutationFn: async ({ projectId, enabled }) => {
      try {
        const { data, error } = await apiClient.PATCH(
          '/viewer/projects/{projectId}/notification-setting',
          {
            params: { path: { projectId } },
            body: { enabled },
          },
        );

        if (error) {
          throw new Error(
            handleApiError(error, '通知設定の変更に失敗しました'),
          );
        }

        if (!data) {
          throw new Error('通知設定を変更できませんでした');
        }

        return data.data;
      } catch (err) {
        throw new Error(
          handleApiError(err, '通信エラーが発生しました。再試行してください'),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['viewer-accessible-projects'],
      });
    },
  });
}
