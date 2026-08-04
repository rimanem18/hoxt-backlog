import { DashboardDebugInfo } from '@/features/dashboard/components/DashboardDebugInfo';
import { DashboardGreeting } from '@/features/dashboard/components/DashboardGreeting';
import { DashboardShell } from '@/features/dashboard/components/DashboardShell';
import { DashboardServicesProvider } from '@/features/dashboard/lib/DashboardServicesContext';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';
import TaskCreateForm from '@/features/todo/components/TaskCreateForm';
import TaskFilter from '@/features/todo/components/TaskFilter';
import TaskSort from '@/features/todo/components/TaskSort';
import { TaskServicesProvider } from '@/features/todo/lib/TaskServicesContext';
import { DevOnly } from '@/shared/components/DevOnly';

/**
 * 認証済みユーザー専用のダッシュボードページ（Server Component）
 * AuthGuardによって認証が保証されているため、認証チェックは不要
 *
 * 静的な見出しはこのファイルでサーバーレンダリングし、
 * JWT期限切れ検出・ネットワークエラーハンドリング・タスク編集連携などの
 * 動的な処理はDashboardShell（Client Component）に委譲する
 *
 * @returns 認証済みユーザー向けダッシュボード画面
 */
export default function DashboardPage(): React.ReactNode {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ダッシュボードタイトル */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
            <DashboardGreeting />
          </div>
          <a
            href="/dashboard/projects"
            className="self-start shrink-0 px-4 py-2 text-sm sm:text-base text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors whitespace-nowrap"
          >
            プロジェクト一覧
          </a>
        </div>

        <DashboardServicesProvider>
          <TaskServicesProvider>
            <ProjectServicesProvider>
              <DashboardShell
                createTaskSection={
                  <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                    <h2 className="text-xl font-semibold mb-4">新しいタスク</h2>
                    <TaskCreateForm />
                  </div>
                }
                filterSortSection={
                  <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                    <h2 className="text-xl font-semibold mb-4">
                      絞り込み・並び替え
                    </h2>
                    <div className="space-y-4">
                      <TaskFilter />
                      <TaskSort />
                    </div>
                  </div>
                }
                taskListHeading={
                  <div className="p-4 sm:p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">タスク一覧</h2>
                  </div>
                }
                devDebugSlot={
                  <DevOnly>
                    <DashboardDebugInfo />
                  </DevOnly>
                }
              />
            </ProjectServicesProvider>
          </TaskServicesProvider>
        </DashboardServicesProvider>
      </div>
    </div>
  );
}
