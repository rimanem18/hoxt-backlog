import type { User } from '@hoxt-backlog/shared-schemas/auth';
import Image from 'next/image';
import type React from 'react';
import { InitialAvatar } from '@/features/auth/components/InitialAvatar';

/**
 * UserProfileViewコンポーネントのProps型定義
 */
interface UserProfileViewProps {
  /** 表示対象のユーザー情報 */
  user: User;
  /** ボタン位置に表示する子要素（例：ログアウトボタン） */
  children?: React.ReactNode;
}

/**
 * ユーザープロフィール表示専用コンポーネント
 *
 * ユーザーのアバター画像、名前、メールアドレス、最終ログイン日時を表示します。
 * ログアウトボタン等の操作は、childrenで外部から注入されます。
 *
 * @param props - UserProfileViewPropsオブジェクト
 * @returns {React.ReactNode} ユーザープロフィール表示要素
 */
function UserProfileView(props: UserProfileViewProps): React.ReactNode {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* アバター画像表示 */}
      {props.user.avatarUrl ? (
        <Image
          src={props.user.avatarUrl}
          alt={`${props.user.name}のプロフィール画像`}
          width={64}
          height={64}
          className="rounded-full mx-auto mb-4"
          priority
        />
      ) : (
        <InitialAvatar
          name={props.user.name}
          size={64}
          className="rounded-full mx-auto mb-4"
        />
      )}

      {/* ユーザー名表示 */}
      <h2 className="text-xl font-bold text-center mb-2">{props.user.name}</h2>

      {/* メールアドレス表示 */}
      <p className="text-gray-600 text-center mb-4">{props.user.email}</p>

      {/* 最終ログイン日時情報の表示 */}
      {props.user.lastLoginAt && (
        <p
          className="text-gray-500 text-center text-sm mb-4"
          data-testarea="last-login-info"
        >
          最終ログイン:{' '}
          {new Date(props.user.lastLoginAt).toLocaleString('ja-JP')}
        </p>
      )}

      {/* ボタン位置に子要素を表示 */}
      {props.children}
    </div>
  );
}

export { UserProfileView };
