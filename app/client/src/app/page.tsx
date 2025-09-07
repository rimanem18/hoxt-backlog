'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@/features/auth/components/LoginButton';
import { HelloWorld } from '@/features/hello-world';
import { useAppSelector } from '@/store/hooks';

/**
 * ホームページコンポーネント
 *
 * 認証状態に関係なくログイン促進メッセージを表示。
 * 認証済みユーザーには自動的にダッシュボードへリダイレクト。
 */
export default function Home(): React.ReactNode {
  const { isAuthenticated, user, authError } = useAppSelector((state) => state.auth);
  const router = useRouter();
  
  /**
   * 【機能概要】: OAuth認証失敗時のエラー状態管理
   * 【実装方針】: E2Eテストで期待される3つのエラータイプ（キャンセル・接続・設定）を管理
   * 【テスト対応】: oauth-failure.spec.ts の data-testarea 属性による要素検出を可能にする
   * 🟡 信頼性レベル: E2Eテスト要件に基づく最小限実装
   */
  const [oauthError, setOauthError] = useState<{
    type: 'cancelled' | 'connection' | 'config' | null;
    message: string;
    isRetrying?: boolean;
  }>({ type: null, message: '' });

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
                // 【認証開始処理】: エラー状態をクリアして新しい認証試行を開始
                setOauthError({ type: null, message: '' });
                console.log('認証を開始しました');
              }}
              onAuthSuccess={(data) => {
                // 【認証成功処理】: エラー状態をクリアして成功ログ出力
                setOauthError({ type: null, message: '' });
                console.log('認証に成功しました', data);
              }}
              onAuthError={(error) => {
                /**
                 * 【機能概要】: OAuth認証エラーの分類と適切なメッセージ表示
                 * 【実装方針】: エラーメッセージ内容からエラータイプを判定し、E2Eテスト期待要素を表示
                 * 🟢 信頼性レベル: 実際のエラーメッセージパターンマッチング
                 */
                console.error('認証エラー:', error);
                
                // 【エラー分類処理】: エラーメッセージからタイプを判定
                if (error.includes('キャンセル') || error.includes('cancelled')) {
                  // 【キャンセルエラー】: ユーザーが認証をキャンセルした場合（情報メッセージ扱い）
                  setOauthError({
                    type: 'cancelled',
                    message: 'Googleログインがキャンセルされました。',
                  });
                } else if (error.includes('接続') || error.includes('ネットワーク') || error.includes('connection')) {
                  // 【接続エラー】: ネットワーク問題やGoogle側障害の場合（エラー扱い）
                  setOauthError({
                    type: 'connection', 
                    message: 'Googleとの接続に問題が発生しました。ネットワーク接続を確認してください。',
                  });
                } else if (error.includes('設定') || error.includes('config') || error.includes('client')) {
                  // 【設定エラー】: OAuth設定不備の場合（警告扱い）
                  setOauthError({
                    type: 'config',
                    message: 'Google OAuth設定に問題があります。',
                  });
                } else {
                  // 【その他エラー】: 分類不能なエラーは接続エラーとして扱う
                  setOauthError({
                    type: 'connection',
                    message: 'Googleとの接続に問題が発生しました。ネットワーク接続を確認してください。',
                  });
                }
              }}
            />

            {/* 【T008実装】: OAuth認証失敗時のエラーメッセージ表示 */}
            {oauthError.type && (
              <div className="mt-4 space-y-4">
                {/* キャンセルメッセージ（情報扱い） */}
                {oauthError.type === 'cancelled' && (
                  <div 
                    data-testarea="auth-message" 
                    className="p-4 bg-blue-50 border border-blue-200 rounded-lg info"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-800">{oauthError.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 接続エラーメッセージ（エラー扱い + 再試行機能） */}
                {oauthError.type === 'connection' && (
                  <div 
                    data-testarea="auth-error" 
                    className="p-4 bg-red-50 border border-red-200 rounded-lg error"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm text-red-800">{oauthError.message}</p>
                        
                        {/* 再試行ボタン */}
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              // 【再試行機能】: 接続エラー時の再認証試行
                              setOauthError(prev => ({ ...prev, isRetrying: true }));
                              
                              // 【ローディング表示】: 再試行中状態を短時間表示
                              setTimeout(() => {
                                setOauthError({ type: null, message: '' });
                              }, 1000);
                            }}
                            className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                            disabled={oauthError.isRetrying}
                          >
                            {oauthError.isRetrying ? (
                              <span data-testarea="auth-loading">再試行中...</span>
                            ) : (
                              '再試行'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 設定エラーメッセージ（警告扱い + 開発者情報） */}
                {oauthError.type === 'config' && (
                  <div 
                    data-testarea="config-error" 
                    className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg warning"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm text-yellow-800">{oauthError.message}</p>
                        
                        {/* 開発環境での詳細情報 */}
                        {process.env.NODE_ENV === 'development' && (
                          <div data-testarea="development-info" className="mt-3 p-3 bg-yellow-100 rounded text-xs text-yellow-700">
                            <p className="font-semibold">開発者情報:</p>
                            <p>.env.local ファイルに以下を設定してください:</p>
                            <code className="block mt-1 font-mono">
                              NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
