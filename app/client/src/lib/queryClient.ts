import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClientインスタンスを作成する関数
 *
 * テストやコンポーネントごとに独立したインスタンスを生成することで、
 * キャッシュの共有を防ぎ、テスト間の干渉を回避します。
 *
 * @returns 設定済みのQueryClientインスタンス
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 30秒間はデータを新鮮と判定（タスクデータは頻繁に変更されない）
        staleTime: 30 * 1000,
        // 5分間未使用のデータは自動削除（メモリ効率とUXのバランス）
        gcTime: 5 * 60 * 1000,
        // ネットワークエラー時に1回だけリトライ
        retry: 1,
        // フォーカス時の自動リフェッチを無効化（明示的な操作のみ）
        refetchOnWindowFocus: false,
      },
      mutations: {
        // ミューテーションはリトライしない（冪等性が保証されない操作）
        retry: 0,
      },
    },
  });
}
