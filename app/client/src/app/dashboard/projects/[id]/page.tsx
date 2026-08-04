import ProjectDetailClient from './ProjectDetailClient';

/**
 * `output: 'export'`（静的書き出し）では動的セグメントごとに事前生成が必要だが、
 * projectIdはビルド時に確定しないため、プレースホルダー1件のみ静的生成する。
 * 実際のURLへのルーティングは`public/_redirects`のSPAフォールバックに委ねる。
 *
 * @returns 静的生成対象のプレースホルダーパラメータ一覧
 */
export function generateStaticParams(): { id: string }[] {
  return [{ id: 'placeholder' }];
}

/**
 * project詳細・編集画面（Server Component）
 *
 * @returns project詳細・編集・そのprojectのtask一覧を表示するページ
 */
export default function ProjectDetailPage(): React.ReactNode {
  return <ProjectDetailClient />;
}
