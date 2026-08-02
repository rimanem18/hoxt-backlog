'use client';

import { usePathname } from 'next/navigation';
import ProjectDetail from '@/features/project/components/ProjectDetail';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';
import TaskCreateForm from '@/features/todo/components/TaskCreateForm';
import TaskList from '@/features/todo/components/TaskList';
import { TaskServicesProvider } from '@/features/todo/lib/TaskServicesContext';

/**
 * ブラウザの実URLパスから末尾セグメント（projectId）を取得する
 *
 * `output: 'export'`（静的書き出し）ではビルド時にIDが確定しないため、
 * `public/_redirects`のCloudflare Pages向けSPAフォールバックにより
 * どのprojectIdのURLでもプレースホルダーの静的ページが200で配信される。
 * `useParams()`はビルド時に静的生成されたセグメント値に影響されうるため、
 * 常にハイドレーション後の実URLを返す`usePathname()`から直接解決する
 */
function useProjectIdFromPath(): string {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
}

/**
 * project詳細・編集画面（Client Component）
 *
 * features/projectはfeatures/todoに依存しないため（一方向依存）、
 * task一覧・task作成フォームはこのコンポーネントがfeatures/todoから直接組み立てて
 * ProjectDetailにスロットとして注入する
 *
 * @returns project詳細・そのprojectのtask一覧・task追加フォームを表示する画面
 */
export default function ProjectDetailClient(): React.ReactNode {
  const projectId = useProjectIdFromPath();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProjectServicesProvider>
          <TaskServicesProvider>
            <ProjectDetail
              projectId={projectId}
              taskCreateSection={
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-xl font-semibold mb-4">新しいタスク</h2>
                  <TaskCreateForm fixedProjectId={projectId} />
                </div>
              }
              taskListSection={
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 sm:p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">タスク一覧</h2>
                  </div>
                  <TaskList projectId={projectId} />
                </div>
              }
            />
          </TaskServicesProvider>
        </ProjectServicesProvider>
      </div>
    </div>
  );
}
