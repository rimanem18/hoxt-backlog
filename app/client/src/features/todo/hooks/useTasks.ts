/**
 * タスク一覧取得フック
 *
 * Redux状態（フィルタ・ソート）に基づいてタスク一覧を取得する
 * TanStack React Queryで型安全にサーバー状態を管理する
 */
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';
import { useAppSelector } from '@/store/hooks';

/**
 * Redux状態からタスク一覧を取得するフック
 *
 * @param projectId - 特定プロジェクト内のタスクのみを取得する場合に指定
 * @returns useQueryの返り値（data, isLoading, error, isSuccess等）
 *
 * @example
 * ```tsx
 * function TaskList() {
 *   const { data: tasks, isLoading, error } = useTasks();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage message={error.message} />;
 *   if (tasks.length === 0) return <EmptyState message="タスクがありません" />;
 *
 *   return (
 *     <ul>
 *       {tasks.map(task => (
 *         <TaskItem key={task.id} task={task} />
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useTasks(projectId?: string) {
  const apiClient = useApiClient();
  const filters = useAppSelector((state) => state.task.filters);
  const sort = useAppSelector((state) => state.task.sort);

  return useQuery({
    queryKey: ['tasks', filters, sort, projectId],
    queryFn: async () => {
      // クエリパラメータを構築
      const queryParams: Record<string, string> = {};

      // projectIdが指定されている場合は追加
      if (projectId !== undefined) {
        queryParams.projectId = projectId;
      }

      // 優先度フィルタ（'all'の場合は除外）
      if (filters.priority !== 'all') {
        queryParams.priority = filters.priority;
      }

      // ステータスフィルタ（TaskStatus[]をカンマ区切り文字列に変換）
      if (filters.status.length > 0) {
        queryParams.status = filters.status.join(',');
      }

      // ソート順
      queryParams.sort = sort.sortBy;

      // APIを呼び出し
      try {
        const { data, error } = await apiClient.GET('/tasks', {
          params: { query: queryParams },
        });

        // エラーレスポンスの場合
        if (error) {
          // projectId指定時のPROJECT_NOT_FOUNDエラーは空配列として扱う
          // （プロジェクト詳細取得フック側が404を表示するため二重表示を防ぐ）
          if (
            projectId !== undefined &&
            error.error?.code === 'PROJECT_NOT_FOUND'
          ) {
            return [];
          }

          throw new Error(
            error.error?.message || 'タスク一覧の取得に失敗しました',
          );
        }

        // dataが存在しない場合（204 No Content等）もthrow
        if (!data) {
          throw new Error('タスク一覧を取得できませんでした');
        }

        return data.data;
      } catch (err) {
        // ネットワークエラー or TypeError の場合は統一メッセージ
        if (
          err instanceof TypeError ||
          (err instanceof Error &&
            (err.message === 'Network error' ||
              err.message?.includes('Failed to fetch')))
        ) {
          throw new Error('通信エラーが発生しました。再試行してください');
        }
        // その他のErrorはそのまま
        if (err instanceof Error) {
          throw err;
        }
        throw new Error('通信エラーが発生しました。再試行してください');
      }
    },
  });
}
