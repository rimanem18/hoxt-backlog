import ProjectDetail from '@/features/project/components/ProjectDetail';
import TaskCreateForm from '@/features/todo/components/TaskCreateForm';
import TaskList from '@/features/todo/components/TaskList';
import { TaskServicesProvider } from '@/features/todo/lib/TaskServicesContext';
import ViewerInviteForm from '@/features/viewer-management/components/ViewerInviteForm';
import ViewerList from '@/features/viewer-management/components/ViewerList';
import { ViewerManagementServicesProvider } from '@/features/viewer-management/lib/ViewerManagementServicesContext';

/**
 * project詳細・編集画面（Server Component）
 *
 * 動的ルートセグメント（`[id]`）から projectId を取得し、
 * features/projectはfeatures/todo・features/viewer-managementに依存しないため
 * （一方向依存）、task一覧・task作成フォーム・viewer招待/一覧UIはこのページが
 * 各featureから直接組み立ててProjectDetailにスロットとして注入する
 *
 * @param props - ルートパラメータを含むprops
 * @param props.params - 動的セグメント値を含むPromise
 * @returns project詳細・そのprojectのtask一覧・task追加フォーム・viewer管理UIを表示する画面
 */
export default async function ProjectDetailPage(props: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactNode> {
  const params = await props.params;
  const projectId = params.id;

  return (
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
        viewerManagementSection={
          <ViewerManagementServicesProvider>
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h2 className="text-xl font-semibold mb-4">viewerを招待</h2>
                <ViewerInviteForm projectId={projectId} />
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h2 className="text-xl font-semibold mb-4">招待済みviewer</h2>
                <ViewerList projectId={projectId} />
              </div>
            </div>
          </ViewerManagementServicesProvider>
        }
      />
    </TaskServicesProvider>
  );
}
