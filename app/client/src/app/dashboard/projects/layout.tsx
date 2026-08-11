import { ProjectsShell } from '@/features/dashboard/components/ProjectsShell';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';

interface ProjectsLayoutProps {
  children: React.ReactNode;
}

/**
 * project配下画面の共通レイアウト（Server Component）
 *
 * @returns ProjectServicesProvider・ProjectsShellでchildrenをラップした画面
 */
export default function ProjectsLayout(
  props: ProjectsLayoutProps,
): React.ReactNode {
  return (
    <ProjectServicesProvider>
      <ProjectsShell>{props.children}</ProjectsShell>
    </ProjectServicesProvider>
  );
}
