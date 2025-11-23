/**
 * ユーザープロフィール取得UseCase実装
 *
 * 指定されたユーザーIDに対応するユーザー情報を取得する
 */

import type { IUserRepository } from '@/domain/user';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import type { User } from '@/domain/user/UserEntity';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';
import { ValidationError } from '@/shared/errors/ValidationError';
import type { Logger } from '@/shared/logging/Logger';

/**
 * ユーザープロフィール取得のための入力パラメータ
 * @param userId - 取得対象のユーザーID（UUID形式）
 */
export interface GetUserProfileUseCaseInput {
  readonly userId: string;
}

/**
 * ユーザープロフィール取得の出力結果
 * @param user - 取得されたユーザーエンティティ
 */
export interface GetUserProfileUseCaseOutput {
  readonly user: User;
}

/**
 * ユーザープロフィール取得UseCaseのインターフェース
 */
export interface IGetUserProfileUseCase {
  execute(
    input: GetUserProfileUseCaseInput,
  ): Promise<GetUserProfileUseCaseOutput>;
}

/**
 * ユーザープロフィール取得UseCaseの実装クラス
 *
 * 指定されたユーザーIDに基づいてユーザー情報を取得する
 *
 * @example
 * ```typescript
 * const useCase = new GetUserProfileUseCase(userRepository, logger);
 * const result = await useCase.execute({ userId: 'uuid-12345678-1234-4321-abcd-123456789abc' });
 * ```
 */
export class GetUserProfileUseCase implements IGetUserProfileUseCase {
  // UUID形式検証にプレフィックス付きUUIDも対応する必要があるため、より柔軟な正規表現を使用
  private readonly uuidRegex =
    /^(?:uuid-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /**
   * 入力検証エラー時の警告ログを出力する
   * @param input 検証エラーとなった入力パラメータ
   * @param message エラーメッセージ
   */
  private logInvalidInputWarning(
    input: GetUserProfileUseCaseInput,
    message: string,
  ): void {
    // DRY原則に基づき警告ログ出力を共通化
    this.logger.warn(message, { invalidInput: JSON.stringify(input) });
  }

  /**
   * 入力パラメータの妥当性を検証する
   * @param input 検証対象の入力パラメータ
   * @throws ValidationError 入力が無効な場合
   */
  private validateInput(input: GetUserProfileUseCaseInput): void {
    if (!input || !input.userId) {
      this.logInvalidInputWarning(input, '必須パラメータが不足しています');
      throw new ValidationError('ユーザーIDが必要です');
    }

    const { userId } = input;

    if (typeof userId !== 'string' || userId.trim() === '') {
      this.logInvalidInputWarning(input, '無効なユーザーID形式です');
      throw new ValidationError('ユーザーIDは有効な文字列である必要があります');
    }

    // プレフィックス付きUUID形式に対応するため正規表現で検証
    if (!this.uuidRegex.test(userId)) {
      this.logInvalidInputWarning(input, 'UUID形式が不正です');
      throw new ValidationError('ユーザーIDはUUID形式である必要があります');
    }
  }

  /**
   * GetUserProfileUseCaseを初期化する
   * @param userRepository ユーザー情報の永続化を担当するリポジトリ
   * @param logger 構造化ログ出力を担当するロガー
   * @throws Error 必須依存関係がnull/undefinedの場合
   */
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly logger: Logger,
  ) {
    // Fail Fast原則により初期化時にnull依存関係を検出
    if (!userRepository) {
      throw new Error('userRepository is required');
    }
    if (!logger) {
      throw new Error('logger is required');
    }
  }

  /**
   * ユーザープロフィールを取得する
   * @param input ユーザーID文字列を含む入力パラメータ
   * @returns 取得されたユーザーエンティティを含む出力オブジェクト
   * @throws ValidationError 入力検証失敗時
   * @throws UserNotFoundError 指定ユーザーが存在しない時
   * @throws InfrastructureError データベース接続等のインフラ障害時
   */
  async execute(
    input: GetUserProfileUseCaseInput,
  ): Promise<GetUserProfileUseCaseOutput> {
    this.validateInput(input);
    const { userId } = input;

    this.logger.info('User profile retrieval started', { userId });

    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        this.logger.warn('User not found', { userId });
        throw UserNotFoundError.forUserId(userId);
      }

      this.logger.info('User profile retrieved successfully', { userId });
      return { user };
    } catch (error) {
      if (
        error instanceof UserNotFoundError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const logContext = { userId, error: errorMessage };

      this.logger.error('User profile retrieval error', logContext);

      // エラーメッセージパターンに応じて適切なメッセージに変換
      // TODO: エラー分類をより詳細化し、設定ファイルで管理可能にする
      const errorClassifications = [
        {
          pattern: 'Query execution timeout',
          message: 'データベース接続エラー',
        },
        {
          pattern: ['データベース接続', 'connection'],
          message: 'ユーザー情報の取得に失敗しました',
        },
        { pattern: 'Network timeout', message: 'システムエラーが発生しました' },
      ];

      const matchedError = errorClassifications.find(({ pattern }) =>
        Array.isArray(pattern)
          ? pattern.some((p) => errorMessage.includes(p))
          : errorMessage.includes(pattern),
      );

      throw new InfrastructureError(
        matchedError?.message || 'システムエラーが発生しました',
      );
    }
  }
}
