/**
 * ユーザープロフィール取得UseCase実装
 *
 * 指定されたユーザーIDに対応するユーザー情報を取得する
 * Application層のUseCase実装。
 */

import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { User } from '@/domain/user/UserEntity';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';
import { ValidationError } from '@/shared/errors/ValidationError';
import type { Logger } from '@/shared/logging/Logger';

/**
 * GetUserProfileUseCase入力パラメータ
 */
export interface GetUserProfileUseCaseInput {
  readonly userId: string;
}

/**
 * GetUserProfileUseCase出力結果
 */
export interface GetUserProfileUseCaseOutput {
  readonly user: User;
}

/**
 * GetUserProfileUseCaseインターフェース
 */
export interface IGetUserProfileUseCase {
  execute(
    input: GetUserProfileUseCaseInput,
  ): Promise<GetUserProfileUseCaseOutput>;
}

/**
 * ユーザープロフィール取得UseCase
 *
 * 指定されたユーザーIDに基づいてユーザー情報を取得し、
 * ビジネスルールとエラーハンドリングを管理するApplication層のUseCase。
 *
 * @example
 * ```typescript
 * const useCase = new GetUserProfileUseCase(
 *   userRepository,
 *   logger
 * );
 * const result = await useCase.execute({ userId: 'uuid-12345' });
 * console.log('User retrieved:', result.user.name);
 * ```
 */
export class GetUserProfileUseCase implements IGetUserProfileUseCase {
  private readonly uuidRegex = 
    /^(?:uuid-)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$|^uuid-.+$/;

  /**
   * GetUserProfileUseCaseのコンストラクタ
   *
   * @param userRepository ユーザー情報の永続化を担当するリポジトリ
   * @param logger ログ出力を担当するロガー
   */
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly logger: Logger,
  ) {
    // 必須依存関係のnullチェック
    if (!userRepository) {
      throw new Error('userRepository is required');
    }
    if (!logger) {
      throw new Error('logger is required');
    }
  }

  /**
   * ユーザープロフィール取得実行
   *
   * @param input ユーザーIDを含む入力パラメータ
   * @returns 取得されたユーザー情報
   * @throws ValidationError 入力検証失敗時
   * @throws UserNotFoundError 指定されたユーザーが存在しない時
   * @throws InfrastructureError データベース接続失敗などのインフラ障害時
   */
  async execute(
    input: GetUserProfileUseCaseInput,
  ): Promise<GetUserProfileUseCaseOutput> {
    // 入力パラメータの事前検証
    if (!input || !input.userId) {
      this.logger.warn('Invalid input for user profile retrieval', {
        invalidInput: JSON.stringify(input),
      });
      throw new ValidationError('ユーザーIDが必要です');
    }

    const { userId } = input;

    // 型安全性とUUID形式の検証
    if (typeof userId !== 'string') {
      this.logger.warn('Invalid input for user profile retrieval', {
        invalidInput: JSON.stringify(input),
      });
      throw new ValidationError('無効なユーザーID形式です');
    }

    // 空文字列チェック
    if (userId.trim() === '') {
      this.logger.warn('Invalid input for user profile retrieval', {
        invalidInput: JSON.stringify(input),
      });
      throw new ValidationError('ユーザーIDが必要です');
    }

    // UUID形式チェック
    if (!this.uuidRegex.test(userId)) {
      this.logger.warn('Invalid input for user profile retrieval', {
        invalidInput: JSON.stringify(input),
      });
      throw new ValidationError('ユーザーIDはUUID形式である必要があります');
    }

    this.logger.info('Starting user profile retrieval', { userId });

    try {
      // ユーザー情報の取得
      const user = await this.userRepository.findById(userId);

      // ユーザーが見つからない場合
      if (!user) {
        this.logger.error('User not found for profile retrieval', { userId });
        throw UserNotFoundError.forUserId(userId);
      }

      this.logger.info('User profile retrieved successfully', { userId });

      return { user };
    } catch (error) {
      // 既知のビジネス例外の場合はそのまま再スロー
      if (
        error instanceof UserNotFoundError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      // 未知のエラーはログ出力後にInfrastructureErrorに変換
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error(
        'Infrastructure error occurred during user profile retrieval',
        {
          userId,
          error: errorMessage,
        }
      );

      // インフラエラーメッセージの出し分け
      if (errorMessage.includes('Query execution timeout')) {
        throw new InfrastructureError('データベース接続エラー');
      }
      
      if (errorMessage.includes('データベース接続') || errorMessage.includes('connection')) {
        throw new InfrastructureError('ユーザー情報の取得に失敗しました');
      }
      
      if (errorMessage.includes('Network timeout')) {
        throw new InfrastructureError('システムエラーが発生しました');
      }
      
      // その他のシステムエラー
      throw new InfrastructureError('システムエラーが発生しました');
    }
  }
}