/**
 * ユーザー情報更新フック
 *
 * React QueryのuseMutationを使用して型安全にユーザー情報を更新する
 * 更新成功時はキャッシュを無効化し、useUserフックが自動的に再取得する
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';
import type { paths } from '@/types/api/generated';

/**
 * UpdateUserBody型（OpenAPIスキーマから自動推論）
 */
type UpdateUserBody =
  paths['/users/{id}']['put']['requestBody']['content']['application/json'];

/**
 * useUpdateUserの引数型
 */
type UpdateUserVariables = {
  userId: string;
  data: UpdateUserBody;
};

/**
 * ユーザー情報を更新するReact Queryフック
 *
 * @returns useMutationの返り値（mutate, data, isLoading, error, isSuccess等）
 *
 * @example
 * ```tsx
 * function UserEditForm() {
 *   const { mutate, isLoading, error } = useUpdateUser();
 *
 *   const handleSubmit = (data) => {
 *     mutate({ userId: 'user-id', data });
 *   };
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage message={error.message} />;
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useUpdateUser() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: UpdateUserVariables) => {
      const { data: response, error } = await apiClient.PUT('/users/{id}', {
        params: { path: { id: userId } },
        body: data,
      });

      // エラーレスポンスの場合はthrow（React Queryがerror状態にする）
      if (error) {
        throw new Error(error.error.message);
      }

      // responseが存在しない場合（204 No Content等）もthrow
      if (!response) {
        throw new Error('ユーザー情報を更新できませんでした');
      }

      // response.dataはUser型として推論される
      return response.data;
    },
    onSuccess: (data) => {
      // 更新成功時はuseUserのキャッシュを無効化し、再取得をトリガー
      queryClient.invalidateQueries({ queryKey: ['users', data.id] });
    },
  });
}
