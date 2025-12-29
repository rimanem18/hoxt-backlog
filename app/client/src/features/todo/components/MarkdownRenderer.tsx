import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

/**
 * MarkdownRendererコンポーネント
 *
 * Markdown形式のテキストをHTML表示する再利用可能なプレゼンテーションコンポーネント。
 * GFM（GitHub Flavored Markdown）対応、XSS対策済み。
 *
 * @example
 * ```tsx
 * <MarkdownRenderer content="## タイトル\n\nこれは段落です。" />
 * ```
 */

interface MarkdownRendererProps {
  /** Markdown形式のテキスト */
  content: string;
}

function MarkdownRenderer(props: MarkdownRendererProps): React.ReactNode {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      className="prose prose-sm max-w-none"
    >
      {props.content}
    </ReactMarkdown>
  );
}

export default React.memo(MarkdownRenderer);
