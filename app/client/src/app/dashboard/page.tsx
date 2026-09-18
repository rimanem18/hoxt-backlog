import { DashboardDebugInfo } from '@/features/dashboard/components/DashboardDebugInfo';
import { DashboardGreeting } from '@/features/dashboard/components/DashboardGreeting';
import { DashboardSessionMonitor } from '@/features/dashboard/components/DashboardSessionMonitor';
import { ProjectsShell } from '@/features/dashboard/components/ProjectsShell';
import { DashboardServicesProvider } from '@/features/dashboard/lib/DashboardServicesContext';
import ProjectCreateForm from '@/features/project/components/ProjectCreateForm';
import ProjectList from '@/features/project/components/ProjectList';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';
import { DevOnly } from '@/shared/components/DevOnly';

/**
 * 認証済みユーザー専用のダッシュボードページ（Server Component）
 * AuthGuardによって認証が保証されているため、認証チェックは不要
 *
 * 静的な見出しはこのファイルでサーバーレンダリングし、
 * JWT期限切れ検出・ネットワークエラーハンドリングなどの
 * 動的な処理はDashboardSessionMonitor（Client Component）に委譲する
 *
 * @returns 認証済みユーザー向けダッシュボード画面
 */
export default function DashboardPage(): React.ReactNode {
  return (
    <DashboardServicesProvider>
      <DashboardSessionMonitor />

      <ProjectServicesProvider>
        <ProjectsShell>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
            <DashboardGreeting />
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">新しいプロジェクト</h2>
            <ProjectCreateForm />
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">プロジェクト一覧</h2>
            </div>
            <ProjectList />
          </div>

          <DevOnly>
            <DashboardDebugInfo />
          </DevOnly>
        </ProjectsShell>
      </ProjectServicesProvider>
    </DashboardServicesProvider>
  );
}
