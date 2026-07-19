import { HomeAuthShell } from '@/features/auth/components/HomeAuthShell';
import { HomeShellServicesProvider } from '@/features/auth/components/HomeShellServicesContext';
import { LoginPageHeader } from '@/features/auth/components/LoginPageHeader';

/**
 * ホームページコンポーネント（Server Component）
 *
 * 認証状態に依存する処理は HomeAuthShell（Client Component）に委譲する。
 */
export default function Home(): React.ReactNode {
  return (
    <HomeShellServicesProvider>
      <HomeAuthShell>
        <LoginPageHeader />
      </HomeAuthShell>
    </HomeShellServicesProvider>
  );
}
