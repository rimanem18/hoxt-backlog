/**
 * ユーザー情報取得フック
 *
 * React Queryを使用して型安全にユーザー情報を取得する
 * APIクライアントはApiClientContext経由で取得し、テスト時のDIを可能にする
 */
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';

/**
 * ユーザー情報を取得するReact Queryフック
 *
 * @param userId - 取得対象のユーザーID（UUID v4）
 * @returns useQueryの返り値（data, isLoading, error, isSuccess等）
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { data: user, isLoading, error } = useUser('user-id');
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage message={error.message} />;
 *
 *   return <div>{user.name}</div>; // 型安全にアクセス可能
 * }
 * ```
 */
export function useUser(userId: string) {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ['users', userId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/users/{id}', {
        params: { path: { id: userId } },
      });

      // エラーレスポンスの場合はthrow（React Queryがerror状態にする）
      if (error) {
        throw new Error(error.error.message);
      }

      // dataが存在しない場合（204 No Content等）もthrow
      if (!data) {
        throw new Error('ユーザー情報を取得できませんでした');
      }

      // data.dataはUser型として推論される
      return data.data;
    },
  });
}
