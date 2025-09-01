import type { NextConfig } from "next";

/**
 * 【Next.js設定】: セキュリティと機能性を両立したNext.js設定
 * 【セキュリティ方針】: 信頼できる外部リソースのみを許可
 * 【画像最適化】: 認証プロバイダーの公式CDNのみを許可リスト化
 * 🟢 信頼性レベル: Next.js公式推奨パターンとセキュリティベストプラクティス
 */
const nextConfig: NextConfig = {
  /**
   * 【画像設定】: 外部画像ホストの安全な許可リスト
   * 【セキュリティ】: OAuth認証プロバイダーの公式CDNのみを信頼
   */
  images: {
    // 【許可ドメイン】: 認証プロバイダーの公式画像ホストのみを厳選
    remotePatterns: [
      {
        // 【Google OAuth】: Googleアカウントのプロフィール画像用CDN
        // ドメイン: lh3.googleusercontent.com (Google公式CDN)
        // 用途: Google認証ユーザーのアバター画像表示
        // セキュリティ: Googleの公式CDNのため安全
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/a/**', // プロフィール画像パスのみに制限
      },
      {
        // 【Google OAuth - 代替CDN】: 古いアカウント用の画像CDN
        // ドメイン: lh4.googleusercontent.com, lh5.googleusercontent.com等
        protocol: 'https',
        hostname: 'lh*.googleusercontent.com',
        pathname: '/a/**',
      },
      // 【将来拡張用】: Apple認証対応時の画像ホスト
      // {
      //   protocol: 'https',
      //   hostname: 'appleid.cdn-apple.com',
      //   pathname: '/profilepicture/**',
      // },
      
      // 【将来拡張用】: Microsoft認証対応時の画像ホスト
      // {
      //   protocol: 'https',
      //   hostname: 'graph.microsoft.com',
      //   pathname: '/v1.0/me/photo/**',
      // },
    ],
    
    // 【画像最適化設定】: パフォーマンス向上のための設定
    formats: ['image/webp', 'image/avif'], // モダンフォーマット優先
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7日間キャッシュ（プロフィール画像は変更頻度が低い）
  },

  // 【開発環境設定】: TypeScriptとReactの厳格モード
  typescript: {
    // 本番ビルド時に型エラーでビルド中断（品質保証）
    ignoreBuildErrors: false,
  },
  
  eslint: {
    // 本番ビルド時にESLintエラーでビルド中断（品質保証）
    ignoreDuringBuilds: false,
  },

  // 【実験的機能】: Next.js 15の新機能を有効化
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
