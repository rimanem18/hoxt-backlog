/**
 * 【機能概要】: User API のルート定義 - GET /user/profile エンドポイントを提供
 * 【改善内容】: DIコンテナ統合、パフォーマンス最適化、テスト独立性向上
 * 【実装方針】: AuthMiddleware統合 + DIパターン + 構造化ログ + テスト環境対応
 * 【パフォーマンス】: シングルトン管理によるメモリリーク防止とCPU効率化
 * 【テスト対応】: 統合テストの独立性確保、モック依存関係注入対応
 * 🟢 信頼性レベル: 実績あるパターンに基づく安定・高性能な認証フロー実装
 */

import { Hono } from 'hono';
import { AuthDIContainer } from '@/infrastructure/di/AuthDIContainer';
import { UserController } from '../controllers/UserController';
import { requireAuth } from '../middleware';

// 【型定義】: AuthMiddleware統合後のContext型（middleware/types/auth.d.tsで拡張済み）
const user = new Hono();

// 【認証ミドルウェア適用】: JWT認証必須のプロフィール取得エンドポイント
user.get('/user/profile', requireAuth(), async (c) => {
  try {
    // 【DIコンテナ統合】: リクエストごとのインスタンス生成問題を解決
    // 【パフォーマンス改善】: シングルトン管理によるメモリリーク防止
    // 【保守性向上】: 依存関係の一元管理と設定変更の影響最小化
    // 🟢 信頼性レベル: AuthDIContainerパターンによる実証済み依存関係管理
    const getUserProfileUseCase = AuthDIContainer.getUserProfileUseCase();

    // 【Controller作成】: Presentation層の処理を準備
    // 【軽量化】: UseCaseはDIコンテナから取得、Controllerのみリクエストごと作成
    const userController = new UserController(getUserProfileUseCase);

    // 【認証済み処理】: AuthMiddleware経由でc.get('userId')が利用可能
    // userId は requireAuth() により保証されているため null チェック不要
    return await userController.getProfile(c);
  } catch (error) {
    // 【構造化セキュリティログ】: DIコンテナ経由のLoggerで統一されたログ出力
    // 【パフォーマンス最適化】: 必要な情報のみ記録し、I/O負荷を最小化
    const logger = AuthDIContainer.getLogger();

    // 【詳細エラー情報収集】: セキュリティ分析に必要な情報を構造化して記録
    const errorContext = {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/user/profile',
      userId: c.get('userId'), // 【認証情報】: AuthMiddleware設定のuserId
      userAgent: c.req.header('user-agent'),
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      stack: error instanceof Error ? error.stack : undefined,
    };

    logger.error('Unexpected error in user profile endpoint', errorContext);

    // 【内部情報隠蔽】: エラー詳細をクライアントに漏洩させない
    // 【統一エラーレスポンス】: 他のAPIエンドポイントとの一貫性を保持
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
