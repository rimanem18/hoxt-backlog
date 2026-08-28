import type { QueryClient } from '@tanstack/react-query';

/**
 * viewer一覧クエリのキャッシュキーを構築する
 *
 * useProjectViewersのqueryKeyと同一の形式を維持するため、
 * キャッシュ無効化を行う各ミューテーションフックから共通で使用する
 */
export function projectViewersQueryKey(projectId: string) {
  return ['project-viewers', projectId] as const;
}

/**
 * projectへのviewer招待・取り消し成功時にviewer一覧のキャッシュを無効化する
 *
 * exact: false で全フィルタ・ソート組み合わせを対象にする
 */
export function invalidateProjectViewers(
  queryClient: QueryClient,
  projectId: string,
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: projectViewersQueryKey(projectId),
    exact: false,
  });
}
