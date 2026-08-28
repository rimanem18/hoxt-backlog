import ViewerTaskBoard from '@/features/viewer/components/ViewerTaskBoard';

/**
 * viewer横断閲覧画面（Server Component）
 *
 * 動的ルートセグメント（`[token]`）からviewerアクセストークンを取得し、
 * ViewerTaskBoardへ渡してtask一覧を表示する
 *
 * @param props - ルートパラメータを含むprops
 * @param props.params - 動的セグメント値を含むPromise
 * @returns viewerが閲覧できるproject・task一覧を表示する画面
 */
export default async function ViewerTaskBoardPage(props: {
  params: Promise<{ token: string }>;
}): Promise<React.ReactNode> {
  const params = await props.params;
  const token = params.token;

  return <ViewerTaskBoard token={token} />;
}
