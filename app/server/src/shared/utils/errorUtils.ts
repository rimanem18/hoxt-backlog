/**
 * エラーハンドリング用のユーティリティ関数集
 *
 * エラーメッセージの統一化とエラーインスタンスの型安全な処理を提供。
 * プロジェクト全体で一貫したエラーハンドリングパターンを実現する。
 */

/**
 * エラーから安全にメッセージを取得する
 *
 * unknown 型のエラーから型安全にメッセージを抽出し、
 * プロジェクト全体で一貫したエラーメッセージ形式を保証する。
 *
 * @param error - エラーオブジェクト（unknown型も受け付ける）
 * @returns 安全に抽出されたエラーメッセージ
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  // null/undefined は統一メッセージで処理
  if (error === null || error === undefined) {
    return 'Unknown error';
  }

  // その他の型は String() で安全に変換
  return String(error);
};

/**
 * 依存関係の null チェック用エラーメッセージを生成する
 *
 * 依存性注入時の null チェックエラーメッセージを統一し、
 * 全ての UseCase で一貫したエラーメッセージフォーマットを提供する。
 *
 * @param dependencyName - 依存関係の名前
 * @returns 統一されたフォーマットのエラーメッセージ
 */
export const createDependencyNullError = (dependencyName: string): string => {
  return `Required dependency ${dependencyName} is null`;
};

/**
 * データベースエラーメッセージを生成する
 *
 * データベース関連エラーのメッセージを統一化し、
 * コンテキスト情報と元エラーを組み合わせた分かりやすいメッセージを生成する。
 *
 * @param context - エラーが発生したコンテキスト（例：「データベース接続」「ユーザー保存」）
 * @param originalError - 元のエラーオブジェクト
 * @returns 統一されたフォーマットのデータベースエラーメッセージ
 */
export const createDatabaseErrorMessage = (
  context: string,
  originalError: unknown,
): string => {
  const errorMessage = getErrorMessage(originalError);
  return `${context}に失敗しました: ${errorMessage}`;
};

/**
 * 入力値検証エラーメッセージを生成する
 *
 * バリデーションエラーのメッセージを統一化し、
 * 複数のエラーメッセージを読みやすい形式で結合する。
 *
 * @param errors - エラーメッセージの配列
 * @returns 統一されたフォーマットの検証エラーメッセージ
 */
export const createValidationErrorMessage = (errors: string[]): string => {
  return `入力値検証エラー: ${errors.join(', ')}`;
};

/**
 * 環境変数設定エラーメッセージを生成する
 *
 * 環境変数関連エラーのメッセージを統一化し、
 * 設定不備の詳細情報を含む分かりやすいメッセージを生成する。
 *
 * @param context - エラーの詳細情報またはエラーオブジェクト
 * @returns 統一されたフォーマットの環境変数エラーメッセージ
 */
export const createEnvironmentErrorMessage = (context: unknown): string => {
  const errorMessage = getErrorMessage(context);
  return `環境変数設定エラー: ${errorMessage}`;
};
