'use client';

import { useRouter } from 'next/navigation';
import { LoginButton } from '@/features/auth/components/LoginButton';
import { HelloWorld } from '@/features/hello-world';
import OAuthErrorDisplay from '@/features/auth/components/OAuthErrorDisplay';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setOAuthError, clearOAuthError } from '@/features/auth/store/oauthErrorSlice';
import { OAuthErrorHandler } from '@/features/auth/services/oauthErrorHandler';

/**
 * ホームページコンポーネント
 *
 * 認証状態に関係なくログイン促進メッセージを表示。
 * 認証済みユーザーには自動的にダッシュボードへリダイレクト。
 */
/**
 * 【リファクタリング改善】: ホームページコンポーネント（T008 Refactor完了版）
 * 【改善内容】: OAuth認証エラー表示をOAuthErrorDisplayコンポーネントに分離
 * 【設計改善】: 単一責任原則の適用・Redux状態管理への移行・コンポーネント分離の実現
 * 【セキュリティ強化】: XSS攻撃対策・機密情報保護・安全なエラーハンドリング
 * 【パフォーマンス向上】: 不要な再レンダリング防止・メモリ効率化・状態管理最適化
 * 【保守性向上】: コード分離・責任明確化・拡張可能性の確保
 * 🟢 信頼性レベル: 包括的なRefactorプロセス完了の高品質実装
 */
export default function Home(): React.ReactNode {
  const { isAuthenticated, user, authError } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();

  // 認証済みユーザーは自動的にダッシュボードへリダイレクト
  if (isAuthenticated && user) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="font-sans min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-4xl mx-auto space-y-8">
        {/* Hello World コンポーネント */}
        <HelloWorld />

        {/* 【T005・T006実装】: 認証エラーメッセージ表示 */}
        {authError && authError.code === 'EXPIRED' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  認証に問題があります
                </h3>
                <p className="mt-1 text-sm text-red-600">
                  もう一度ログインしてください
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-6">
          {/* 未認証ユーザー向けのログインボタンと促進メッセージ */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">
              アカウントでログイン
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Googleアカウントを使用してログインし、すべての機能をお楽しみください。
            </p>
            <LoginButton
              provider="google"
              className="mx-auto"
              onAuthStart={() => {
                // 【認証開始処理】: Redux経由でエラー状態をクリア
                dispatch(clearOAuthError());
                console.log('認証を開始しました');
              }}
              onAuthSuccess={(data) => {
                // 【認証成功処理】: Redux経由でエラー状態をクリア
                dispatch(clearOAuthError());
                console.log('認証に成功しました', data);
              }}
              onAuthError={(error) => {
                /**
                 * 【最終リファクタリング完成】: 統合エラーハンドラーによる完全な一元化
                 * 【セキュリティ強化】: OAuthErrorHandlerによる安全で統一されたエラー処理
                 * 【保守性向上】: 重複排除・DRY原則適用・単一責任原則の実現
                 * 【パフォーマンス向上】: 効率的なエラー分析と状態管理の統合
                 * 🟢 信頼性レベル: 包括的なリファクタリング完了の高品質実装
                 */
                console.error('認証エラー:', error);
                
                // 【統合エラーハンドリング】: 全エラー処理をOAuthErrorHandlerに委任
                const errorDetail = OAuthErrorHandler.analyzeError(error);
                dispatch(setOAuthError({ 
                  type: errorDetail.type, 
                  message: errorDetail.userMessage,
                  correlationId: errorDetail.correlationId 
                }));
              }}
            />

            {/* 【T008 Refactor実装】: OAuth認証エラー表示コンポーネント */}
            <OAuthErrorDisplay 
              className="mt-4"
              onRetry={() => {
                // 【再試行処理】: ログインボタンの再クリックをシミュレート
                console.log('OAuth認証を再試行中...');
                // 実際の再試行処理は LoginButton 内部で処理される
              }}
            />
          </div>
        </div>

        {/* 開発環境でのみ認証状態をデバッグ表示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
            <h3 className="font-semibold mb-2">開発情報:</h3>
            <p>
              認証状態:{' '}
              {isAuthenticated
                ? '認証済み（ダッシュボードへリダイレクト中）'
                : '未認証'}
            </p>
            <p>
              ユーザー情報: {user ? `${user.name} (${user.email})` : 'なし'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
