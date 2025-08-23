/**
 * GetUserProfileUseCaseテスト用SUTファクトリ
 *
 * 依存関係を差し替え可能なGetUserProfileUseCaseのビルダー。
 * テストの共通セットアップを簡素化し、個々のテストケースに特化したモックを提供する。
 */

import { mock } from 'bun:test';
import { GetUserProfileUseCase } from '@/application/usecases/GetUserProfileUseCase';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { Logger } from '@/shared/logging/Logger';

/**
 * SUT構築時の依存関係の型定義
 */
export interface SUTDependencies {
  readonly userRepository: IUserRepository;
  readonly logger: Logger;
}

/**
 * SUT構築結果の型定義
 */
export interface SUTResult {
  readonly sut: GetUserProfileUseCase;
  readonly userRepository: IUserRepository;
  readonly logger: Logger;
}

/**
 * デフォルトの依存関係モック
 *
 * @returns モックされた依存関係のセット
 */
function createDefaultDependencies(): SUTDependencies {
  return {
    userRepository: {
      findByExternalId: mock(),
      findById: mock(),
      findByEmail: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    },
    logger: {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    } as Logger,
  };
}

/**
 * GetUserProfileUseCase用SUTビルダー
 *
 * 依存関係を差し替え可能なGetUserProfileUseCaseインスタンスを作成。
 * テストの共通セットアップを簡素化し、ユーザープロフィール取得機能のテストを支援。
 *
 * @param overrides 置き換えたい依存関係のオーバーライド
 * @returns SUT（テスト対象システム）と依存関係のセット
 */
export function makeSUT(overrides: Partial<SUTDependencies> = {}): SUTResult {
  // デフォルトの依存関係とオーバーライドをマージ
  const defaults = createDefaultDependencies();
  const dependencies = { ...defaults, ...overrides };

  // SUTインスタンスを作成
  const sut = new GetUserProfileUseCase(
    dependencies.userRepository,
    dependencies.logger,
  );

  return {
    sut,
    userRepository: dependencies.userRepository,
    logger: dependencies.logger,
  };
}
