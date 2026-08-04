'use client';

import ProjectDetail from '@/features/project/components/ProjectDetail';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';
import TaskCreateForm from '@/features/todo/components/TaskCreateForm';
import TaskList from '@/features/todo/components/TaskList';
import { TaskServicesProvider } from '@/features/todo/lib/TaskServicesContext';

interface ProjectDetailClientProps {
  projectId: string;
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
export default function ProjectDetailClient(
  props: ProjectDetailClientProps,
): React.ReactNode {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProjectServicesProvider>
          <TaskServicesProvider>
            <ProjectDetail
              projectId={props.projectId}
              taskCreateSection={
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-xl font-semibold mb-4">新しいタスク</h2>
                  <TaskCreateForm fixedProjectId={props.projectId} />
                </div>
              }
              taskListSection={
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 sm:p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">タスク一覧</h2>
                  </div>
                  <TaskList projectId={props.projectId} />
                </div>
              }
            />
          </TaskServicesProvider>
        </ProjectServicesProvider>
      </div>
    </div>
  );
}
