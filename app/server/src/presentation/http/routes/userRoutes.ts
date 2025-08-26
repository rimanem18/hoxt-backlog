/**
 * User API のルート定義
 *
 * 【機能概要】: GET /user/profile エンドポイントを提供
 * 【実装方針】: AuthMiddleware統合によるJWT認証 + 依存性注入パターン
 * 【テスト対応】: HTTP統合テストで認証済みユーザーのプロフィール取得を検証
 * 🟢 信頼性レベル: AuthMiddleware統合によるセキュアな認証フロー
 */

import { Hono } from 'hono';
import { UserController } from '../controllers/UserController';
import { GetUserProfileUseCase } from '@/application/usecases/GetUserProfileUseCase';
import { PostgreSQLUserRepository } from '@/infrastructure/database/PostgreSQLUserRepository';
import { requireAuth } from '../middleware';
import type { Logger } from '@/shared/logging/Logger';

// 【型定義】: AuthMiddleware統合後のContext型（middleware/types/auth.d.tsで拡張済み）
const user = new Hono();

// 【認証ミドルウェア適用】: JWT認証必須のプロフィール取得エンドポイント
user.get('/user/profile', requireAuth(), async (c) => {
  try {
    // 【依存性注入】: Repository、Logger、UseCaseの作成
    // 【将来改善予定】: DIコンテナによる統合管理（Refactorフェーズで実装）
    const userRepository = new PostgreSQLUserRepository();
    const logger: Logger = {
      info: (message: string, meta?: unknown) =>
        console.log(`[INFO] ${message}`, meta),
      warn: (message: string, meta?: unknown) =>
        console.warn(`[WARN] ${message}`, meta),
      error: (message: string, meta?: unknown) =>
        console.error(`[ERROR] ${message}`, meta),
      debug: (message: string, meta?: unknown) =>
        console.debug(`[DEBUG] ${message}`, meta),
    };

    // 【UseCase作成】: ビジネスロジック層の処理を準備
    const getUserProfileUseCase = new GetUserProfileUseCase(
      userRepository,
      logger,
    );

    // 【Controller作成】: Presentation層の処理を準備
    const userController = new UserController(getUserProfileUseCase);

    // 【認証済み処理】: AuthMiddleware経由でc.get('userId')が利用可能
    // userId は requireAuth() により保証されているため null チェック不要
    return await userController.getProfile(c);
  } catch (error) {
    // 【セキュリティログ】: 予期しないエラーの詳細記録
    console.error('[SECURITY] Unexpected error in user profile endpoint:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/user/profile',
      userId: c.get('userId'), // 【認証情報】: AuthMiddleware設定のuserId
      userAgent: c.req.header('user-agent'),
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    });

    // 【内部情報隠蔽】: エラー詳細をクライアントに漏洩させない
    return c.json(
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
});

export default user;