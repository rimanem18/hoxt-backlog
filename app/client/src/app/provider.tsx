'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/store';

type ProviderProps = {
  children: React.ReactNode;
};

/**
 * 【アプリケーションProvider】: 全体の状態管理とデータ取得を統括
 * 【統合内容】: Redux状態管理 + React Query データフェッチング
 * 【設計方針】: クライアントサイド状態管理の一元化
 * 🟢 信頼性レベル: 標準的なProvider構成パターン
 */
export default function Provider({ children }: ProviderProps) {
  // 【React Query設定】: サーバーデータのキャッシュ管理
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 【ステイル時間】: 5分間はデータを新鮮と判定
        staleTime: 5 * 60 * 1000,
        // 【リフェッチ制御】: フォーカス時の自動リフェッチを無効化
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    // 【Redux Provider】: アプリケーション全体にRedux Storeを提供
    <ReduxProvider store={store}>
      {/* 【React Query Provider】: サーバーデータのキャッシュ機能を提供 */}
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ReduxProvider>
  );
}
