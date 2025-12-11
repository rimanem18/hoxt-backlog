/**
 * API エラーハンドリングユーティリティ
 *
 * APIリクエストのエラーを標準化して処理する共通ロジック
 */

/**
 * API レスポンスのエラーオブジェクト型
 */
type ApiError = {
  error?: {
    message?: string;
    code?: string;
  };
};

/**
 * API呼び出し結果のエラーを統一メッセージに変換する
 *
 * @param error - API呼び出し時のエラーまたはエラーレスポンス
 * @param fallbackMessage - エラーメッセージが取得できない場合のデフォルトメッセージ
 * @returns 統一されたエラーメッセージ
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient.POST('/tasks', { body });
 * } catch (err) {
 *   const message = handleApiError(err, 'タスク作成に失敗しました');
 *   throw new Error(message);
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  fallbackMessage: string,
): string {
  // ネットワークエラーの場合は統一メッセージに変換
  if (error instanceof TypeError) {
    return '通信エラーが発生しました。再試行してください';
  }

  if (error instanceof Error) {
    // Error オブジェクトの場合
    if (
      error.message === 'Network error' ||
      error.message?.includes('Failed to fetch')
    ) {
      return '通信エラーが発生しました。再試行してください';
    }
    return error.message || fallbackMessage;
  }

  // APIエラーレスポンスの場合
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = error as ApiError;
    return apiError.error?.message || fallbackMessage;
  }

  return fallbackMessage;
}
