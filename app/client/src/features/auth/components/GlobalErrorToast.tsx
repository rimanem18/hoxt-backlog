/**
 * 【機能概要】: グローバルエラーメッセージ表示用のトーストコンポーネント
 * 【実装方針】: T007テストを通すために最小限のエラー表示機能を実装
 * 【テスト対応】: 「ネットワーク接続を確認してください」メッセージ表示テストケースを満たすための実装
 * 🟡 信頼性レベル: 一般的なWebアプリケーションのエラー表示パターンからの妥当な推測
 */

'use client';

import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import { type RootState } from '@/store';
import { clearError } from '@/features/auth/store/errorSlice';

/**
 * グローバルエラー表示コンポーネント
 * 【責任範囲】: エラーメッセージの視覚的表示のみに特化
 */
export function GlobalErrorToast() {
  const dispatch = useDispatch();
  // 【T007対応】: 再試行ボタンのローディング状態管理
  const [isRetrying, setIsRetrying] = useState(false);
  
  // 【状態取得】: Redux storeからエラー状態を取得
  const { isVisible, message, type } = useSelector((state: RootState) => state.error);

  // 【エラー非表示処理】: ユーザーがエラーメッセージを確認後に非表示にする
  const handleClose = () => {
    // 【状態更新】: エラー状態をクリアしてUI非表示
    dispatch(clearError());
    console.log('T007: Error toast closed by user');
  };

  // 【表示制御】: エラーが発生していない場合は何も表示しない
  if (!isVisible || !message) {
    return null;
  }

  return (
    <>
      {/* 【T007対応】: テストで期待される「ネットワーク接続を確認してください」メッセージ表示 */}
      <div
        className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md"
        role="alert"
        aria-live="polite"
      >
        {/* 【メッセージ表示】: Redux stateから取得したエラーメッセージを表示 */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 【エラーアイコン】: 視覚的にエラーであることを示す */}
            <div className="flex items-center mb-2">
              <div className="w-5 h-5 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-2">
                <span className="text-sm font-bold">!</span>
              </div>
              <span className="font-semibold">
                {type === 'network' ? 'ネットワークエラー' : 'エラー'}
              </span>
            </div>
            
            {/* 【エラーメッセージ】: 実際のエラー内容をユーザーに表示 */}
            <p className="text-sm">{message}</p>
          </div>
          
          {/* 【閉じるボタン】: ユーザーがエラーを確認後に非表示にできる */}
          <button
            onClick={handleClose}
            className="ml-4 text-white hover:text-gray-200 transition-colors"
            aria-label="エラーメッセージを閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 【T007対応】: テストで期待される再試行ボタン */}
      {type === 'network' && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <button
            onClick={async () => {
              // 【T007実装】: ローディング状態管理付きの再試行機能
              setIsRetrying(true);
              console.log('T007: Network retry initiated with loading state');
              
              // 【最小実装】: ページリロードによる再試行機能
              // 【将来改善】: より高度な再試行ロジックはリファクタ段階で追加予定
              setTimeout(() => {
                window.location.reload();
              }, 500); // 短い遅延でローディング状態を表示
            }}
            disabled={isRetrying}
            className="flex items-center space-x-2 hover:bg-blue-600 transition-colors px-2 py-1 rounded disabled:opacity-50"
          >
            {isRetrying ? (
              // 【T007対応】: 再試行中のローディングアイコン
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            ) : (
              // 【通常時】: 再試行アイコン
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>{isRetrying ? '再試行中...' : '再試行'}</span>
          </button>

          {/* 【T007対応】: テストで期待される再試行中ローディングインジケータ */}
          {isRetrying && (
            <div 
              data-testarea="retry-loading" 
              className="mt-2 flex items-center justify-center text-sm"
            >
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span>接続を再試行しています...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 【T007対応】: テストで期待されるオフライン状態インジケータ */}
      {type === 'network' && (
        <div 
          className="fixed bottom-4 left-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50"
          data-testarea="network-status"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm">オフライン</span>
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalErrorToast;