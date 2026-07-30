import type { AuthProvider } from '../AuthProvider';

/**
 * ユーザー作成入力値オブジェクト
 *
 * 新規ユーザー作成時（JITプロビジョニング）に必要な情報を定義。
 * UserEntityの生成時に使用される。
 */
export interface CreateUserInput {
  /** 外部プロバイダーでのユーザーID（Google Sub Claimなど） */
  readonly externalId: string;

  /** 認証プロバイダー種別 */
  readonly provider: AuthProvider;

  /** メールアドレス（必須・ユニーク） */
  readonly email: string;

  /** 表示名 */
  readonly name: string;

  /** プロフィール画像URL（オプション） */
  readonly avatarUrl?: string;
}

/**
 * CreateUserInput の検証ルール
 */
export const CreateUserInputValidation = {
  /** メールアドレスの最大文字数 */
  EMAIL_MAX_LENGTH: 255,

  /** 表示名の最大文字数 */
  NAME_MAX_LENGTH: 100,

  /** 外部IDの最大文字数 */
  EXTERNAL_ID_MAX_LENGTH: 255,

  /** アバターURLの最大文字数 */
  AVATAR_URL_MAX_LENGTH: 500,
} as const;

/**
 * メールアドレス形式の検証
 *
 * @param email - 検証対象のメールアドレス
 * @returns 有効な形式の場合はtrue
 */
export function isValidEmail(email: string): boolean {
  // 基本的なメールアドレス形式の検証
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * CreateUserInput の検証
 *
 * @param input - 検証対象のユーザー作成入力
 * @throws エラーメッセージの配列（検証失敗時）
 */
export function validateCreateUserInput(input: CreateUserInput): void {
  const errors: string[] = [];

  // 必須フィールドの検証
  if (!input.externalId?.trim()) {
    errors.push('外部IDは必須です');
  }
  if (!input.email?.trim()) {
    errors.push('メールアドレスは必須です');
  }
  if (!input.name?.trim()) {
    errors.push('表示名は必須です');
  }

  // 文字数制限の検証
  if (
    input.externalId &&
    input.externalId.length > CreateUserInputValidation.EXTERNAL_ID_MAX_LENGTH
  ) {
    errors.push(
      `外部IDは${CreateUserInputValidation.EXTERNAL_ID_MAX_LENGTH}文字以内で入力してください`,
    );
  }
  if (
    input.email &&
    input.email.length > CreateUserInputValidation.EMAIL_MAX_LENGTH
  ) {
    errors.push(
      `メールアドレスは${CreateUserInputValidation.EMAIL_MAX_LENGTH}文字以内で入力してください`,
    );
  }
  if (
    input.name &&
    input.name.length > CreateUserInputValidation.NAME_MAX_LENGTH
  ) {
    errors.push(
      `表示名は${CreateUserInputValidation.NAME_MAX_LENGTH}文字以内で入力してください`,
    );
  }
  if (
    input.avatarUrl &&
    input.avatarUrl.length > CreateUserInputValidation.AVATAR_URL_MAX_LENGTH
  ) {
    errors.push(
      `アバターURLは${CreateUserInputValidation.AVATAR_URL_MAX_LENGTH}文字以内で入力してください`,
    );
  }

  // メールアドレス形式の検証
  if (input.email && !isValidEmail(input.email)) {
    errors.push('メールアドレスの形式が正しくありません');
  }

  // エラーがある場合は例外をスロー
  if (errors.length > 0) {
    throw new Error(`入力値検証エラー: ${errors.join(', ')}`);
  }
}
