'use client';

import { useRouter } from 'next/navigation';
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

        {/* 【ユーザー情報カード】: 認証済みユーザーの基本情報を表示 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            ユーザー情報
          </h2>

          {/* 【ユーザー名表示】: E2Eテストで検証される要素 */}
          <div className="mb-4">
            <div className="block text-sm font-medium text-gray-700 mb-1">
              名前
            </div>
            <p
              data-testid="user-name"
              className="text-lg text-gray-900 bg-gray-50 p-3 rounded border"
            >
              {/* 【名前表示】: Redux storeから取得したユーザー名を表示 */}
              {user.name || 'ユーザー名未設定'}
            </p>
          </div>

          {/* 【ユーザーメール表示】: E2Eテストで検証される要素 */}
          <div className="mb-6">
            <div className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </div>
            <p
              data-testid="user-email"
              className="text-lg text-gray-900 bg-gray-50 p-3 rounded border"
            >
              {/* 【メール表示】: Redux storeから取得したメールアドレスを表示 */}
              {user.email || 'メールアドレス未設定'}
            </p>
          </div>

          {/* 【ログアウトボタン】: E2Eテストで検証される要素 */}
          <div className="flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
              onClick={() => {
                // 【ログアウト処理】: 実装は後のフェーズで追加予定
                console.log('ログアウト処理を実行します');
                // 【テスト対応】: 現段階では最小限の実装でテストを通す
                router.push('/');
              }}
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* 【開発情報】: 開発環境でのみ認証状態をデバッグ表示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
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
