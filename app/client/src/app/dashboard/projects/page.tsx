import ProjectCreateForm from '@/features/project/components/ProjectCreateForm';
import ProjectList from '@/features/project/components/ProjectList';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';

/**
 * project一覧・作成画面（認証済みユーザー専用）
 *
 * @returns project一覧と作成フォームを表示するページ
 */
export default function ProjectsPage(): React.ReactNode {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">プロジェクト</h1>
        </div>

        <ProjectServicesProvider>
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
        </ProjectServicesProvider>
      </div>
    </div>
  );
}
