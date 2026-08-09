import ProjectDetailClient from './ProjectDetailClient';

/**
 * project詳細・編集画面（Server Component）
 *
 * 動的ルートセグメント（`[id]`）から projectId を取得し、
 * ProjectDetailClientに渡す。
 *
 * @param props - ルートパラメータを含むprops
 * @param props.params - 動的セグメント値を含むPromise
 * @returns project詳細・編集・そのprojectのtask一覧を表示するページ
 */
export default async function ProjectDetailPage(props: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactNode> {
  const params = await props.params;
  return <ProjectDetailClient projectId={params.id} />;
}
