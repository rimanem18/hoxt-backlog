/**
 * ユーザー認証UseCaseテスト
 * 
 * AuthenticateUserUseCaseの全機能をテストする。
 * 正常系、異常系、境界値、依存関係の統合テストを含む。
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  mock,
  test,
} from 'bun:test';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IAuthenticationDomainService } from '../../../domain/services/IAuthenticationDomainService';
import type {
  ExternalUserInfo,
  IAuthProvider,
  JwtPayload,
  JwtVerificationResult,
} from '../../../domain/services/IAuthProvider';
import { AuthenticationError } from '../../../domain/user/errors/AuthenticationError';
import type { User } from '../../../domain/user/UserEntity';
import { ExternalServiceError } from '../../../shared/errors/ExternalServiceError';
import { InfrastructureError } from '../../../shared/errors/InfrastructureError';
import { ValidationError } from '../../../shared/errors/ValidationError';
import type { Logger } from '../../../shared/logging/Logger';
import type {
  AuthenticateUserUseCaseInput,
  IAuthenticateUserUseCase,
} from '../../interfaces/IAuthenticateUserUseCase';

// AuthenticateUserUseCaseの実装完了（Greenフェーズ）
import { AuthenticateUserUseCase } from '../AuthenticateUserUseCase';

describe('AuthenticateUserUseCase（TASK-105）', () => {
  // モック依存関係の定義
  let mockUserRepository: IUserRepository;
  let mockAuthProvider: IAuthProvider;
  let mockAuthDomainService: IAuthenticationDomainService;
  let mockLogger: Logger;
  let authenticateUserUseCase: IAuthenticateUserUseCase;

  beforeEach(() => {
    // 各テストで使用するモックオブジェクトを初期化
    mockUserRepository = {
      findByExternalId: mock(),
      findById: mock(),
      findByEmail: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    };

    mockAuthProvider = {
      verifyToken: mock(),
      getExternalUserInfo: mock(),
    };

    mockAuthDomainService = {
      createUserFromExternalInfo: mock(),
      authenticateUser: mock(),
    };

    mockLogger = {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    } as any;

    // UseCaseインスタンスを初期化
    authenticateUserUseCase = new AuthenticateUserUseCase(
      mockUserRepository,
      mockAuthProvider,
      mockAuthDomainService,
      mockLogger,
    );
  });

  afterEach(() => {
    // Bunでは各テストで新しいmockインスタンスを作成することでモックをクリア
  });

  // ========================================================================
  // 1. execute メソッドの正常系テストケース
  // ========================================================================

  describe('正常系テスト', () => {
    test('有効なJWTで既存ユーザーの認証が成功する', async () => {
      const input: AuthenticateUserUseCaseInput = {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5MCIsImVtYWlsIjoiZXhpc3RpbmdAZXhhbXBsZS5jb20ifQ.test-signature',
      };

      const existingUser: User = {
        id: 'uuid-4-existing-user',
        externalId: 'google_1234567890',
        provider: 'google',
        email: 'existing@example.com',
        name: '田中太郎',
        avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
        createdAt: new Date('2025-08-01T10:00:00Z'),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      const jwtPayload: JwtPayload = {
        sub: 'google_1234567890',
        email: 'existing@example.com',
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
        user_metadata: {
          name: '田中太郎',
          avatar_url: 'https://lh3.googleusercontent.com/avatar.jpg',
          email: 'existing@example.com',
          full_name: '田中太郎',
        },
        iss: 'https://supabase.co',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const externalUserInfo: ExternalUserInfo = {
        id: 'google_1234567890',
        provider: 'google',
        email: 'existing@example.com',
        name: '田中太郎',
        avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
      };

      // Given: 既存ユーザー認証フローのモック設定
      (mockAuthProvider.verifyToken as Mock<any>).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      } as JwtVerificationResult);

      (mockAuthProvider.getExternalUserInfo as Mock<any>).mockResolvedValue(
        externalUserInfo,
      );

      (mockAuthDomainService.authenticateUser as Mock<any>).mockResolvedValue({
        user: existingUser,
        isNewUser: false,
      });

      // When: 認証処理を実行
      const result = await authenticateUserUseCase.execute(input);

      // Then: 認証結果を検証
      expect(result).toBeDefined();

      // 既存ユーザー情報が正確に返却されることを確認
      expect(result.user.id).toBe('uuid-4-existing-user');
      expect(result.user.externalId).toBe('google_1234567890');
      expect(result.user.email).toBe('existing@example.com');
      expect(result.user.name).toBe('田中太郎');

      // 既存ユーザーなのisNewUserはfalse
      expect(result.isNewUser).toBe(false);

      // 依存関係が適切に呼び出されることを確認
      expect(mockAuthProvider.verifyToken).toHaveBeenCalledWith(input.jwt);
      expect(mockAuthProvider.getExternalUserInfo).toHaveBeenCalledWith(
        jwtPayload,
      );
      expect(mockAuthDomainService.authenticateUser).toHaveBeenCalledWith(
        externalUserInfo,
      );
    });

    test('有効なJWTで新規ユーザーのJIT作成が成功する', async () => {
      const input: AuthenticateUserUseCaseInput = {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfOTg3NjU0MzIxMCIsImVtYWlsIjoibmV3dXNlckBleGFtcGxlLmNvbSJ9.test-signature',
      };

      const newUser: User = {
        id: 'uuid-4-new-user',
        externalId: 'google_9876543210',
        provider: 'google',
        email: 'newuser@example.com',
        name: '山田花子',
        avatarUrl: 'https://lh3.googleusercontent.com/new-avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      const jwtPayload: JwtPayload = {
        sub: 'google_9876543210',
        email: 'newuser@example.com',
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
        user_metadata: {
          name: '山田花子',
          avatar_url: 'https://lh3.googleusercontent.com/new-avatar.jpg',
          email: 'newuser@example.com',
          full_name: '山田花子',
        },
        iss: 'https://supabase.co',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const externalUserInfo: ExternalUserInfo = {
        id: 'google_9876543210',
        provider: 'google',
        email: 'newuser@example.com',
        name: '山田花子',
        avatarUrl: 'https://lh3.googleusercontent.com/new-avatar.jpg',
      };

      // Given: 新規ユーザーJIT作成フローのモック設定
      (
        mockAuthProvider.verifyToken as Mock<
          (token: string) => Promise<JwtVerificationResult>
        >
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      } as JwtVerificationResult);

      (
        mockAuthProvider.getExternalUserInfo as Mock<
          (payload: JwtPayload) => Promise<ExternalUserInfo>
        >
      ).mockResolvedValue(externalUserInfo);

      (
        mockAuthDomainService.authenticateUser as Mock<
          (
            externalInfo: ExternalUserInfo,
          ) => Promise<{ user: User; isNewUser: boolean }>
        >
      ).mockResolvedValue({
        user: newUser,
        isNewUser: true,
      });

      // When: JIT作成処理を実行
      const result = await authenticateUserUseCase.execute(input);

      // Then: JIT作成結果を検証
      expect(result).toBeDefined();

      // 新規作成ユーザー情報が正確に返却されることを確認
      expect(result.user.id).toBe('uuid-4-new-user');
      expect(result.user.externalId).toBe('google_9876543210');
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.name).toBe('山田花子');

      // 新規ユーザーなのisNewUserはtrue
      expect(result.isNewUser).toBe(true);

      // 初回ログイン日時が現在時刻から5秒以内で設定されることを確認
      const timeDiff = Math.abs(
        (result.user.lastLoginAt?.getTime() || 0) - Date.now(),
      );
      expect(timeDiff).toBeLessThan(5000);

      // 作成日時・更新日時が現在時刻から5秒以内で初期化されることを確認
      const createdTimeDiff = Math.abs(
        result.user.createdAt.getTime() - Date.now(),
      );
      const updatedTimeDiff = Math.abs(
        result.user.updatedAt.getTime() - Date.now(),
      );
      expect(createdTimeDiff).toBeLessThan(5000);
      expect(updatedTimeDiff).toBeLessThan(5000);
    });
  });

  // ========================================================================
  // 2. execute メソッドの異常系テストケース
  // ========================================================================

  describe('異常系テスト', () => {
    test('無効なJWTで認証エラーが発生する', async () => {
      const input: AuthenticateUserUseCaseInput = {
        jwt: 'invalid.jwt.token',
      };

      // Given: JWT検証失敗パターンのモック設定
      (
        mockAuthProvider.verifyToken as Mock<
          (token: string) => Promise<JwtVerificationResult>
        >
      ).mockResolvedValue({
        valid: false,
        error: 'Invalid signature',
      } as JwtVerificationResult);

      // When & Then: 無効なJWTで認証し、AuthenticationErrorがスローされることを確認
      await expect(authenticateUserUseCase.execute(input)).rejects.toThrow(
        AuthenticationError,
      );
      await expect(authenticateUserUseCase.execute(input)).rejects.toThrow(
        '認証トークンが無効です',
      );

      // JWT検証が呼び出されることを確認
      expect(mockAuthProvider.verifyToken).toHaveBeenCalledWith(input.jwt);

      // 後続処理が実行されていないことを確認
      expect(mockAuthProvider.getExternalUserInfo).not.toHaveBeenCalled();
      expect(mockAuthDomainService.authenticateUser).not.toHaveBeenCalled();
    });

    test('データベース接続エラー時に適切なエラーが発生する', async () => {
      // 【テスト目的】: UserRepositoryでのDB操作失敗時のエラー処理
      // 【テスト内容】: インフラ障害時の適切なエラーレスポンスとシステム安定性確保
      // 【期待される動作】: 部分的な状態更新を防ぎ、データ整合性を保持
      // 🟢 可用性制約・エラーハンドリング要件から明確に定義済み

      // 【テストデータ準備】: 有効なJWT（DB障害は別要因）
      // 【初期条件設定】: JWT検証は成功するがDB操作でエラーが発生
      const input: AuthenticateUserUseCaseInput = {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfZGJlcnJvciIsImVtYWlsIjoiZGJlcnJvckBleGFtcGxlLmNvbSJ9.test-signature',
      };

      const jwtPayload: JwtPayload = {
        sub: 'google_1234567890',
        email: 'user@example.com',
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
        user_metadata: {
          name: 'テストユーザー',
          email: 'user@example.com',
          full_name: 'テストユーザー',
        },
        iss: 'https://supabase.co',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const externalUserInfo: ExternalUserInfo = {
        id: 'google_1234567890',
        provider: 'google',
        email: 'user@example.com',
        name: 'テストユーザー',
      };

      // 【モック設定】: JWT検証成功後のDB障害パターン
      (
        mockAuthProvider.verifyToken as Mock<
          (token: string) => Promise<JwtVerificationResult>
        >
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (
        mockAuthProvider.getExternalUserInfo as Mock<
          (payload: JwtPayload) => Promise<ExternalUserInfo>
        >
      ).mockResolvedValue(externalUserInfo);

      (
        mockAuthDomainService.authenticateUser as Mock<
          (
            externalInfo: ExternalUserInfo,
          ) => Promise<{ user: User; isNewUser: boolean }>
        >
      ).mockRejectedValue(
        new InfrastructureError('ユーザー情報の取得に失敗しました'),
      );

      // 【実際の処理実行】: DB障害発生時の処理
      // 【処理内容】: JWT検証成功→DB操作失敗→InfrastructureError例外スロー

      // 【結果検証】: InfrastructureError例外の適切なスロー確認
      // 【期待値確認】: 技術的詳細を隠し、ユーザーフレンドリーなメッセージ
      await expect(authenticateUserUseCase.execute(input)).rejects.toThrow(
        InfrastructureError,
      );
      await expect(authenticateUserUseCase.execute(input)).rejects.toThrow(
        'ユーザー情報の取得に失敗しました',
      );

      // 【検証項目】: 正常な処理フローの確認（JWT検証まで）
      // 🟢 エラーハンドリング制約から明確に定義済み
      expect(mockAuthProvider.verifyToken).toHaveBeenCalledWith(input.jwt);
      expect(mockAuthProvider.getExternalUserInfo).toHaveBeenCalledWith(
        jwtPayload,
      );
      expect(mockAuthDomainService.authenticateUser).toHaveBeenCalledWith(
        externalUserInfo,
      );
    });

    test('SupabaseAuthProvider障害時に適切なエラーが発生する', async () => {
      // 【テスト目的】: IAuthProviderの内部で外部サービス接続に失敗した場合
      // 【テスト内容】: 外部依存サービス障害に対する適切な障害処理
      // 【期待される動作】: 外部サービス障害でも適切にエラー処理し、システム継続
      // 🟢 EARS要件EDGE-004から明確に定義済み

      // 【テストデータ準備】: 有効なJWTだがSupabase側で障害
      // 【初期条件設定】: Supabase API障害、ネットワーク接続問題、レート制限
      const input: AuthenticateUserUseCaseInput = {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfc3VwYWJhc2VlcnJvciIsImVtYWlsIjoic3VwYWJhc2VlcnJvckBleGFtcGxlLmNvbSJ9.test-signature',
      };

      // 【モック設定】: Supabase障害パターン
      (
        mockAuthProvider.verifyToken as Mock<
          (token: string) => Promise<JwtVerificationResult>
        >
      ).mockRejectedValue(
        new ExternalServiceError('認証サービスが一時的に利用できません'),
      );

      // 【実際の処理実行】: 外部サービス障害発生時の処理
      // 【処理内容】: JWT検証でSupabase障害→ExternalServiceError例外スロー

      // 【結果検証】: ExternalServiceError例外の適切なスロー確認
      // 【期待値確認】: 外部サービス障害を示すユーザー向けメッセージ
      await expect(authenticateUserUseCase.execute(input)).rejects.toThrow(
        ExternalServiceError,
      );
      await expect(authenticateUserUseCase.execute(input)).rejects.toThrow(
        '認証サービスが一時的に利用できません',
      );

      // 【検証項目】: JWT検証の試行確認
      // 🟢 外部サービス依存制約から明確に定義済み
      expect(mockAuthProvider.verifyToken).toHaveBeenCalledWith(input.jwt);

      // 【検証項目】: 後続処理が実行されていないことの確認
      // 🟢 エラー処理制約から明確に定義済み
      expect(mockAuthProvider.getExternalUserInfo).not.toHaveBeenCalled();
      expect(mockAuthDomainService.authenticateUser).not.toHaveBeenCalled();
    });

    test('同一ユーザーの同時JIT作成で適切に処理される', async () => {
      // 【テスト目的】: 同一externalId+providerのユーザーを複数リクエストで同時作成
      // 【テスト内容】: 並行処理でのデータ整合性保証とユーザー重複回避
      // 【期待される動作】: データ整合性を保ち、ユーザーには透過的に処理
      // 🟡 データベース制約・並行処理から妥当な推測

      // 【テストデータ準備】: 複数の並行リクエストで同一ユーザーのJWT
      // 【初期条件設定】: unique制約違反（複数プロセスでの同時INSERT）
      const input: AuthenticateUserUseCaseInput = {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfY29uY3VycmVudF91c2VyIiwiZW1haWwiOiJjb25jdXJyZW50QGV4YW1wbGUuY29tIn0.test-signature',
      };

      const existingUser: User = {
        id: 'uuid-4-first-created-user',
        externalId: 'google_concurrent_user',
        provider: 'google',
        email: 'concurrent@example.com',
        name: '並行処理ユーザー',
        avatarUrl: 'https://lh3.googleusercontent.com/concurrent-avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      const jwtPayload: JwtPayload = {
        sub: 'google_concurrent_user',
        email: 'concurrent@example.com',
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
        user_metadata: {
          name: '並行処理ユーザー',
          email: 'concurrent@example.com',
          full_name: '並行処理ユーザー',
        },
        iss: 'https://supabase.co',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const externalUserInfo: ExternalUserInfo = {
        id: 'google_concurrent_user',
        provider: 'google',
        email: 'concurrent@example.com',
        name: '並行処理ユーザー',
      };

      // 【モック設定】: 2回目以降のリクエストで既存ユーザーとして処理
      (
        mockAuthProvider.verifyToken as Mock<
          (token: string) => Promise<JwtVerificationResult>
        >
      ).mockResolvedValue({
        valid: true,
        payload: jwtPayload,
      });

      (
        mockAuthProvider.getExternalUserInfo as Mock<
          (payload: JwtPayload) => Promise<ExternalUserInfo>
        >
      ).mockResolvedValue(externalUserInfo);

      (
        mockAuthDomainService.authenticateUser as Mock<
          (
            externalInfo: ExternalUserInfo,
          ) => Promise<{ user: User; isNewUser: boolean }>
        >
      ).mockResolvedValue({
        user: existingUser,
        isNewUser: false, // 重複作成ではなく既存ユーザーとして扱う
      });

      // 【実際の処理実行】: 並行処理での重複制約処理
      // 【処理内容】: JWT検証→ユーザー検索（既存発見）→既存ユーザー認証
      const result = await authenticateUserUseCase.execute(input);

      // 【結果検証】: 既存ユーザーとしての正常処理確認
      // 【期待値確認】: エラーとせず、既存ユーザー認証として正常処理

      // 【検証項目】: 処理成功確認
      // 🟡 並行処理制約から妥当な推測
      expect(result).toBeDefined();

      // 【検証項目】: 先に作成されたユーザー情報の返却確認
      // 🟡 データ整合性制約から妥当な推測
      expect(result.user.id).toBe('uuid-4-first-created-user');
      expect(result.user.externalId).toBe('google_concurrent_user');

      // 【検証項目】: 重複作成フラグの適切な設定確認
      // 🟡 並行処理での既存ユーザー扱いから妥当な推測
      expect(result.isNewUser).toBe(false);
    });
  });

  // ========================================================================
  // 3. execute メソッドの境界値テストケース
  // ========================================================================

  describe('境界値テスト', () => {
    test('空文字・null JWTで適切なエラーが発生する', async () => {
      // 【テスト目的】: 文字列入力の最小値（空文字・null・undefined）での動作保証
      // 【テスト内容】: 入力検証の網羅性と適切なエラーメッセージ
      // 【期待される動作】: 無効入力でのクラッシュや予期しない動作の防止
      // 🟢 入力検証制約から明確に定義済み

      // 【テストデータ準備】: 文字列パラメータの無効値の代表例
      // 【初期条件設定】: フロントエンドでのトークン取得失敗、初期化不備
      const emptyInput: AuthenticateUserUseCaseInput = { jwt: '' };
      const nullInput = { jwt: null as any };
      const undefinedInput = { jwt: undefined as any };

      // 【実際の処理実行】: 無効入力での処理実行
      // 【処理内容】: 入力検証→ValidationError例外スロー

      // 【結果検証】: 無効入力に対する統一的なバリデーションエラー
      // 【期待値確認】: null・empty・undefinedすべてで同じエラー処理

      // 【検証項目】: 空文字での ValidationError 確認
      // 🟢 入力検証制約から明確に定義済み
      await expect(authenticateUserUseCase.execute(emptyInput)).rejects.toThrow(
        ValidationError,
      );
      await expect(authenticateUserUseCase.execute(emptyInput)).rejects.toThrow(
        'JWTトークンが必要です',
      );

      // 【検証項目】: null値での ValidationError 確認
      // 🟢 入力検証制約から明確に定義済み
      await expect(authenticateUserUseCase.execute(nullInput)).rejects.toThrow(
        ValidationError,
      );
      await expect(authenticateUserUseCase.execute(nullInput)).rejects.toThrow(
        'JWTトークンが必要です',
      );

      // 【検証項目】: undefined値での ValidationError 確認
      // 🟢 入力検証制約から明確に定義済み
      await expect(
        authenticateUserUseCase.execute(undefinedInput),
      ).rejects.toThrow(ValidationError);
      await expect(
        authenticateUserUseCase.execute(undefinedInput),
      ).rejects.toThrow('JWTトークンが必要です');
    });

    test('非常に長いJWTが適切に処理される', async () => {
      // 【テスト目的】: JWT文字列の実用的最大長での処理能力確認
      // 【テスト内容】: メモリ効率とパフォーマンスの維持
      // 【期待される動作】: 大きなデータでも安定した処理
      // 🟡 JWT仕様・パフォーマンス制約から妥当な推測

      // 【テストデータ準備】: 2KB程度の長大JWT（JWT標準的上限）
      // 【初期条件設定】: 大量のclaim情報を含むJWT、複数権限を持つユーザー
      const longJwtInput: AuthenticateUserUseCaseInput = {
        jwt:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
          'a'.repeat(2048) +
          '.valid-signature',
      };

      // 【モック設定】: 長大JWTでも正常処理またはサイズ制限エラー
      (
        mockAuthProvider.verifyToken as Mock<
          (token: string) => Promise<JwtVerificationResult>
        >
      ).mockResolvedValue({
        valid: true,
        payload: {
          sub: 'google_long_claims_user',
          email: 'longclaims@example.com',
          app_metadata: { provider: 'google', providers: ['google'] },
          user_metadata: {
            name: '長いクレームユーザー',
            email: 'longclaims@example.com',
            full_name: '長いクレームユーザー',
          },
          iss: 'https://supabase.co',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      });

      (
        mockAuthProvider.getExternalUserInfo as Mock<
          (payload: JwtPayload) => Promise<ExternalUserInfo>
        >
      ).mockResolvedValue({
        id: 'google_long_claims_user',
        provider: 'google',
        email: 'longclaims@example.com',
        name: '長いクレームユーザー',
      });

      (
        mockAuthDomainService.authenticateUser as Mock<
          (
            externalInfo: ExternalUserInfo,
          ) => Promise<{ user: User; isNewUser: boolean }>
        >
      ).mockResolvedValue({
        user: {
          id: 'uuid-4-long-claims-user',
          externalId: 'google_long_claims_user',
          provider: 'google',
          email: 'longclaims@example.com',
          name: '長いクレームユーザー',
          avatarUrl: 'https://example.com/avatar.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        },
        isNewUser: false,
      });

      // 【実際の処理実行】: 長大JWTでの処理実行
      // 【処理内容】: 大きなデータでもメモリ効率を保ちながら処理

      // 【結果検証】: 正常に処理されるか、適切な制限エラー
      // 【期待値確認】: メモリ効率を保ちながら適切な制限適用

      // 【検証項目】: 長大JWTでの処理成功または適切な制限エラー
      // 🟡 JWT最大長制約から妥当な推測
      try {
        const result = await authenticateUserUseCase.execute(longJwtInput);

        // 正常処理の場合の確認
        expect(result).toBeDefined();
        expect(result.user.externalId).toBe('google_long_claims_user');
      } catch (error) {
        // サイズ制限エラーの場合の確認
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain(
          'JWTサイズが上限を超えています',
        );
      }
    });

    test('認証処理が時間制限内に完了する', async () => {
      // 【テスト目的】: 既存ユーザー認証1秒以内、JIT作成2秒以内の性能要件
      // 【テスト内容】: 要件で定められたレスポンス時間の確実な遵守
      // 【期待される動作】: 負荷状況に関わらず要件内での処理完了
      // 🟢 NFR-002・NFR-003パフォーマンス要件から明確に定義済み

      // 【テストデータ準備】: 既存ユーザーの認証性能測定
      // 【初期条件設定】: NFR-002（1秒）・NFR-003（2秒）の性能要件
      const existingUserInput: AuthenticateUserUseCaseInput = {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfcGVyZm9ybWFuY2UiLCJlbWFpbCI6InBlcmZvcm1hbmNlQGV4YW1wbGUuY29tIn0.test-signature',
      };

      const newUserInput: AuthenticateUserUseCaseInput = {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfbmV3X3VzZXIiLCJlbWFpbCI6Im5ld3VzZXJAZXhhbXBsZS5jb20ifQ.test-signature',
      };

      // 既存ユーザー認証の性能テスト
      {
        // 【モック設定】: 既存ユーザー認証フロー
        (
          mockAuthProvider.verifyToken as Mock<
            (token: string) => Promise<JwtVerificationResult>
          >
        ).mockResolvedValue({
          valid: true,
          payload: {
            sub: 'existing_perf_user',
            email: 'existing@perf.com',
            app_metadata: { provider: 'google', providers: ['google'] },
            user_metadata: {
              name: '性能テストユーザー',
              email: 'existing@perf.com',
              full_name: '性能テストユーザー',
            },
            iss: 'https://supabase.co',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
          },
        });

        (
          mockAuthProvider.getExternalUserInfo as Mock<
            (payload: JwtPayload) => Promise<ExternalUserInfo>
          >
        ).mockResolvedValue({
          id: 'existing_perf_user',
          provider: 'google',
          email: 'existing@perf.com',
          name: '性能テストユーザー',
        });

        (
          mockAuthDomainService.authenticateUser as Mock<
            (
              externalInfo: ExternalUserInfo,
            ) => Promise<{ user: User; isNewUser: boolean }>
          >
        ).mockResolvedValue({
          user: {
            id: 'uuid-existing-perf',
            externalId: 'existing_perf_user',
            provider: 'google',
            email: 'existing@perf.com',
            name: '性能テストユーザー',
            avatarUrl: 'https://example.com/perf-avatar.jpg',
            createdAt: new Date('2025-08-01'),
            updatedAt: new Date(),
            lastLoginAt: new Date(),
          },
          isNewUser: false,
        });

        // 【実際の処理実行】: 既存ユーザー認証の性能測定
        // 【処理内容】: 実運用での標準的な認証処理パフォーマンス
        const startTime = performance.now();
        const result = await authenticateUserUseCase.execute(existingUserInput);
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        // 【結果検証】: 性能要件を満たすレスポンス時間
        // 【期待値確認】: システム負荷下でも要求水準を維持

        // 【検証項目】: 既存ユーザー認証の1秒以内完了確認
        // 🟢 NFR-002性能要件から明確に定義済み
        expect(executionTime).toBeLessThan(1000);
        expect(result).toBeDefined();
        expect(result.isNewUser).toBe(false);
      }

      // 新規ユーザーJIT作成の性能テスト
      {
        // 【モック設定】: 新規ユーザーJIT作成フロー
        (
          mockAuthProvider.verifyToken as Mock<
            (token: string) => Promise<JwtVerificationResult>
          >
        ).mockClear();
        (
          mockAuthProvider.getExternalUserInfo as Mock<
            (payload: JwtPayload) => Promise<ExternalUserInfo>
          >
        ).mockClear();
        (
          mockAuthDomainService.authenticateUser as Mock<
            (
              externalInfo: ExternalUserInfo,
            ) => Promise<{ user: User; isNewUser: boolean }>
          >
        ).mockClear();

        (
          mockAuthProvider.verifyToken as Mock<
            (token: string) => Promise<JwtVerificationResult>
          >
        ).mockResolvedValue({
          valid: true,
          payload: {
            sub: 'new_perf_user',
            email: 'new@perf.com',
            app_metadata: { provider: 'google', providers: ['google'] },
            user_metadata: {
              name: '新規性能テストユーザー',
              email: 'new@perf.com',
              full_name: '新規性能テストユーザー',
            },
            iss: 'https://supabase.co',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
          },
        });

        (
          mockAuthProvider.getExternalUserInfo as Mock<
            (payload: JwtPayload) => Promise<ExternalUserInfo>
          >
        ).mockResolvedValue({
          id: 'new_perf_user',
          provider: 'google',
          email: 'new@perf.com',
          name: '新規性能テストユーザー',
        });

        (
          mockAuthDomainService.authenticateUser as Mock<
            (
              externalInfo: ExternalUserInfo,
            ) => Promise<{ user: User; isNewUser: boolean }>
          >
        ).mockResolvedValue({
          user: {
            id: 'uuid-new-perf',
            externalId: 'new_perf_user',
            provider: 'google',
            email: 'new@perf.com',
            name: '新規性能テストユーザー',
            avatarUrl: 'https://example.com/new-perf-avatar.jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: new Date(),
          },
          isNewUser: true,
        });

        // 【実際の処理実行】: 新規ユーザーJIT作成の性能測定
        const startTime = performance.now();
        const result = await authenticateUserUseCase.execute(newUserInput);
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        // 【検証項目】: JIT作成の2秒以内完了確認
        // 🟢 NFR-003性能要件から明確に定義済み
        expect(executionTime).toBeLessThan(2000);
        expect(result).toBeDefined();
        expect(result.isNewUser).toBe(true);
      }
    });
  });

  // ========================================================================
  // 4. 依存関係・統合テストケース
  // ========================================================================

  describe('依存関係・統合テスト', () => {
    test('必要な依存関係が正しく注入される', async () => {
      // 【テスト目的】: コンストラクタでのDI、インターフェースへの依存、null/undefined注入の検出
      // 【テスト内容】: すべての依存関係が適切に注入され、nullチェックが機能する
      // 【期待される動作】: 依存性逆転の原則遵守、適切なDI設計
      // 🟢 DI・クリーンアーキテクチャ制約から明確に定義済み

      // 【テストデータ準備】: 正常なDIと不正なDI（null依存関係）
      // 【初期条件設定】: DI設計の検証とnull依存関係の検出

      // 【検証項目】: 正常なDI時のインスタンス化成功確認
      // 🟢 DI制約から明確に定義済み
      expect(() => {
        const useCase = new AuthenticateUserUseCase(
          mockUserRepository,
          mockAuthProvider,
          mockAuthDomainService,
          mockLogger,
        );
        expect(useCase).toBeDefined();
      }).not.toThrow();

      // 【検証項目】: null依存関係での初期化時エラー確認
      // 🟢 DI制約から明確に定義済み
      expect(() => {
        new AuthenticateUserUseCase(
          null as any,
          mockAuthProvider,
          mockAuthDomainService,
          mockLogger,
        );
      }).toThrow('Required dependency userRepository is null');

      // 【検証項目】: 依存関係の型確認（インターフェースへの依存）
      // 🟢 クリーンアーキテクチャ制約から明確に定義済み
      expect(mockUserRepository).toBeDefined();
      expect(mockAuthProvider).toBeDefined();
      expect(mockAuthDomainService).toBeDefined();
      expect(mockLogger).toBeDefined();

      expect(typeof mockUserRepository.findByExternalId).toBe('function');
      expect(typeof mockAuthProvider.verifyToken).toBe('function');
      expect(typeof mockAuthDomainService.authenticateUser).toBe('function');
      expect(typeof mockLogger.info).toBe('function');
    });

    test('認証成功・失敗時に適切なログが出力される', async () => {
      // 【テスト目的】: 認証試行の監査ログ、エラー時の詳細ログ、セキュリティ情報の秘匿
      // 【テスト内容】: 成功・失敗・エラーの各状況で適切なレベルとメッセージでログ出力
      // 【期待される動作】: 適切なログレベル、機密情報の秘匿、デバッグ情報の充実度
      // 🟢 監査要件・デバッグ要件から明確に定義済み

      // 【テストデータ準備】: 各種認証シナリオのJWT
      // 【初期条件設定】: 成功・失敗・エラーの各パターンでのログ出力確認
      const successJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfbG9nX3Rlc3QiLCJlbWFpbCI6ImxvZ3Rlc3RAZXhhbXBsZS5jb20ifQ.test-signature';
      const failureJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpbnZhbGlkX3VzZXIiLCJlbWFpbCI6ImludmFsaWRAZXhhbXBsZS5jb20ifQ.invalid-signature';

      // 成功時ログテスト
      {
        const successUser: User = {
          id: 'uuid-log-test-user',
          externalId: 'google_log_test',
          provider: 'google',
          email: 'logtest@example.com',
          name: 'ログテストユーザー',
          avatarUrl: 'https://lh3.googleusercontent.com/log-test-avatar.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        };

        (
          mockAuthProvider.verifyToken as Mock<
            (token: string) => Promise<JwtVerificationResult>
          >
        ).mockResolvedValue({
          valid: true,
          payload: {
            sub: 'google_log_test',
            email: 'logtest@example.com',
            app_metadata: { provider: 'google', providers: ['google'] },
            user_metadata: {
              name: 'ログテストユーザー',
              email: 'logtest@example.com',
              full_name: 'ログテストユーザー',
            },
            iss: 'https://supabase.co',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
          },
        });

        (
          mockAuthProvider.getExternalUserInfo as Mock<
            (payload: JwtPayload) => Promise<ExternalUserInfo>
          >
        ).mockResolvedValue({
          id: 'google_log_test',
          provider: 'google',
          email: 'logtest@example.com',
          name: 'ログテストユーザー',
        });

        (
          mockAuthDomainService.authenticateUser as Mock<
            (
              externalInfo: ExternalUserInfo,
            ) => Promise<{ user: User; isNewUser: boolean }>
          >
        ).mockResolvedValue({
          user: successUser,
          isNewUser: false,
        });

        // 【実際の処理実行】: 成功パターンでの実行
        await authenticateUserUseCase.execute({ jwt: successJwt });

        // 【検証項目】: 成功時の適切なログ出力確認
        // 🟢 監査要件から明確に定義済み
        expect(mockLogger.info).toHaveBeenCalledWith(
          'User authentication successful',
          expect.objectContaining({
            userId: 'uuid-log-test-user',
            externalId: 'google_log_test',
            isNewUser: false,
          }),
        );
      }
      (
        mockAuthProvider.verifyToken as Mock<
          (token: string) => Promise<JwtVerificationResult>
        >
      ).mockClear();
      (
        mockLogger.warn as Mock<
          (message: string, meta?: Record<string, unknown>) => void
        >
      ).mockClear();

      (
        mockAuthProvider.verifyToken as Mock<
          (token: string) => Promise<JwtVerificationResult>
        >
      ).mockResolvedValue({
        valid: false,
        error: 'Invalid signature',
      });

      // 【実際の処理実行】: 失敗パターンでの実行
      try {
        await authenticateUserUseCase.execute({ jwt: failureJwt });
      } catch (_error) {
        // エラーは期待される動作
      }

      // 【検証項目】: 失敗時の適切なログ出力確認（Refactor改善版）
      // 🟢 監査要件 + Geminiセキュリティレビューの改善案を反映
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User authentication failed',
        expect.objectContaining({
          reason: 'Invalid JWT',
        }),
      );
      (
        mockAuthProvider.verifyToken as Mock<
          (token: string) => Promise<JwtVerificationResult>
        >
      ).mockClear();
      (
        mockAuthDomainService.authenticateUser as Mock<
          (
            externalInfo: ExternalUserInfo,
          ) => Promise<{ user: User; isNewUser: boolean }>
        >
      ).mockClear();
      (
        mockLogger.error as Mock<
          (message: string, meta?: Record<string, unknown>) => void
        >
      ).mockClear();

      (
        mockAuthProvider.verifyToken as Mock<
          (token: string) => Promise<JwtVerificationResult>
        >
      ).mockResolvedValue({
        valid: true,
        payload: {
          sub: 'error_log_test',
          email: 'error@example.com',
          app_metadata: { provider: 'google', providers: ['google'] },
          user_metadata: {
            name: 'エラーテストユーザー',
            email: 'error@example.com',
            full_name: 'エラーテストユーザー',
          },
          iss: 'https://supabase.co',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      });

      (
        mockAuthProvider.getExternalUserInfo as Mock<
          (payload: JwtPayload) => Promise<ExternalUserInfo>
        >
      ).mockResolvedValue({
        id: 'error_log_test',
        provider: 'google',
        email: 'error@example.com',
        name: 'エラーテストユーザー',
      });

      (
        mockAuthDomainService.authenticateUser as Mock<
          (
            externalInfo: ExternalUserInfo,
          ) => Promise<{ user: User; isNewUser: boolean }>
        >
      ).mockRejectedValue(new Error('Database connection failed'));

      // 【実際の処理実行】: エラーパターンでの実行
      try {
        await authenticateUserUseCase.execute({ jwt: successJwt });
      } catch (_error) {
        // エラーは期待される動作
      }

      // 【検証項目】: エラー時の適切なログ出力確認（機密情報秘匿）
      // 🟢 セキュリティ要件から明確に定義済み
      expect(mockLogger.error).toHaveBeenCalledWith(
        'User authentication error',
        expect.objectContaining({
          error: 'Database connection failed',
          jwt: '[REDACTED]', // JWT情報の秘匿確認
        }),
      );
    });
  });
});
