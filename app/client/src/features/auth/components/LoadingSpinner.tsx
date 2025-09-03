/**
 * ローディングスピナーコンポーネント
 *
 * WCAG 2.1 AA準拠のARIA属性でアクセシビリティを確保。
 * サイズと色をカスタマイズ可能な再利用可能なコンポーネント。
 */

import type React from 'react';

/**
 * LoadingSpinnerコンポーネントのProps定義
 */
interface LoadingSpinnerProps {
  /** スクリーンリーダー向けの説明テキスト */
  'aria-label': string;

  /** スピナーのサイズ */
  size?: 'small' | 'medium' | 'large';

  /** スピナーの色 */
  color?: 'white' | 'blue' | 'gray';

  /** 追加スタイルクラス */
  className?: string;
}

/**
 * サイズ別のTailwindクラスマッピング
 */
const SIZE_CLASSES = {
  small: 'w-3 h-3',
  medium: 'w-4 h-4',
  large: 'w-6 h-6',
} as const;

/**
 * 色別のTailwindクラスマッピング
 */
const COLOR_CLASSES = {
  white: 'border-white border-t-transparent',
  blue: 'border-blue-600 border-t-transparent',
  gray: 'border-gray-400 border-t-transparent',
} as const;

/**
 * 汎用的なローディングスピナーコンポーネント
 *
 * @param aria-label - スクリーンリーダー向けの説明テキスト
 * @param size - スピナーのサイズ
 * @param color - スピナーの色
 * @param className - 追加スタイルクラス
 * @returns ローディングスピナー要素
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  'aria-label': ariaLabel,
  size = 'medium',
  color = 'white',
  className = '',
}) => {
  // サイズと色に対応するクラスを取得
  const sizeClass = SIZE_CLASSES[size];
  const colorClass = COLOR_CLASSES[color];

  // クラス名を結合して最終スタイルを構築
  const combinedClasses = [
    'border-2 rounded-full animate-spin',
    sizeClass,
    colorClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={combinedClasses}
      role="progressbar"
      aria-label={ariaLabel}
      aria-live="polite"
      data-loading-spinner="true"
    />
  );
};

/**
 * 認証処理専用のプリセットスピナー
 *
 * @param className - 追加スタイルクラス
 * @returns 認証用ローディングスピナー
 */
export const AuthLoadingSpinner: React.FC<{
  className?: string;
}> = ({ className }) => (
  <LoadingSpinner
    aria-label="認証処理中"
    size="medium"
    color="white"
    className={className}
  />
);

export type { LoadingSpinnerProps };
