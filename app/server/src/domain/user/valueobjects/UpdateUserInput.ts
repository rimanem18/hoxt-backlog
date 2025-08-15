/**
 * ユーザー更新入力値オブジェクト
 *
 * 既存ユーザーの情報更新時に使用する。
 * 全フィールドをオプショナルとし、部分更新に対応。
 */
export interface UpdateUserInput {
  /** 表示名 */
  readonly name?: string;

  /** プロフィール画像URL */
  readonly avatarUrl?: string;

  /** 最終ログイン日時 */
  readonly lastLoginAt?: Date;
}

/**
 * UpdateUserInput の検証ルール
 */
export const UpdateUserInputValidation = {
  /** 表示名の最大文字数 */
  NAME_MAX_LENGTH: 100,

  /** アバターURLの最大文字数 */
  AVATAR_URL_MAX_LENGTH: 500,
} as const;

/**
 * UpdateUserInput の検証
 *
 * @param input - 検証対象のユーザー更新入力
 * @throws エラーメッセージの配列（検証失敗時）
 */
export function validateUpdateUserInput(input: UpdateUserInput): void {
  const errors: string[] = [];

  // 表示名の検証
  if (input.name !== undefined) {
    if (!input.name.trim()) {
      errors.push('表示名は空文字列にできません');
    }
    if (input.name.length > UpdateUserInputValidation.NAME_MAX_LENGTH) {
      errors.push(
        `表示名は${UpdateUserInputValidation.NAME_MAX_LENGTH}文字以内で入力してください`,
      );
    }
  }

  // アバターURLの検証
  if (input.avatarUrl !== undefined) {
    if (
      input.avatarUrl.length > UpdateUserInputValidation.AVATAR_URL_MAX_LENGTH
    ) {
      errors.push(
        `アバターURLは${UpdateUserInputValidation.AVATAR_URL_MAX_LENGTH}文字以内で入力してください`,
      );
    }

    // URLの基本的な形式検証（空文字列は許可）
    if (input.avatarUrl && !isValidUrl(input.avatarUrl)) {
      errors.push('アバターURLの形式が正しくありません');
    }
  }

  // 最終ログイン日時の検証
  if (input.lastLoginAt !== undefined) {
    if (
      !(input.lastLoginAt instanceof Date) ||
      Number.isNaN(input.lastLoginAt.getTime())
    ) {
      errors.push('最終ログイン日時が正しくありません');
    }

    // 未来の日時は不正とする
    if (input.lastLoginAt > new Date()) {
      errors.push('最終ログイン日時は未来の日時にできません');
    }
  }

  // エラーがある場合は例外をスロー
  if (errors.length > 0) {
    throw new Error(`入力値検証エラー: ${errors.join(', ')}`);
  }
}

/**
 * URL形式の検証
 *
 * @param url - 検証対象のURL
 * @returns 有効なURL形式の場合はtrue
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
