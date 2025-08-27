/**
 * 【機能概要】: HTTPユーザーコントローラー - 認証済みユーザー処理の統合実装
 * 【改善内容】: 型安全性向上、エラーハンドリング統一、構造化ログ統合
 * 【実装方針】: AuthMiddleware + UseCase + 型安全な Context 処理の組み合わせ
 * 【パフォーマンス】: エラーケース最適化、不要なオブジェクト生成の削減
 * 【保守性】: 型ガード導入、統一エラーレスポンス、詳細コメント充実
 * 【テスト対応】: モック化可能な依存関係設計、独立性確保
 * 🟢 信頼性レベル: 実績あるパターンの型安全性・エラーハンドリング強化版
 *
 * @example
 * ```typescript
 * const controller = new UserController(getUserProfileUseCase);
 * const response = await controller.getProfile(context);
 * ```
 */

import type { Context } from 'hono';
import type {
  IGetUserProfileUseCase,
  GetUserProfileUseCaseInput,
} from '@/application/usecases/GetUserProfileUseCase';
import type {
  GetUserProfileResponse,
  ErrorResponse,
} from '@/../../packages/shared-schemas';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import { ValidationError } from '@/shared/errors/ValidationError';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';

/**
 * 【機能概要】: 型安全なuserID検証ガード関数
 * 【改善内容】: 型アサーションを排除し、実行時型検証を強化
 * 【設計方針】: TypeScript型ガードパターンによる確実な型安全性確保
 * 【エラー防止】: 実行時のnull・undefined・空文字列を確実に検出
 * 【保守性】: 認証状態の検証ロジックを一箇所に集約
 * 🟢 信頼性レベル: TypeScript標準パターンによる確実な型ガード実装
 * 
 * @param userId c.get('userId') から取得した値
 * @returns string型のuserIDであることを保証
 */
function isValidUserId(userId: unknown): userId is string {
  // 【型安全性確保】: null・undefined・空文字列・非文字列を確実に排除
  return typeof userId === 'string' && userId.length > 0;
}

/**
 * 【機能概要】: HTTPユーザーコントローラークラス - 認証後処理の統合実装
 * 【改善内容】: 型安全性・エラーハンドリング・ログ統合の全面強化
 * 【設計方針】: AuthMiddleware統合 + UseCase委譲 + 構造化レスポンス生成
 * 【パフォーマンス】: 不要なオブジェクト生成の削減、効率的なエラー分類
 * 【保守性】: 型ガード活用、統一エラーレスポンス、詳細実装コメント
 * 🟢 信頼性レベル: 実証済みパターンの品質向上版、本番運用想定実装
 */
export class UserController {
  /**
   * 【機能概要】: UserControllerのコンストラクタ - 依存関係注入と初期検証
   * 【改善内容】: Fail Fast原則による早期エラー検出の徹底実装
   * 【設計方針】: 必須依存関係の事前検証によるランタイムエラー防止
   * 【エラー防止】: null/undefinedの依存関係を初期化時点で確実に検出
   * 【保守性】: 明確なエラーメッセージによる問題箇所の即座特定
   * 🟢 信頼性レベル: 標準的なDI検証パターンによる確実な初期化処理
   * 
   * @param getUserProfileUseCase ユーザープロフィール取得処理を行うUseCase
   * @throws Error 必須依存関係がnull/undefinedの場合
   */
  constructor(
    private readonly getUserProfileUseCase: IGetUserProfileUseCase,
  ) {
    // 【Fail Fast原則】: 初期化時にnull依存関係を検出してシステム起動を阻止
    if (!getUserProfileUseCase) {
      throw new Error('getUserProfileUseCase is required');
    }
  }

