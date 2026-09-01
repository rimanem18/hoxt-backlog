/**
 * viewerTokenMiddleware用のHono Context拡張型定義
 * Global Declaration Mergingによりc.get('viewerEmail')の型安全性を確保する
 */

export {};

declare module 'hono' {
  interface ContextVariableMap {
    /**
     * 検証済みViewerアクセストークンに紐づくメールアドレス
     * viewerTokenMiddleware経由で設定される
     */
    viewerEmail: string;

    /**
     * 検証済みViewerアクセストークンの有効期限
     * viewerTokenMiddleware経由で設定される
     */
    viewerTokenExpiresAt: Date;
  }
}
