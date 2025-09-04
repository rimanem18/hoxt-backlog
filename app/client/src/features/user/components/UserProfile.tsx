/**
 * ユーザープロフィール情報を表示するReactコンポーネント
 *
 * @returns {React.ReactNode} プロフィール表示要素
 */

'use client';
import Image from 'next/image';
import type React from 'react';
import { memo, useCallback, useState } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';

/**
 * ISO日時文字列を日本語形式に変換する
 *
 * @param {string} isoString - ISO 8601形式の日時文字列
 * @returns {string} 日本語ローカライズされた日時文字列
 */
const formatDateTimeToJapanese = (isoString: string): string => {
  const date = new Date(isoString);

  const formatted = date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo', // JSTでの時刻表示を確保
  });

  // テストの期待値に合わせて全角コロンを半角に変換
  return formatted.replace('：', ':');
};

/**
 * ユーザー名のサニタイズと省略表示を行う
 *
 * @param {string} name - 元のユーザー名
 * @returns {string} サニタイズ・省略処理済みのユーザー名
 */
const truncateUserName = (name: string): string => {
  // XSS対策：HTMLタグや危険な文字列を無害化
  const sanitizedName = name
    .replace(/<[^>]*>/g, '') // HTMLタグを除去
    .replace(/javascript:/gi, '') // javascript:スキームを除去
    .replace(/on\w+=/gi, '') // onclick等のイベント属性を除去
    .trim();

  if (!sanitizedName) {
    return 'Anonymous User';
  }

  if (sanitizedName.length <= 50) {
    return sanitizedName;
  }

  // 50文字を超える場合は47文字+"..."で省略
  return `${sanitizedName.substring(0, 47)}...`;
};

export const UserProfile: React.FC = memo(() => {
  const { user, loading, error, refetch } = useUserProfile();

  // 画像読み込み失敗時のフォールバック用
  const [avatarSrc, setAvatarSrc] = useState('/default-avatar.png');

  const handleImageError = useCallback(() => {
    setAvatarSrc('/default-avatar.png');
  }, []);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  if (loading) {
    return (
      <div
        className="responsive-container p-4 bg-white rounded-lg shadow"
        data-testid="user-profile-container"
        role="status"
        aria-label="読み込み中"
      >
        <div className="space-y-4">
          <div
            className="responsive-avatar w-16 h-16 bg-gray-200 rounded-full mx-auto animate-pulse"
            data-testid="avatar-skeleton"
          />
          <div
            className="h-6 bg-gray-200 rounded w-32 mx-auto animate-pulse"
            data-testid="name-skeleton"
          />
          <div
            className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse"
            data-testid="email-skeleton"
          />
          <div
            className="h-4 bg-gray-200 rounded w-40 mx-auto animate-pulse"
            data-testid="lastlogin-skeleton"
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="responsive-container p-4 bg-white rounded-lg shadow"
        data-testid="user-profile-container"
      >
        <div role="alert" className="text-center">
          <p className="text-red-600 mb-4">{error.message}</p>

          <button
            type="button"
            onClick={handleRefetch}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            再試行
          </button>

          {error.message.includes('認証が必要') && (
            <div className="mt-4">
              <a
                href="/login"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                ログインページへ
              </a>
            </div>
          )}

          {error.message.includes('インターネット接続') && (
            <div
              className="mt-4 p-2 bg-gray-100 rounded text-gray-600"
              data-testid="offline-indicator"
            >
              オフライン状態です
            </div>
          )}
        </div>
      </div>
    );
  }

  if (user) {
    const displayName = truncateUserName(user.name);
    const showFullNameOnHover = user.name.length > 50;

    // ユーザーデータ取得後にアバター画像URLを設定
    if (avatarSrc === '/default-avatar.png' && user.avatarUrl) {
      setAvatarSrc(user.avatarUrl);
    }

    const lastLoginDisplay = user.lastLoginAt
      ? formatDateTimeToJapanese(user.lastLoginAt)
      : '初回ログインです';

    return (
      <div
        className="responsive-container p-4 bg-white rounded-lg shadow"
        data-testid="user-profile-container"
      >
        <Image
          src={avatarSrc}
          alt="プロフィール画像"
          width={64}
          height={64}
          className="responsive-avatar rounded-full mx-auto mb-4"
          priority
          onError={handleImageError}
        />

        <h2
          className="text-xl font-bold text-center mb-2"
          title={showFullNameOnHover ? user.name : undefined}
        >
          {displayName}
        </h2>

        <p className="text-gray-600 text-center mb-2">{user.email}</p>

        <p className="text-gray-500 text-center text-sm mb-4">
          最終ログイン: {lastLoginDisplay}
        </p>
      </div>
    );
  }

  // 予期しない状態のフォールバック
  return (
    <div
      className="responsive-container p-4 bg-white rounded-lg shadow"
      data-testid="user-profile-container"
    >
      <p className="text-center text-gray-500">
        プロフィール情報を読み込めませんでした
      </p>
    </div>
  );
});
