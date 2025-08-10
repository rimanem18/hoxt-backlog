import { HelloWorld } from '@/features/hello-world';

/**
 * ホームページコンポーネント
 * @returns {JSX.Element} ホームページのレイアウト
 */
export default function Home(): JSX.Element {
  return (
    <div className="font-sans min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-4xl mx-auto">
        {/* Hello World コンポーネントを中央に配置 */}
        <HelloWorld />
      </main>
    </div>
  );
}
