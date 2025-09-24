'use client';
import { useQuery } from '@tanstack/react-query';

/**
 * Hello World メッセージを表示するコンポーネント
 */
export default function HelloWorld() {
  const { data, isPending, error } = useQuery({
    queryKey: ['helloWorld'],
    queryFn: () => {
      // 環境変数からAPI Base URLを取得、フォールバック値としてlocalhost:3001を使用
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const apiUrl = `${apiBaseUrl}/api/greet`;

      return fetch(apiUrl).then((res) => {
        return res.json();
      });
    },
  });

  return (
    <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          {isPending ? 'Loading...' : error ? 'Error!' : data?.message}
        </h1>
        <p className="text-lg opacity-90">Welcome to our Next.js application</p>
      </div>
    </div>
  );
}
