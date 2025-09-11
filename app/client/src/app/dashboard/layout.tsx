import { AuthGuard } from '@/features/auth/components/AuthGuard';

/**
 * ダッシュボードレイアウト
 * 認証が必要なページ群を保護する
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
