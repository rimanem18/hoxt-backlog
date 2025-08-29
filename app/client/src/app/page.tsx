import { GoogleLoginButton } from '@/features/google-auth/components/GoogleLoginButton';
import { HelloWorld } from '@/features/hello-world';

/**
 * ホームページコンポーネント
 * @returns {React.ReactNode} ホームページのレイアウト
 */
export default function Home(): React.ReactNode {
  return (
    <div className="font-sans min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-4xl mx-auto">
        {/* Hello World コンポーネントを中央に配置 */}
        <HelloWorld />
        <GoogleLoginButton />
      </main>
    </div>
  );
}
