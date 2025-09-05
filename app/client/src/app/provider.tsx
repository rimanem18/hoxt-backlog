'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/store';

type ProviderProps = {
  children: React.ReactNode;
};

/**
 * アプリケーション全体のProvider
 *
 * Redux状態管理とReact Queryデータフェッチングを統合し、
 * クライアントサイド状態管理を一元化する。
 */
export default function Provider({ children }: ProviderProps) {

  // 5分間データを新鮮と判定し、フォーカス時の自動リフェッチは無効化
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ReduxProvider>
  );
}
