/**
 * タスク操作ミューテーションフック
 *
 * React QueryのuseMutationを使用してタスクのCRUD操作を提供する
 * 操作成功時はキャッシュを無効化し、useTasks フックが自動的に再取得する
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/apiClientContext';
import type { Task, TaskStatus } from '@/packages/shared-schemas/src/tasks';

/**
 * CreateTaskBody型（OpenAPIスキーマから自動推論）
 */
type CreateTaskBody = {
  title: string;
  description?: string | null;
  priority?: 'high' | 'medium' | 'low';
};

/**
 * UpdateTaskBody型（OpenAPIスキーマから自動推論）
 */
type UpdateTaskBody = {
  title?: string;
  description?: string | null;
  priority?: 'high' | 'medium' | 'low';
};

/**
 * UpdateTaskVariables型（useTaskMutationsの引数型）
 */
type UpdateTaskVariables = {
  id: string;
  input: UpdateTaskBody;
};

/**
 * ChangeTaskStatusBody型（OpenAPIスキーマから自動推論）
 */
type ChangeTaskStatusBody = {
  status: TaskStatus;
};

/**
 * ChangeStatusVariables型（useTaskMutationsの引数型）
 */
type ChangeStatusVariables = {
  id: string;
  status: TaskStatus;
};

/**
 * useTaskMutationsの返り値型
 */
export interface UseTaskMutationsResult {
  createTask: ReturnType<typeof useMutation<Task, Error, CreateTaskBody>>;
  updateTask: ReturnType<typeof useMutation<Task, Error, UpdateTaskVariables>>;
  deleteTask: ReturnType<typeof useMutation<void, Error, string>>;
  changeStatus: ReturnType<
    typeof useMutation<Task, Error, ChangeStatusVariables>
  >;
}

/**
 * タスクのCRUD操作を提供するReact Queryフック
 *
 * @returns createTask, updateTask, deleteTask, changeStatus のMutation結果
 *
 * @example
 * ```tsx
 * function TaskCreateForm() {
 *   const { createTask } = useTaskMutations();
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     createTask.mutate(
 *       { title: 'タスク', priority: 'high' },
 *       {
 *         onSuccess: () => {
 *           // キャッシュが自動的に無効化される
 *         },
 *         onError: (error) => {
 *           alert(error.message);
 *         },
 *       },
 *     );
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useTaskMutations(): UseTaskMutationsResult {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: async (input: CreateTaskBody) => {
      const { data, error } = await apiClient.POST('/tasks', {
        body: input,
      });

      // エラーレスポンスの場合はthrow
      if (error) {
        throw new Error(error.error?.message || 'タスク作成に失敗しました');
      }

      // dataが存在しない場合（204 No Content等）もthrow
      if (!data) {
        throw new Error('タスクを作成できませんでした');
      }

      return data.data;
    },
    onSuccess: () => {
      // タスク一覧のキャッシュを無効化（exact: false で全フィルタ・ソート組み合わせを対象）
      queryClient.invalidateQueries({
        queryKey: ['tasks'],
        exact: false,
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, input }: UpdateTaskVariables) => {
      const { data, error } = await apiClient.PUT('/tasks/{id}', {
        params: { path: { id } },
        body: input,
      });

      // エラーレスポンスの場合はthrow
      if (error) {
        throw new Error(error.error?.message || 'タスク更新に失敗しました');
      }

      // dataが存在しない場合（204 No Content等）もthrow
      if (!data) {
        throw new Error('タスクを更新できませんでした');
      }

      return data.data;
    },
    onSuccess: () => {
      // タスク一覧のキャッシュを無効化（exact: false で全フィルタ・ソート組み合わせを対象）
      queryClient.invalidateQueries({
        queryKey: ['tasks'],
        exact: false,
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/tasks/{id}', {
        params: { path: { id } },
      });

      // エラーレスポンスの場合はthrow
      if (error) {
        throw new Error(error.error?.message || 'タスク削除に失敗しました');
      }
    },
    onSuccess: () => {
      // タスク一覧のキャッシュを無効化（exact: false で全フィルタ・ソート組み合わせを対象）
      queryClient.invalidateQueries({
        queryKey: ['tasks'],
        exact: false,
      });
    },
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: ChangeStatusVariables) => {
      const { data, error } = await apiClient.PATCH('/tasks/{id}/status', {
        params: { path: { id } },
        body: { status } as ChangeTaskStatusBody,
      });

      // エラーレスポンスの場合はthrow
      if (error) {
        throw new Error(error.error?.message || 'ステータス更新に失敗しました');
      }

      // dataが存在しない場合（204 No Content等）もthrow
      if (!data) {
        throw new Error('ステータスを更新できませんでした');
      }

      return data.data;
    },
    onSuccess: () => {
      // タスク一覧のキャッシュを無効化（exact: false で全フィルタ・ソート組み合わせを対象）
      queryClient.invalidateQueries({
        queryKey: ['tasks'],
        exact: false,
      });
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
    changeStatus,
  };
}