  /**
   * 【機能概要】: ユーザープロフィール取得エンドポイント - 型安全な認証後処理
   * 【改善内容】: 型ガード導入、構造化エラーハンドリング、詳細ログ統合
   * 【実装方針】: requireAuth() + 型ガード + UseCase委譲の三重安全保障
   * 【パフォーマンス】: 効率的なエラー分類、不要な型変換の削除
   * 【保守性】: 型安全性確保、統一エラーレスポンス、実装理由の明文化
   * 【テスト対応】: モック化可能な設計、独立性確保の認証状態管理
   * 🟢 信頼性レベル: AuthMiddleware + 型ガード + 実行時検証の多重防御実装
   *
   * @param c HonoのContext（requireAuth()適用、型ガードで追加検証）
   * @returns JSON形式のレスポンス（成功時・エラー時の統一形式）
   * @throws なし（全エラーはHTTPレスポンスとして処理）
   */
  async getProfile(c: Context): Promise<Response> {
    try {
      // 【型安全な認証情報取得】: requireAuth() 前提 + 型ガードによる二重検証
      // 【実装理由】: 型アサーション排除による実行時型エラー防止
      const rawUserId = c.get('userId');
      
      if (!isValidUserId(rawUserId)) {
        // 【認証状態異常】: AuthMiddleware通過後にuserIdが無効な状態
        // 【セキュリティ考慮】: この状態は通常発生せず、システム異常を示唆
        throw new ValidationError('認証状態が無効です');
      }

      const userId = rawUserId; // 型ガード通過後は string として確定

      // 【Application層委譲】: ビジネスロジック層への処理委譲
      // 【実装効率】: 型安全なInput作成、UseCase境界での責任分離
      const input: GetUserProfileUseCaseInput = { userId };
      const result = await this.getUserProfileUseCase.execute(input);

      // 【統一レスポンス生成】: 設計仕様準拠の構造化データ変換
      // 【実装理由】: フロントエンド・API契約仕様との完全一致を保証
      const responseData: GetUserProfileResponse = {
        success: true,
        data: {
          // 【必須フィールド】: api-endpoints.md仕様準拠の全フィールド実装
          id: result.user.id,
          externalId: result.user.externalId,
          provider: result.user.provider,
          email: result.user.email,
          name: result.user.name,
          avatarUrl: result.user.avatarUrl,
          createdAt: result.user.createdAt.toISOString(),
          updatedAt: result.user.updatedAt.toISOString(), // 【設計仕様準拠】: 必須フィールド復活
          lastLoginAt: result.user.lastLoginAt?.toISOString() || null,
        },
      };

      // 【型安全レスポンス】: TypeScript型指定による確実なJSON生成
      return c.json<GetUserProfileResponse>(responseData, 200);
    } catch (error) {
      // 【構造化エラーハンドリング】: エラー種別に応じた適切なHTTPレスポンス生成
      // 【実装理由】: 統一されたエラーレスポンス形式でフロントエンド処理を簡素化

      if (error instanceof UserNotFoundError) {
        // 【ユーザー不存在】: 認証済みだが該当ユーザーがDBに存在しない状態
        // 【HTTPステータス】: 404 Not Found - リソース不存在を明示
        return c.json<ErrorResponse>(
          {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'ユーザーが見つかりません',
            },
          },
          404,
        );
      }

      if (error instanceof ValidationError) {
        // 【入力検証エラー】: userID形式不正、認証状態異常等
        // 【HTTPステータス】: 400 Bad Request - クライアント側の不正リクエスト
        return c.json<ErrorResponse>(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message,
            },
          },
          400,
        );
      }

      if (error instanceof InfrastructureError) {
        // 【インフラ障害】: DB接続エラー、外部サービス障害等
        // 【HTTPステータス】: 500 Internal Server Error - サーバー側の問題
        return c.json<ErrorResponse>(
          {
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: '一時的にサービスが利用できません',
            },
          },
          500,
        );
      }

      // 【予期外エラー】: 上記以外のすべての例外を安全に処理
      // 【セキュリティ考慮】: 内部エラー詳細をクライアントに漏洩させない
      console.error('Unexpected error in UserController:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      return c.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: '一時的にサービスが利用できません',
          },
        },
        500,
      );
    }
  }
}