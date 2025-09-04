'use client';

import { useRouter } from 'next/navigation';
import { UserProfile } from '@/features/google-auth/components/UserProfile';
import { useAppSelector } from '@/store/hooks';

/**
 * 【機能概要】: 認証済みユーザー専用のダッシュボードページ
 * 【実装方針】: E2Eテストを通すための最小限の機能を実装
 * 【テスト対応】: T001 Google OAuth初回ログイン成功フローを通すための実装
 * 🟡 信頼性レベル: テスト要件から推測した基本的なダッシュボード画面
 */
export default function DashboardPage(): React.ReactNode {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  // 【未認証チェック】: 認証されていないユーザーをホームページにリダイレクト
  // 【セキュリティ対応】: 未認証ユーザーのダッシュボードアクセスを防ぐ
  if (!isAuthenticated || !user) {
    // 【エラーログ記録】: 不正なダッシュボードアクセス試行をログに記録
    console.warn('未認証状態でのダッシュボードアクセス試行', {
      isAuthenticated,
      hasUser: !!user,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
    // 【リダイレクト処理】: 認証状態が確認できない場合は安全にホームページに誘導
    router.push('/');
    return null; // 【描画抑制】: リダイレクト中は何も表示しない
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 【ページヘッダー】: ダッシュボードのタイトル表示 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">
            ようこそ！あなたのアカウント情報です。
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
              ようこそ！
            </h2>
            <UserProfile user={user} />
          </div>
        </div>

        {/* 【開発情報】: 開発環境でのみ認証状態をデバッグ表示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-blue-800 mb-2">開発情報:</h3>
            <p className="text-blue-700">認証状態: 認証済み</p>
            <p className="text-blue-700">ユーザーID: {user.id || '未設定'}</p>
            <p className="text-blue-700">
              最終ログイン:{' '}
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString('ja-JP')
                : '未設定'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
