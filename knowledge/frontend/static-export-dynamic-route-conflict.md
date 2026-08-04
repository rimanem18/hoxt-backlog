---
description: Next.jsのoutput:'export'（静的書き出し、Cloudflare Pages想定）構成のアプリに、初めて動的セグメント（例: /dashboard/xxx/[id]）を追加するときに参照する。`next build`が「Page "/xxx/[id]/page" is missing "generateStaticParams()"」で失敗する場合や、ビルド時に確定しないID（DBの主キー等）ごとの詳細ページを静的書き出しで実現したい場合に該当する。
---

## 見出し

`output: 'export'`構成のアプリで動的ルート`[id]`を追加すると、ビルド時にIDが確定しないためビルドが失敗する

## 背景

このプロジェクトのクライアント（Next.js）は`next.config.ts`で`output: 'export'`を採用しており、Cloudflare Pagesへの静的デプロイを前提としている。`output: 'export'`はビルド時に全ページのHTMLを生成し尽くす方式のため、サーバーサイドでの動的ルーティング（リクエストごとの`params`解決）ができない。

project詳細画面（`/dashboard/projects/[id]`）を実装する際、このアプリで初めて「DBのレコードIDをURLセグメントに持つ動的ルート」を追加することになった。

## 生じた問題

`docker compose exec client bun run build`が以下のエラーで失敗した。

```
Error: Page "/dashboard/projects/[id]" is missing "generateStaticParams()" so it cannot be used with "output: export" config.
```

`generateStaticParams()`を素朴に実装しようとしても、projectIdはユーザーが動的に作成するリソースのIDであり、ビルド時に全件を列挙することはできない（できたとしても、新規作成のたびに再ビルド・再デプロイが必要になり非現実的）。

### 検討した選択肢

1. **Cloudflare Workersへ移行しSSR化する**: 動的ルーティングが本来解決される正攻法だが、`next.config.ts`の`output: 'export'`廃止、`@cloudflare/next-on-pages`等のアダプタ導入、CI/CD・IaCのデプロイ設定変更まで波及する大きな変更になる。ユーザーに確認したところ、フロントエンドの一機能実装の中で着手する規模ではないと判断し、別タスクとして切り出す方針になった
2. **静的書き出し内で動的セグメントを疑似的に実現する（SPAフォールバック方式、今回採用）**

## 対処法

Cloudflare Pages（および類似の静的ホスティング）でよく使われる「プレースホルダー1件の静的生成＋ホスティング側のリライトルール」という手法を採用した。

### 1. `generateStaticParams()`はプレースホルダー1件のみ返す

動的ルートの`page.tsx`は**Server Component**にし、`generateStaticParams()`を1件だけexportする。実際のUI組み立ては別ファイルの**Client Component**に切り出す（`page.tsx`に`'use client'`を付けると`generateStaticParams`をexportできないため、ファイル分割が必須）。

```tsx
// app/dashboard/projects/[id]/page.tsx（Server Component）
import ProjectDetailClient from './ProjectDetailClient';

export function generateStaticParams(): { id: string }[] {
  return [{ id: 'placeholder' }];
}

export default function ProjectDetailPage(): React.ReactNode {
  return <ProjectDetailClient />;
}
```

これにより`next build`は`/dashboard/projects/placeholder/index.html`という1つの静的HTMLだけを生成する。

### 2. ホスティング側で実際のIDへのアクセスをこのプレースホルダーHTMLへ200リライトする

Cloudflare Pagesの場合、`public/_redirects`に以下を追加する（末尾のステータスコード`200`が重要。デフォルトの`301`/`302`にするとURLバーの実IDが失われる）。

```
/dashboard/projects/*  /dashboard/projects/placeholder/  200
```

Cloudflare Pagesは静的ファイルが実在するパス（一覧ページ等）を`_redirects`より優先して配信するため、`/dashboard/projects/`（一覧）はそのまま配信され、`/dashboard/projects/{実際のID}/`のように該当する静的ファイルが存在しないパスだけがこのルールにフォールバックする。

### 3. クライアント側は`useParams()`ではなく`usePathname()`から実IDを解決する

`useParams()`はNext.jsのルートマッチング実装や静的生成時のセグメント値の影響を受ける可能性があるため、確実性を優先し、ブラウザの実URL文字列を返す`usePathname()`から直接IDを取り出す方式にした。

```tsx
'use client';
import { usePathname } from 'next/navigation';

function useProjectIdFromPath(): string {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
}
```

これにより、CDNが`/dashboard/projects/{実ID}/`というURLのまま`placeholder`用の静的HTMLを200で返しても、ハイドレーション後にブラウザの実URLからIDを正しく取得できる。

## 学び

- `output: 'export'`のアプリに動的ルートを追加する場合、「ビルド時にIDを列挙できるか」を最初に確認する。列挙できない場合はSSR化（Workers移行等）かSPAフォールバック方式のどちらかを選ぶ判断が必要になる
- SPAフォールバック方式を選ぶ場合、`generateStaticParams`を持つファイルは`'use client'`にできない（Server Component必須）ため、ページを「静的パラメータ定義用のServer Component」と「実際のUIを持つClient Component」に分割する
- `_redirects`（や同種のホスティング設定）によるリライトは、ローカルの`next dev`では再現できない。`next dev`は`output: 'export'`の`generateStaticParams`制約を厳格に適用するため、実際のID付きURLに直接アクセスするとdevサーバー自体がエラーを出す。ローカルでの動作確認は、プレースホルダーのURLセグメント（例: `/dashboard/projects/placeholder`）に対して行う
- このような大きめのインフラ変更が必要になりそうな場面（SSR化の要否など）は、その場で判断せずユーザーに選択肢を提示して確認する
