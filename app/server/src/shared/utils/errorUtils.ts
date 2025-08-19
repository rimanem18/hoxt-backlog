/**
 * エラーハンドリング用のユーティリティ関数集
 *
 * 【機能概要】: エラーメッセージの統一化とエラーインスタンスの型安全な処理
 * 【DRY原則適用】: 重複していたerror instanceof Error判定とメッセージ生成を共通化
 * 【改善内容】: プロジェクト全体で散在していたエラー処理パターンを統一
 *
 * 🟢 Refactorフェーズでの重複コード削減 - 複数ファイルで重複していた実装を共通化
 */

/**
 * エラーから安全にメッセージを取得する
 *
 * 【機能概要】: Error オブジェクトかどうかを判定し、安全にメッセージを抽出
 * 【型安全性】: unknown 型のエラーに対しても安全に処理
 * 【統一性】: プロジェクト全体で一貫したエラーメッセージ形式を保証
 *
 * @param error - エラーオブジェクト（unknown型も受け付ける）
 * @returns 安全に抽出されたエラーメッセージ
 */
export const getErrorMessage = (error: unknown): string => {
  // 【型判定】: Error インスタンスかどうかを判定
  if (error instanceof Error) {
    // 【メッセージ取得】: Error オブジェクトからメッセージを取得
    return error.message;
  }

  // 【フォールバック処理】: Error でない場合は文字列変換
  // 【安全性確保】: null/undefined でも安全に文字列化
  if (error === null || error === undefined) {
    return 'Unknown error';
  }

  // 【型変換】: その他の型は String() で安全に文字列化
  return String(error);
};

/**
 * 依存関係の null チェック用エラーメッセージを生成する
 *
 * 【機能概要】: 依存性注入時の null チェックエラーメッセージを統一
 * 【DRY原則適用】: AuthenticateUserUseCase で重複していた依存関係チェックを共通化
 * 【一貫性確保】: 全ての UseCase で統一されたエラーメッセージフォーマット
 *
 * @param dependencyName - 依存関係の名前
 * @returns 統一されたフォーマットのエラーメッセージ
 */
export const createDependencyNullError = (dependencyName: string): string => {
  // 【メッセージフォーマット統一】: プロジェクト全体で統一された依存関係エラーメッセージ
  return `Required dependency ${dependencyName} is null`;
};

/**
 * データベースエラーメッセージを生成する
 *
 * 【機能概要】: データベース関連エラーのメッセージを統一化
 * 【DRY原則適用】: PostgreSQLUserRepository や connection.ts で重複していた実装を共通化
 * 【一貫性確保】: データベースエラーのメッセージフォーマットを統一
 *
 * @param context - エラーが発生したコンテキスト（例：「データベース接続」「ユーザー保存」）
 * @param originalError - 元のエラーオブジェクト
 * @returns 統一されたフォーマットのデータベースエラーメッセージ
 */
export const createDatabaseErrorMessage = (
  context: string,
  originalError: unknown,
): string => {
  // 【メッセージ構成】: コンテキスト + 元エラーメッセージの組み合わせ
  const errorMessage = getErrorMessage(originalError);
  return `${context}に失敗しました: ${errorMessage}`;
};

/**
 * 入力値検証エラーメッセージを生成する
 *
 * 【機能概要】: バリデーションエラーのメッセージを統一化
 * 【DRY原則適用】: CreateUserInput や UpdateUserInput で重複していた実装を共通化
 * 【一貫性確保】: 入力値検証エラーのメッセージフォーマットを統一
 *
 * @param errors - エラーメッセージの配列
 * @returns 統一されたフォーマットの検証エラーメッセージ
 */
export const createValidationErrorMessage = (errors: string[]): string => {
  // 【メッセージフォーマット統一】: プロジェクト全体で統一された検証エラーメッセージ
  return `入力値検証エラー: ${errors.join(', ')}`;
};

/**
 * 環境変数設定エラーメッセージを生成する
 *
 * 【機能概要】: 環境変数関連エラーのメッセージを統一化
 * 【DRY原則適用】: env.ts で重複していた実装を共通化
 * 【一貫性確保】: 環境変数エラーのメッセージフォーマットを統一
 *
 * @param context - エラーの詳細情報またはエラーオブジェクト
 * @returns 統一されたフォーマットの環境変数エラーメッセージ
 */
export const createEnvironmentErrorMessage = (context: unknown): string => {
  // 【メッセージ構成】: 統一されたプレフィックス + エラー詳細
  const errorMessage = getErrorMessage(context);
  return `環境変数設定エラー: ${errorMessage}`;
};
