/**
 * 【型定義】: AuthMiddleware用のHono Context拡張型定義
 * 【実装方針】: Global Declaration Mergingによる型安全なContext拡張
 * 【テスト対応】: TypeScriptの型チェックでuserIdアクセスエラーを防ぐ
 * 🟢 信頼性レベル: Honoの公式パターンに基づく確実な実装
 */

import type { JWTPayload } from 'jose';

declare module 'hono' {
  interface ContextVariableMap {
    /**
     * 認証済みユーザーのID
     * AuthMiddleware経由で設定され、Controllerで`c.get('userId')`でアクセス
     */
    userId: string | null;
    
    /**
     * JWT Payload の全体情報
     * 認可チェックやロール判定などで使用
     */
    claims: JWTPayload | null;
  }
}