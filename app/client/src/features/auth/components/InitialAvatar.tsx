/**
 * ユーザー名の先頭文字を使い、インラインSVGでアバターを描画するコンポーネント。
 * avatarUrlが存在しないユーザーのフォールバック表示に使用する。
 *
 * @example
 * ```tsx
 * <InitialAvatar name="山田太郎" size={64} className="rounded-full" />
 * ```
 */

'use client';
import type React from 'react';
import { useMemo } from 'react';
import { extractInitial, nameToAvatarColor } from '@/shared/utils/avatar';

interface InitialAvatarProps {
  /** アバターに表示する名前 */
  name: string;
  /** SVGの幅・高さ（省略時は64） */
  size?: number;
  /** ルート要素に付与するclassName */
  className?: string;
}

export function InitialAvatar(props: InitialAvatarProps): React.ReactNode {
  const size = props.size ?? 64;

  const backgroundColor = useMemo(
    () => nameToAvatarColor(props.name),
    [props.name],
  );
  const initial = useMemo(() => extractInitial(props.name), [props.name]);

  return (
    <svg
      role="img"
      aria-label={`${props.name}のプロフィール画像`}
      width={size}
      height={size}
      className={props.className}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={size} height={size} fill={backgroundColor} />
      <text
        x={size / 2}
        y={size / 2}
        fill="#fff"
        fontSize={size * 0.4}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {initial}
      </text>
    </svg>
  );
}
