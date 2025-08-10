'use client';
import { useQuery } from '@tanstack/react-query';

/**
 * Hello World メッセージを表示するコンポーネント
 */
export default function HelloWorld() {
  const { data, isPending, error } = useQuery({
    queryKey: ['helloWorld'],
    queryFn: () =>
      fetch('http://localhost:3001/api/greet').then((res) => {
        return res.json();
      }),
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
