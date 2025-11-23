/**
 * テスト用システム・アンダー・テスト（SUT）ファクトリ
 *
 * 依存関係を差し替え可能なAuthenticateUserUseCaseのビルダー。
 * テストの共通セットアップを簡素化し、個々のテストケースに特化したモックを提供する。
 */

import { mock } from 'bun:test';
import { AuthenticateUserUseCase } from '@/application/usecases/AuthenticateUserUseCase';
import type { IAuthenticationDomainService } from '@/domain/services/IAuthenticationDomainService';
import type {
  ExternalUserInfo,
  IAuthProvider,
  JwtPayload,
} from '@/domain/services/IAuthProvider';
import type {
  CreateUserInput,
  IUserRepository,
  UpdateUserInput,
  User,
} from '@/domain/user';
import type { Logger } from '@/shared/logging/Logger';
import type { IErrorClassificationService } from '@/shared/services/ErrorClassificationService';
import type { IJwtValidationService } from '@/shared/services/JwtValidationService';
import { createFakeClock } from './fakeClock';

/**
 * SUT構築時の依存関係の型定義
 */
export interface SUTDependencies {
  readonly userRepository: IUserRepository;
  readonly authProvider: IAuthProvider;
  readonly authDomainService: IAuthenticationDomainService;
  readonly logger: Logger;
  readonly config?: Partial<{
    JWT_MAX_LENGTH: number;
    EXISTING_USER_TIME_LIMIT_MS: number;
    NEW_USER_TIME_LIMIT_MS: number;
  }>;
  readonly jwtValidationService?: IJwtValidationService;
  readonly errorClassificationService?: IErrorClassificationService;
}

/**
 * SUT構築結果の型定義
 */
export interface SUTResult {
  readonly sut: AuthenticateUserUseCase;
  readonly userRepository: IUserRepository;
  readonly authProvider: IAuthProvider;
  readonly authDomainService: IAuthenticationDomainService;
  readonly logger: Logger;
  readonly fakeClock: ReturnType<typeof createFakeClock>;
}

/**
 * デフォルトの依存関係モック
 *
 * @returns モックされた依存関係のセット
 */
function createDefaultDependencies(): SUTDependencies {
  return {
    userRepository: {
      findByExternalId: mock((_externalId: string) => Promise.resolve(null)),
      findById: mock((_id: string) => Promise.resolve(null)),
      findByEmail: mock((_email: string) => Promise.resolve(null)),
      create: mock((_input: CreateUserInput) => Promise.resolve({} as User)),
      update: mock((_id: string, _input: UpdateUserInput) =>
        Promise.resolve({} as User),
      ),
      delete: mock((_id: string) => Promise.resolve()),
    } satisfies IUserRepository,
    authProvider: {
      verifyToken: mock((_token: string) =>
        Promise.resolve({
          valid: false,
          payload: {} as JwtPayload,
          error: '',
        }),
      ),
      getExternalUserInfo: mock((_payload: JwtPayload) =>
        Promise.resolve({} as ExternalUserInfo),
      ),
    } satisfies IAuthProvider,
    authDomainService: {
      createUserFromExternalInfo: mock((_externalInfo: ExternalUserInfo) =>
        Promise.resolve({} as User),
      ),
      authenticateUser: mock((_externalInfo: ExternalUserInfo) =>
        Promise.resolve({
          user: {} as User,
          isNewUser: false,
        }),
      ),
    } satisfies IAuthenticationDomainService,
    logger: {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    } as Logger,
    config: {
      JWT_MAX_LENGTH: 2048,
      EXISTING_USER_TIME_LIMIT_MS: 1000,
      NEW_USER_TIME_LIMIT_MS: 2000,
    },
  };
}

/**
 * テスト用SUTビルダー
 *
 * 依存関係を差し替え可能なAuthenticateUserUseCaseインスタンスを作成。
 * テストの共通セットアップを簡素化し、固定時刻制御機能を提供。
 *
 * @param overrides 置き換えたい依存関係のオーバーライド
 * @returns SUT（テスト対象システム）と依存関係のセット
 */
export function makeSUT(overrides: Partial<SUTDependencies> = {}): SUTResult {
  // デフォルトの依存関係とオーバーライドをマージ
  const defaults = createDefaultDependencies();
  const dependencies = { ...defaults, ...overrides };

  // 固定時間制御用のfakeClockを作成
  const fakeClock = createFakeClock();

  // SUTインスタンスを作成
  const sut = new AuthenticateUserUseCase(
    dependencies.userRepository,
    dependencies.authProvider,
    dependencies.authDomainService,
    dependencies.logger,
    dependencies.config,
    dependencies.jwtValidationService,
    dependencies.errorClassificationService,
  );

  return {
    sut,
    userRepository: dependencies.userRepository,
    authProvider: dependencies.authProvider,
    authDomainService: dependencies.authDomainService,
    logger: dependencies.logger,
    fakeClock,
  };
}
